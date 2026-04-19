from datetime import datetime, timedelta
from typing import Optional, List
from bson import ObjectId
from pymongo import ReturnDocument
import pytz

from app.database import get_db
from app.models.task import Task, TaskCreate, TaskUpdate


def _apply_date_bounds(dt: Optional[datetime], schedule: dict, tz) -> Optional[datetime]:
    """Clamp a candidate datetime to start_date/end_date bounds. Returns None if out of range."""
    if dt is None:
        return None
    start_date = schedule.get("start_date")
    end_date = schedule.get("end_date")
    if start_date:
        start_dt = tz.localize(datetime.strptime(start_date, "%Y-%m-%d").replace(hour=0, minute=0))
        if dt < start_dt:
            # Push to start_date at the scheduled time
            parts = schedule.get("time", "09:00").split(":")
            dt = start_dt.replace(hour=int(parts[0]), minute=int(parts[1]), second=0, microsecond=0)
    if end_date:
        end_dt = tz.localize(datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59))
        if dt > end_dt:
            return None
    return dt


def _get_all_times(schedule: dict) -> list:
    """Get all time slots — uses 'times' if set, otherwise falls back to 'time'."""
    times = schedule.get("times")
    if times and len(times) > 0:
        return sorted(times)
    return [schedule.get("time", "09:00")]


def _find_next_for_times(now, time_list, tz, offset_days=0):
    """Find the earliest future run from a list of times on now + offset_days."""
    candidates = []
    for t in time_list:
        parts = t.split(":")
        h, m = int(parts[0]), int(parts[1])
        candidate = (now + timedelta(days=offset_days)).replace(hour=h, minute=m, second=0, microsecond=0)
        if candidate > now:
            candidates.append(candidate)
    return min(candidates) if candidates else None


def calculate_next_execution(schedule: dict, timezone_str: str, last_execution: datetime = None) -> Optional[datetime]:
    """Calculate the next execution time based on schedule config."""
    tz = pytz.timezone(timezone_str or "Asia/Dhaka")
    now = datetime.now(tz)

    schedule_type = schedule.get("type", "daily")
    time_list = _get_all_times(schedule)
    parts = schedule.get("time", "09:00").split(":")
    hour, minute = int(parts[0]), int(parts[1])

    result = None

    if schedule_type == "interval":
        interval_h = schedule.get("interval_hours", 0) or 0
        interval_m = schedule.get("interval_minutes", 0) or 0
        total_minutes = interval_h * 60 + interval_m
        if total_minutes <= 0:
            total_minutes = 60  # fallback: 1 hour
        if last_execution:
            # Convert last_execution (UTC naive) to tz-aware
            last_aware = pytz.utc.localize(last_execution).astimezone(tz)
            next_run = last_aware + timedelta(minutes=total_minutes)
        else:
            # First run: start now + interval (or at start_date)
            next_run = now + timedelta(minutes=total_minutes)
        if next_run <= now:
            # Catch up: skip to next future slot
            elapsed = (now - next_run).total_seconds() / 60
            skips = int(elapsed / total_minutes) + 1
            next_run = next_run + timedelta(minutes=total_minutes * skips)
        result = next_run

    elif schedule_type == "daily":
        # Try all time slots today, then tomorrow
        result = _find_next_for_times(now, time_list, tz, 0)
        if not result:
            result = _find_next_for_times(now, time_list, tz, 1)

    elif schedule_type == "weekly":
        days = schedule.get("days_of_week", [0, 1, 2, 3, 4])
        n_weeks = schedule.get("repeat_every_n_weeks", 1) or 1
        if not days:
            return None
        # Look ahead enough days for bi-weekly/tri-weekly
        for offset in range(8 * n_weeks):
            candidate_day = now + timedelta(days=offset)
            if candidate_day.weekday() in days:
                # Check week interval: is this the right week?
                if n_weeks > 1 and last_execution:
                    last_aware = pytz.utc.localize(last_execution).astimezone(tz)
                    weeks_diff = (candidate_day.date() - last_aware.date()).days // 7
                    if weeks_diff > 0 and weeks_diff % n_weeks != 0:
                        continue
                found = _find_next_for_times(now, time_list, tz, offset)
                if found:
                    result = found
                    break

    elif schedule_type == "monthly":
        days_of_month = schedule.get("days_of_month", [1])
        if not days_of_month:
            return None
        for offset in range(62):
            candidate = now + timedelta(days=offset)
            if candidate.day in days_of_month:
                found = _find_next_for_times(now, time_list, tz, offset)
                if found:
                    result = found
                    break

    elif schedule_type in ("custom_days", "specific_dates"):
        dates = schedule.get("specific_dates", [])
        if not dates:
            return None
        future_candidates = []
        for t in time_list:
            t_parts = t.split(":")
            t_h, t_m = int(t_parts[0]), int(t_parts[1])
            for d in dates:
                try:
                    dt = tz.localize(datetime.strptime(d, "%Y-%m-%d").replace(hour=t_h, minute=t_m))
                    if dt > now:
                        future_candidates.append(dt)
                except ValueError:
                    continue
        if future_candidates:
            result = min(future_candidates)
        else:
            return None

    if result is None:
        return None

    # Apply date bounds
    result = _apply_date_bounds(result, schedule, tz)
    if result is None:
        return None

    return result.astimezone(pytz.utc).replace(tzinfo=None)


