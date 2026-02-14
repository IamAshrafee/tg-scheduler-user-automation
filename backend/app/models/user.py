from datetime import datetime
from typing import Optional
from typing_extensions import Annotated
from pydantic import BaseModel, Field, EmailStr, BeforeValidator
from bson import ObjectId

# Helper for Pydantic v2 ObjectId compatibility
PyObjectId = Annotated[str, BeforeValidator(str)]

class UserBase(BaseModel):
    email: EmailStr
    timezone: str = "Asia/Dhaka"  # Default timezone as per requirements

class UserCreate(UserBase):
    password: str = Field(min_length=8)

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    timezone: Optional[str] = None
    telegram_account_limit: Optional[int] = None
    task_limit: Optional[int] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserInDB(UserBase):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    password_hash: str
    role: str = "user"
    is_active: bool = True
    telegram_account_limit: int = 3
    task_limit: int = 20
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class User(UserInDB):
    pass
