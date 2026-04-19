"""
Keep Online Service
-------------------
Background service that periodically sends UpdateStatusRequest(offline=False)
to Telegram for all accounts with keep_online enabled.
Runs every ~4 minutes to maintain "online" presence.
"""

import asyncio
from datetime import datetime
from typing import Optional

import pytz

from app.database import get_db
from app.models.keep_online import KeepOnline, KeepOnlineUpdate


class KeepOnlineService:
    """Manages the keep-online feature for Telegram accounts."""

    def __init__(self):
        self._running = False
        self._task: Optional[asyncio.Task] = None

    @property
    def collection(self):
        db = get_db()
        return db["keep_online"]

    # ─── CRUD ───

    async def get_by_account(self, account_id: str, user_id: str) -> Optional[KeepOnline]:
        doc = await self.collection.find_one({
            "telegram_account_id": account_id,
            "user_id": user_id,
        })
        return KeepOnline(**doc) if doc else None

    async def upsert(self, account_id: str, user_id: str, update: KeepOnlineUpdate) -> KeepOnline:
        data = update.model_dump()
        data["telegram_account_id"] = account_id
        data["user_id"] = user_id
        data["updated_at"] = datetime.utcnow()

        existing = await self.collection.find_one({
            "telegram_account_id": account_id,
            "user_id": user_id,
        })

        if existing:
            await self.collection.update_one(
                {"_id": existing["_id"]},
                {"$set": data}
            )
            doc = await self.collection.find_one({"_id": existing["_id"]})
        else:
            data["created_at"] = datetime.utcnow()
            result = await self.collection.insert_one(data)
            doc = await self.collection.find_one({"_id": result.inserted_id})

        return KeepOnline(**doc)

    async def get_all_enabled(self) -> list:
        cursor = self.collection.find({"enabled": True})
        results = []
        async for doc in cursor:
            results.append(KeepOnline(**doc))
        return results

    # ─── Background Loop ───

    async def start_background_loop(self):
        """Start the background loop that pings online status every 4 minutes."""
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._loop())
        print("[KeepOnline] Background loop started.")

    async def stop_background_loop(self):
        """Stop the background loop."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        print("[KeepOnline] Background loop stopped.")

    async def _loop(self):
        """Main loop: ping online status every 4 minutes."""
        while self._running:
            try:
                await self._ping_all()
            except Exception as e:
                print(f"[KeepOnline] Error in ping loop: {e}")
            await asyncio.sleep(240)  # 4 minutes

    async def _ping_all(self):
        """Send UpdateStatusRequest for all enabled accounts."""
        from app.services.telegram_client_manager import telegram_client_manager

        enabled = await self.get_all_enabled()
        if not enabled:
            return

        for entry in enabled:
            try:
                # Check time range if applicable
                if entry.mode == "time_range" and not self._is_within_time_range(entry):
                    continue

                client = await telegram_client_manager.get_client(entry.telegram_account_id)
                if not client:
                    continue

                from telethon.tl import functions
                await client(functions.account.UpdateStatusRequest(offline=False))

            except Exception as e:
                print(f"[KeepOnline] Failed for account {entry.telegram_account_id}: {e}")

    def _is_within_time_range(self, entry: KeepOnline) -> bool:
        """Check if current time is within the configured time range."""
        if not entry.start_time or not entry.end_time:
            return True  # No range set, treat as always

        tz_str = entry.timezone or "Asia/Dhaka"
        try:
            tz = pytz.timezone(tz_str)
        except Exception:
            tz = pytz.timezone("Asia/Dhaka")

        now = datetime.now(tz)
        current_minutes = now.hour * 60 + now.minute

        start_parts = entry.start_time.split(":")
        start_minutes = int(start_parts[0]) * 60 + int(start_parts[1])

        end_parts = entry.end_time.split(":")
        end_minutes = int(end_parts[0]) * 60 + int(end_parts[1])

        # Handle overnight ranges (e.g., 22:00 - 06:00)
        if start_minutes <= end_minutes:
            return start_minutes <= current_minutes <= end_minutes
        else:
            return current_minutes >= start_minutes or current_minutes <= end_minutes


# Singleton
keep_online_service = KeepOnlineService()
