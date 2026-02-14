from datetime import datetime
from typing import Optional, List
from bson import ObjectId

from app.database import get_db
from app.models.activity_log import ActivityLog


class ActivityLogService:
    @property
    def collection(self):
        db = get_db()
        return db["activity_logs"]

    async def create_indexes(self):
        await self.collection.create_index("task_id")
        await self.collection.create_index("user_id")
        await self.collection.create_index([("task_id", 1), ("scheduled_time", -1)])

    async def log(
        self,
        task_id: str,
        telegram_account_id: str,
        user_id: str,
        task_name: str,
        action_type: str,
        target_title: str,
        status: str,
        reason: Optional[str] = None,
        scheduled_time: Optional[datetime] = None,
        actual_sent_time: Optional[datetime] = None,
        retry_count: int = 0,
    ) -> ActivityLog:
        data = {
            "task_id": task_id,
            "telegram_account_id": telegram_account_id,
            "user_id": user_id,
            "task_name": task_name,
            "action_type": action_type,
            "target_title": target_title,
            "status": status,
            "reason": reason,
            "scheduled_time": scheduled_time,
            "actual_sent_time": actual_sent_time,
            "retry_count": retry_count,
            "created_at": datetime.utcnow(),
        }
        result = await self.collection.insert_one(data)
        doc = await self.collection.find_one({"_id": result.inserted_id})
        return ActivityLog(**doc)

    async def get_by_task(
        self, task_id: str, limit: int = 50, skip: int = 0
    ) -> List[ActivityLog]:
        cursor = (
            self.collection.find({"task_id": task_id})
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )
        logs = []
        async for doc in cursor:
            logs.append(ActivityLog(**doc))
        return logs

    async def get_by_user(
        self,
        user_id: str,
        task_id: Optional[str] = None,
        account_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        skip: int = 0,
    ) -> List[ActivityLog]:
        query = {"user_id": user_id}
        if task_id:
            query["task_id"] = task_id
        if account_id:
            query["telegram_account_id"] = account_id
        if status:
            query["status"] = status

        cursor = (
            self.collection.find(query)
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )
        logs = []
        async for doc in cursor:
            logs.append(ActivityLog(**doc))
        return logs

    async def was_already_executed(self, task_id: str, scheduled_time: datetime) -> bool:
        """Check if a task was already executed for a specific time slot (duplicate prevention)."""
        doc = await self.collection.find_one({
            "task_id": task_id,
            "scheduled_time": scheduled_time,
            "status": "sent",
        })
        return doc is not None


activity_log_service = ActivityLogService()
