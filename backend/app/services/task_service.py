from datetime import datetime, timedelta
from typing import Optional, List
from bson import ObjectId
from pymongo import ReturnDocument
import pytz

from app.database import get_db
from app.models.task import Task, TaskCreate, TaskUpdate


def calculate_next_execution(schedule: dict, timezone_str: str) -> Optional[datetime]:
    """Calculate the next execution time based on schedule config."""
    tz = pytz.timezone(timezone_str or "Asia/Dhaka")
    now = datetime.now(tz)

    # Parse time
    parts = schedule.get("time", "09:00").split(":")
    hour, minute = int(parts[0]), int(parts[1])
    schedule_type = schedule.get("type", "daily")

    if schedule_type == "daily":
        next_run = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if next_run <= now:
            next_run += timedelta(days=1)
        return next_run.astimezone(pytz.utc).replace(tzinfo=None)

    elif schedule_type == "weekly":
        days = schedule.get("days_of_week", [0, 1, 2, 3, 4])
        if not days:
            return None
        # Find next matching day
        for offset in range(8):
            candidate = now + timedelta(days=offset)
            candidate = candidate.replace(hour=hour, minute=minute, second=0, microsecond=0)
            if candidate > now and candidate.weekday() in days:
                return candidate.astimezone(pytz.utc).replace(tzinfo=None)
        return None

    elif schedule_type == "monthly":
        days_of_month = schedule.get("days_of_month", [1])
        if not days_of_month:
            return None
        # Find next matching day of month
        for offset in range(62):  # look ahead ~2 months
            candidate = now + timedelta(days=offset)
            candidate = candidate.replace(hour=hour, minute=minute, second=0, microsecond=0)
            if candidate > now and candidate.day in days_of_month:
                return candidate.astimezone(pytz.utc).replace(tzinfo=None)
        return None

    elif schedule_type in ("custom_days", "specific_dates"):
        dates = schedule.get("specific_dates", [])
        if not dates:
            return None
        future_dates = []
        for d in dates:
            try:
                dt = tz.localize(datetime.strptime(d, "%Y-%m-%d").replace(hour=hour, minute=minute))
                if dt > now:
                    future_dates.append(dt)
            except ValueError:
                continue
        if future_dates:
            next_dt = min(future_dates)
            return next_dt.astimezone(pytz.utc).replace(tzinfo=None)
        return None

    return None


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
        """Update task after execution — set last_execution and recalculate next_execution."""
        try:
            oid = ObjectId(task_id)
        except Exception:
            return
        task = await self.get_by_id(task_id)
        if not task:
            return

        schedule_dict = task.schedule.model_dump()
        next_exec = calculate_next_execution(schedule_dict, schedule_dict.get("timezone", timezone))

        update = {
            "last_execution": datetime.utcnow(),
            "next_execution": next_exec,
            "updated_at": datetime.utcnow(),
        }
        if not success:
            update["status"] = "error"

        await self.collection.update_one({"_id": oid}, {"$set": update})

    async def get_enabled_tasks(self) -> List[Task]:
        """Get all enabled tasks for scheduler loading."""
        cursor = self.collection.find({"is_enabled": True})
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