class TaskService:
    @property
    def collection(self):
        db = get_db()
        return db["tasks"]

    async def create_indexes(self):
        await self.collection.create_index("user_id")
        await self.collection.create_index("telegram_account_id")
        await self.collection.create_index([("is_enabled", 1), ("next_execution", 1)])

    async def get_by_id(self, task_id: str) -> Optional[Task]:
        try:
            oid = ObjectId(task_id)
        except Exception:
            return None
        doc = await self.collection.find_one({"_id": oid})
        return Task(**doc) if doc else None

    async def get_by_user(
        self,
        user_id: str,
        account_id: Optional[str] = None,
        status: Optional[str] = None,
        action_type: Optional[str] = None,
    ) -> List[Task]:
        query = {"user_id": user_id}
        if account_id:
            query["telegram_account_id"] = account_id
        if status:
            query["status"] = status
        if action_type:
            query["action_type"] = action_type

        cursor = self.collection.find(query).sort("created_at", -1)
        tasks = []
        async for doc in cursor:
            tasks.append(Task(**doc))
        return tasks

    async def count_by_user(self, user_id: str) -> int:
        return await self.collection.count_documents({"user_id": user_id})

    async def create(self, user_id: str, task_in: TaskCreate, timezone: str) -> Task:
        data = task_in.model_dump()
        data["user_id"] = user_id
        
        # Calculate next execution
        schedule_tz = data["schedule"].get("timezone") or timezone
        data["schedule"]["timezone"] = schedule_tz
        data["next_execution"] = calculate_next_execution(data["schedule"], schedule_tz)
        data["is_enabled"] = True
        data["status"] = "active"
        data["created_at"] = datetime.utcnow()
        data["updated_at"] = datetime.utcnow()

        # Auto-fill active_month/active_year for monthly-only tasks
        if data.get("skip_days", {}).get("this_month_only"):
            tz = pytz.timezone(schedule_tz)
            now = datetime.now(tz)
            data["skip_days"]["active_month"] = now.month
            data["skip_days"]["active_year"] = now.year

        result = await self.collection.insert_one(data)
        return await self.get_by_id(str(result.inserted_id))

    async def update(self, task_id: str, task_update: TaskUpdate, timezone: str) -> Optional[Task]:
        try:
            oid = ObjectId(task_id)
        except Exception:
            return None

        update_data = task_update.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()

        # Recalculate next_execution if schedule changed
        if "schedule" in update_data:
            schedule_tz = update_data["schedule"].get("timezone") or timezone
            update_data["schedule"]["timezone"] = schedule_tz
            update_data["next_execution"] = calculate_next_execution(update_data["schedule"], schedule_tz)

        doc = await self.collection.find_one_and_update(
            {"_id": oid},
            {"$set": update_data},
            return_document=ReturnDocument.AFTER,
        )
        return Task(**doc) if doc else None

    async def delete(self, task_id: str) -> bool:
        try:
            oid = ObjectId(task_id)
        except Exception:
            return False
        result = await self.collection.delete_one({"_id": oid})
        return result.deleted_count > 0

    async def toggle(self, task_id: str) -> Optional[Task]:
        try:
            oid = ObjectId(task_id)
        except Exception:
            return None
        task = await self.get_by_id(task_id)
        if not task:
            return None

        new_enabled = not task.is_enabled
        new_status = "active" if new_enabled else "paused"
        
        # Recalculate next_execution when re-enabling
        next_exec = None
        update_fields = {}
        if new_enabled:
            schedule_dict = task.schedule.model_dump()
            next_exec = calculate_next_execution(schedule_dict, schedule_dict.get("timezone", "Asia/Dhaka"))

            # Refresh active_month/year for monthly-only tasks on re-enable
            if task.skip_days.this_month_only:
                tz_str = schedule_dict.get("timezone", "Asia/Dhaka")
                tz = pytz.timezone(tz_str)
                now = datetime.now(tz)
                update_fields["skip_days.active_month"] = now.month
                update_fields["skip_days.active_year"] = now.year
                update_fields["skip_days.monthly_skip_days"] = []  # Clear for fresh month

        update_fields.update({
            "is_enabled": new_enabled,
            "status": new_status,
            "next_execution": next_exec,
            "updated_at": datetime.utcnow(),
        })

        doc = await self.collection.find_one_and_update(
            {"_id": oid},
            {"$set": update_fields},
            return_document=ReturnDocument.AFTER,
        )
        return Task(**doc) if doc else None

    async def update_after_execution(self, task_id: str, success: bool, timezone: str):
        """Update task after execution — set last_execution, increment count, recalculate next_execution."""
        try:
            oid = ObjectId(task_id)
        except Exception:
            return
        task = await self.get_by_id(task_id)
        if not task:
            return

        now_utc = datetime.utcnow()
        new_count = task.execution_count + 1

        schedule_dict = task.schedule.model_dump()
        next_exec = calculate_next_execution(
            schedule_dict,
            schedule_dict.get("timezone", timezone),
            last_execution=now_utc,
        )

        update = {
            "last_execution": now_utc,
            "next_execution": next_exec,
            "execution_count": new_count,
            "updated_at": now_utc,
        }

        if not success:
            update["status"] = "error"

        # Auto-complete if max executions reached
        if task.max_executions and new_count >= task.max_executions:
            update["is_enabled"] = False
            update["status"] = "completed"
            update["next_execution"] = None

        # Auto-deactivate if past end_date
        if next_exec is None and task.schedule.end_date:
            update["is_enabled"] = False
            update["status"] = "completed"

        await self.collection.update_one({"_id": oid}, {"$set": update})

    async def get_enabled_tasks(self) -> List[Task]:
        """Get all enabled tasks for scheduler loading (excludes native-schedule tasks)."""
        cursor = self.collection.find({
            "is_enabled": True,
            "$or": [
                {"use_native_schedule": {"$ne": True}},
                {"use_native_schedule": {"$exists": False}},
            ]
        })
        tasks = []
        async for doc in cursor:
            tasks.append(Task(**doc))
        return tasks

    async def get_native_schedule_tasks(self) -> List[Task]:
        """Get all enabled tasks that use Telegram's native scheduling."""
        cursor = self.collection.find({
            "is_enabled": True,
            "use_native_schedule": True,
        })
        tasks = []
        async for doc in cursor:
            tasks.append(Task(**doc))
        return tasks

    async def expire_monthly_task(self, task_id: str):
        """Auto-deactivate a monthly-only task when its month has ended."""
        try:
            oid = ObjectId(task_id)
        except Exception:
            return
        await self.collection.update_one(
            {"_id": oid},
            {"$set": {
                "is_enabled": False,
                "status": "expired",
                "next_execution": None,
                "updated_at": datetime.utcnow(),
            }}
        )


task_service = TaskService()
