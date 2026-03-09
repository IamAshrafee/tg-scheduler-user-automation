import asyncio
from datetime import datetime
from typing import Optional
import pytz

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger

from app.models.task import Task
from app.services.activity_log_service import activity_log_service


class SchedulerEngine:
    """
    Background scheduler using APScheduler.
    Loads enabled tasks, creates cron/date jobs, and executes them.
    Handles off-day checks, duplicate prevention, and dynamic job management.
    """

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self._started = False

    async def start(self):
        """Start the scheduler and load all enabled tasks."""
        if self._started:
            return

        from app.services.task_service import task_service
        tasks = await task_service.get_enabled_tasks()

        for task in tasks:
            await self.add_job(task)

        self.scheduler.start()
        self._started = True
        print(f"Scheduler started with {len(tasks)} task(s).")

    def stop(self):
        """Shut down the scheduler."""
        if self._started:
            self.scheduler.shutdown(wait=False)
            self._started = False
            print("Scheduler stopped.")

    async def add_job(self, task: Task):
        """Add or replace a job for a task."""
        job_id = f"task_{task.id}"

        # Remove existing job if any
        self.remove_job(str(task.id))

        if not task.is_enabled:
            return

        schedule = task.schedule
        tz_str = schedule.timezone or "Asia/Dhaka"

        try:
            tz = pytz.timezone(tz_str)
        except Exception:
            tz = pytz.timezone("Asia/Dhaka")

        parts = schedule.time.split(":")
        hour, minute = int(parts[0]), int(parts[1])

        trigger = None

        if schedule.type == "daily":
            trigger = CronTrigger(hour=hour, minute=minute, timezone=tz)

        elif schedule.type == "weekly":
            days = schedule.days_of_week or [0, 1, 2, 3, 4]
            # APScheduler uses: mon=0, ..., sun=6 — same as Python weekday()
            day_str = ",".join(str(d) for d in days)
            trigger = CronTrigger(day_of_week=day_str, hour=hour, minute=minute, timezone=tz)

        elif schedule.type == "monthly":
            days = schedule.days_of_month or [1]
            day_str = ",".join(str(d) for d in days)
            trigger = CronTrigger(day=day_str, hour=hour, minute=minute, timezone=tz)

        elif schedule.type in ("custom_days", "specific_dates"):
            # Schedule individual DateTrigger jobs for each future date
            dates = schedule.specific_dates or []
            now = datetime.now(tz)
            for i, date_str in enumerate(dates):
                try:
                    dt = tz.localize(
                        datetime.strptime(date_str, "%Y-%m-%d").replace(hour=hour, minute=minute)
                    )
                    if dt > now:
                        self.scheduler.add_job(
                            self._execute_wrapper,
                            trigger=DateTrigger(run_date=dt),
                            id=f"{job_id}_date_{i}",
                            args=[str(task.id)],
                            replace_existing=True,
                            misfire_grace_time=300,
                        )
                except ValueError:
                    continue
            return  # Don't add a single cron job

        if trigger:
            self.scheduler.add_job(
                self._execute_wrapper,
                trigger=trigger,
                id=job_id,
                args=[str(task.id)],
                replace_existing=True,
                misfire_grace_time=300,
            )

    async def update_job(self, task: Task):
        """Update an existing job (remove + re-add)."""
        await self.add_job(task)

    def remove_job(self, task_id: str):
        """Remove a job by task ID."""
        job_id = f"task_{task_id}"
        try:
            self.scheduler.remove_job(job_id)
        except Exception:
            pass
        # Also remove date-specific jobs
        for i in range(100):
            try:
                self.scheduler.remove_job(f"{job_id}_date_{i}")
            except Exception:
                break

    async def _execute_wrapper(self, task_id: str):
        """
        Wrapper called by APScheduler. Performs pre-checks,
        then delegates to the action executor.
        """
        from app.services.task_service import task_service
        from app.services.action_executor import execute_task

        task = await task_service.get_by_id(task_id)
        if not task:
            return

        # --- Pre-check 1: Is the task still enabled? ---
        if not task.is_enabled:
            return

        # --- Pre-check 1b: Monthly-only expiry check ---
        if task.skip_days.this_month_only and task.skip_days.active_month and task.skip_days.active_year:
            tz_str = task.schedule.timezone or "Asia/Dhaka"
            try:
                tz = pytz.timezone(tz_str)
            except Exception:
                tz = pytz.timezone("Asia/Dhaka")
            now = datetime.now(tz)
            if now.month != task.skip_days.active_month or now.year != task.skip_days.active_year:
                # Month has changed — auto-deactivate
                await task_service.expire_monthly_task(str(task.id))
                self.remove_job(str(task.id))
                await activity_log_service.log(
                    task_id=str(task.id),
                    telegram_account_id=str(task.telegram_account_id),
                    user_id=str(task.user_id),
                    task_name=task.name,
                    action_type=task.action_type,
                    target_title=task.target.chat_title,
                    status="skipped",
                    reason="Monthly-only task expired (month ended)",
                    scheduled_time=task.next_execution,
                )
                return

        # --- Pre-check 2: Is today an off day? ---
        if await self._is_off_day(task):
            await activity_log_service.log(
                task_id=str(task.id),
                telegram_account_id=str(task.telegram_account_id),
                user_id=str(task.user_id),
                task_name=task.name,
                action_type=task.action_type,
                target_title=task.target.chat_title,
                status="skipped",
                reason="Off day (global or task-specific)",
                scheduled_time=task.next_execution,
            )
            # Still update next_execution
            await task_service.update_after_execution(
                str(task.id), success=True, timezone=task.schedule.timezone or "Asia/Dhaka"
            )
            return

        # --- Pre-check 3: Is the Telegram account active? ---
        from app.services.telegram_account_service import telegram_account_service
        account = await telegram_account_service.get_by_id(str(task.telegram_account_id))
        if not account or account.status != "active":
            await activity_log_service.log(
                task_id=str(task.id),
                telegram_account_id=str(task.telegram_account_id),
                user_id=str(task.user_id),
                task_name=task.name,
                action_type=task.action_type,
                target_title=task.target.chat_title,
                status="skipped",
                reason="Telegram account not active",
                scheduled_time=task.next_execution,
            )
            return

        # --- Pre-check 4: Duplicate prevention ---
        if task.next_execution:
            already = await activity_log_service.was_already_executed(str(task.id), task.next_execution)
            if already:
                return

        # --- Execute ---
        await execute_task(task)

    async def _is_off_day(self, task: Task) -> bool:
        """Check global off days + per-task skip days."""
        tz_str = task.schedule.timezone or "Asia/Dhaka"
        try:
            tz = pytz.timezone(tz_str)
        except Exception:
            tz = pytz.timezone("Asia/Dhaka")

        now = datetime.now(tz)
        today_weekday = now.weekday()
        today_str = now.strftime("%Y-%m-%d")

        # Check per-task skip days
        if today_weekday in task.skip_days.weekly_holidays:
            return True
        if today_str in task.skip_days.specific_dates:
            return True

        # Check monthly skip days (only-this-month feature)
        if task.skip_days.this_month_only and now.day in task.skip_days.monthly_skip_days:
            return True

        # Check global off days
        from app.database import get_db
        db = get_db()
        off_days_doc = await db["off_days"].find_one({"user_id": str(task.user_id)})
        if off_days_doc:
            if today_weekday in off_days_doc.get("weekly_holidays", []):
                return True
            if today_str in off_days_doc.get("specific_dates", []):
                return True

        return False


# Singleton
scheduler_engine = SchedulerEngine()
