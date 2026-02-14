from typing import Optional, List
from datetime import datetime
from bson import ObjectId
from pymongo import ReturnDocument

from app.database import get_db
from app.models.telegram_account import TelegramAccount


class TelegramAccountService:
    @property
    def collection(self):
        db = get_db()
        return db["telegram_accounts"]

    async def create_indexes(self):
        await self.collection.create_index(
            [("user_id", 1), ("phone_number", 1)], unique=True
        )
        await self.collection.create_index("user_id")

    async def get_by_id(self, account_id: str) -> Optional[TelegramAccount]:
        try:
            oid = ObjectId(account_id)
        except Exception:
            return None
        doc = await self.collection.find_one({"_id": oid})
        return TelegramAccount(**doc) if doc else None

    async def get_by_user_id(self, user_id: str) -> List[TelegramAccount]:
        cursor = self.collection.find({"user_id": user_id})
        accounts = []
        async for doc in cursor:
            accounts.append(TelegramAccount(**doc))
        return accounts

    async def get_by_phone(self, user_id: str, phone_number: str) -> Optional[TelegramAccount]:
        doc = await self.collection.find_one(
            {"user_id": user_id, "phone_number": phone_number}
        )
        return TelegramAccount(**doc) if doc else None

    async def count_by_user(self, user_id: str) -> int:
        return await self.collection.count_documents({"user_id": user_id})

    async def create(self, data: dict) -> TelegramAccount:
        data["created_at"] = datetime.utcnow()
        result = await self.collection.insert_one(data)
        return await self.get_by_id(str(result.inserted_id))

    async def update_status(self, account_id: str, status: str) -> Optional[TelegramAccount]:
        try:
            oid = ObjectId(account_id)
        except Exception:
            return None
        doc = await self.collection.find_one_and_update(
            {"_id": oid},
            {"$set": {"status": status, "last_activity": datetime.utcnow()}},
            return_document=ReturnDocument.AFTER,
        )
        return TelegramAccount(**doc) if doc else None

    async def delete(self, account_id: str) -> bool:
        try:
            oid = ObjectId(account_id)
        except Exception:
            return False
        result = await self.collection.delete_one({"_id": oid})
        return result.deleted_count > 0


telegram_account_service = TelegramAccountService()
