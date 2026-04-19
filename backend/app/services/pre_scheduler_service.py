"""
Pre-Scheduler Service
---------------------
Runs daily at 12:01 AM (per timezone group). For every task with
`use_native_schedule=True`, creates Telegram scheduled messages
for all of today's send times using Telegram's built-in schedule feature.
"""

import asyncio
from datetime import datetime, timedelta
from typing import List

import pytz

from app.models.task import Task
from app.services.activity_log_service import activity_log_service


class PreSchedulerService:
    """
    At 12:01 AM daily, pre-schedule all native-schedule tasks for the day
    by sending messages with Telegram's `schedule` parameter.
    """

    async def run_daily_preschedule(self, timezone_str: str = None):
        """
        Main entry point called by the scheduler engine's daily cron job.
        Finds all enabled tasks with use_native_schedule=True and creates
        Telegram scheduled messages for each time slot today.
        """
        from app.services.task_service import task_service
        from app.services.action_executor import execute_task

        tasks = await task_service.get_native_schedule_tasks()

        if not tasks:
            print("[PreScheduler] No native-schedule tasks found.")
            return

        print(f"[PreScheduler] Processing {len(tasks)} native-schedule task(s)...")

        for task in tasks:
            try:
                await self._preschedule_task(task, task_service, execute_task)
            except Exception as e:
                print(f"[PreScheduler] Error processing task {task.id} ({task.name}): {e}")

    async def preschedule_single_task(self, task: Task):
        """Pre-schedule a single task immediately for today if it qualifies."""
        if getattr(task, 'use_native_schedule', False):
            from app.services.task_service import task_service
            from app.services.action_executor import execute_task
            try:
                await self._preschedule_task(task, task_service, execute_task)
            except Exception as e:
                print(f"[PreScheduler] Error in immediate pre-scheduling for task {task.id}: {e}")
    async def _preschedule_task(self, task: Task, task_service, execute_task_fn):
        """Pre-schedule a single task for today."""
        schedule = task.schedule
        tz_str = schedule.timezone or "Asia/Dhaka"

        try:
            tz = pytz.timezone(tz_str)
        except Exception:
            tz = pytz.timezone("Asia/Dhaka")

        now = datetime.now(tz)
        today = now.date()

        # --- Check if today should be skipped ---
        if await self._should_skip_today(task, tz, now):
            print(f"[PreScheduler] Skipping task '{task.name}' — off day or skip condition met.")
            return

        # --- Check if the Telegram account is active ---
        from app.services.telegram_account_service import telegram_account_service
        account = await telegram_account_service.get_by_id(str(task.telegram_account_id))
        if not account or account.status != "active":
            print(f"[PreScheduler] Skipping task '{task.name}' — account not active.")
            return

        # --- Determine today's time slots ---
        time_list = self._get_today_times(task, today, tz, now)
        if not time_list:
            print(f"[PreScheduler] No time slots for task '{task.name}' today.")
            return

        # --- Schedule each time slot ---
        success_count = 0
        for schedule_dt in time_list:
            try:
                result = await execute_task_fn(task, schedule_time=schedule_dt)
                if result["status"] == "sent":
                    success_count += 1
                    await activity_log_service.log(
                        task_id=str(task.id),
                        telegram_account_id=str(task.telegram_account_id),
                        user_id=str(task.user_id),
                        task_name=task.name,
                        action_type=task.action_type,
                        target_title=task.target.chat_title,
                        status="sent",
                        reason=f"Pre-scheduled for {schedule_dt.strftime('%I:%M %p')}",
                        scheduled_time=schedule_dt,
                    )
                else:
                    fail_reason = result.get('reason', 'Unknown')
                    print(f"[PreScheduler] FAILED slot {schedule_dt.strftime('%I:%M %p')} for '{task.name}': {fail_reason}")
                    await activity_log_service.log(
                        task_id=str(task.id),
                        telegram_account_id=str(task.telegram_account_id),
                        user_id=str(task.user_id),
                        task_name=task.name,
                        action_type=task.action_type,
                        target_title=task.target.chat_title,
                        status="failed",
                        reason=f"Pre-schedule failed for {schedule_dt.strftime('%I:%M %p')}: {result.get('reason', 'Unknown')}",
                        scheduled_time=schedule_dt,
                    )
            except Exception as e:
                await activity_log_service.log(
                    task_id=str(task.id),
                    telegram_account_id=str(task.telegram_account_id),
                    user_id=str(task.user_id),
                    task_name=task.name,
                    action_type=task.action_type,
                    target_title=task.target.chat_title,
                    status="failed",
                    reason=f"Pre-schedule error: {str(e)}",
                    scheduled_time=schedule_dt,
                )

        print(f"[PreScheduler] Task '{task.name}': {success_count}/{len(time_list)} slots pre-scheduled.")

    def _get_today_times(self, task: Task, today, tz, now) -> List[datetime]:
        """
        Calculate all datetime objects for today's send times.
        Only includes times that are still in the future.
        """
        schedule = task.schedule
        time_list = schedule.times if schedule.times and len(schedule.times) > 0 else [schedule.time]

        result = []
        for t_str in time_list:
            try:
                parts = t_str.split(":")
                h, m = int(parts[0]), int(parts[1])
                dt = tz.localize(datetime(today.year, today.month, today.day, h, m, 0))

                # Only schedule future times (with 2-min buffer for the 12:01 AM run)
                if dt > now + timedelta(minutes=1):
                    result.append(dt)
            except (ValueError, IndexError):
                continue

        return result

    async def _should_skip_today(self, task: Task, tz, now) -> bool:
        """Check all skip conditions for today."""
        today_weekday = now.weekday()
        today_str = now.strftime("%Y-%m-%d")

        # Check schedule type eligibility
        schedule = task.schedule

        # For weekly tasks, check if today is a scheduled day
        if schedule.type == "weekly":
            days_of_week = schedule.days_of_week or [0, 1, 2, 3, 4]
            if today_weekday not in days_of_week:
                return True

        # For monthly tasks, check if today is a scheduled day
        if schedule.type == "monthly":
            days_of_month = schedule.days_of_month or [1]
            if now.day not in days_of_month:
                return True

        # For specific_dates/custom_days, check if today is listed
        if schedule.type in ("custom_days", "specific_dates"):
            specific_dates = schedule.specific_dates or []
            if today_str not in specific_dates:
                return True

        # Check start_date / end_date
        if schedule.start_date:
            try:
                start = datetime.strptime(schedule.start_date, "%Y-%m-%d").date()
                if now.date() < start:
                    return True
            except ValueError:
                pass
        if schedule.end_date:
            try:
                end = datetime.strptime(schedule.end_date, "%Y-%m-%d").date()
                if now.date() > end:
                    return True
            except ValueError:
                pass

        # Check max executions
        if task.max_executions and task.execution_count >= task.max_executions:
            return True

        # Check monthly-only expiry
        if task.skip_days.this_month_only and task.skip_days.active_month and task.skip_days.active_year:
            if now.month != task.skip_days.active_month or now.year != task.skip_days.active_year:
                return True

        # Check per-task skip days
        if today_weekday in task.skip_days.weekly_holidays:
            return True
        if today_str in task.skip_days.specific_dates:
            return True
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
pre_scheduler_service = PreSchedulerService()
