from typing import Optional, List
from datetime import datetime
from bson import ObjectId
from pymongo import ReturnDocument
from pymongo.collection import Collection

from app.database import get_db
from app.models.user import UserCreate, UserUpdate, UserInDB, User
from app.utils.security import get_password_hash

class UserService:
    @property
    def collection(self) -> Collection:
        db = get_db()
        return db["users"]

    async def create_indexes(self):
        await self.collection.create_index("email", unique=True)

    async def get_by_id(self, user_id: str) -> Optional[User]:
        try:
            oid = ObjectId(user_id)
        except:
            return None
            
        user_doc = await self.collection.find_one({"_id": oid})
        if user_doc:
            return User(**user_doc)
        return None

    async def get_by_email(self, email: str) -> Optional[User]:
        user_doc = await self.collection.find_one({"email": email})
        if user_doc:
            return User(**user_doc)
        return None

    async def create(self, user_in: UserCreate) -> User:
        user_data = user_in.model_dump()
        password = user_data.pop("password")
        user_data["password_hash"] = get_password_hash(password)
        
        # Check if user already exists
        if await self.get_by_email(user_in.email):
            # Caller handles duplicate error
            return None

        db_user = UserInDB(**user_data)
        result = await self.collection.insert_one(db_user.model_dump(by_alias=True, exclude={"id"}))
        
        return await self.get_by_id(str(result.inserted_id))

    async def update(self, user_id: str, user_in: UserUpdate) -> Optional[User]:
        try:
            oid = ObjectId(user_id)
        except:
            return None
            
        update_data = user_in.model_dump(exclude_unset=True)
        if "password" in update_data:
            password = update_data.pop("password")
            update_data["password_hash"] = get_password_hash(password)
            
        if not update_data:
            return await self.get_by_id(user_id)

        update_data["updated_at"] = datetime.utcnow() # Need to import datetime

        user_doc = await self.collection.find_one_and_update(
            {"_id": oid},
            {"$set": update_data},
            return_document=ReturnDocument.AFTER
        )
        
        if user_doc:
            return User(**user_doc)
        return None

user_service = UserService()
