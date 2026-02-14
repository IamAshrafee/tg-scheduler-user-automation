from datetime import datetime
from typing import Optional
from typing_extensions import Annotated
from pydantic import BaseModel, Field, BeforeValidator
from bson import ObjectId

PyObjectId = Annotated[str, BeforeValidator(str)]


class TelegramAccountBase(BaseModel):
    phone_number: str
    telegram_user_id: Optional[int] = None
    first_name: Optional[str] = None
    username: Optional[str] = None


class TelegramAccountInDB(TelegramAccountBase):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: PyObjectId
    session_file: str = ""
    status: str = "active"  # "active" | "disconnected" | "locked"
    is_locked_by_admin: bool = False
    active_tasks_count: int = 0
    last_activity: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class TelegramAccount(TelegramAccountInDB):
    pass


# --- Request / Response schemas ---

class SendCodeRequest(BaseModel):
    phone_number: str = Field(..., description="Phone number with country code, e.g. +8801XXXXXXXXX")


class VerifyCodeRequest(BaseModel):
    phone_number: str
    code: str
    password: Optional[str] = Field(None, description="2FA password if enabled")


class TelegramAccountResponse(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    phone_number: str
    telegram_user_id: Optional[int] = None
    first_name: Optional[str] = None
    username: Optional[str] = None
    status: str = "active"
    is_locked_by_admin: bool = False
    active_tasks_count: int = 0
    last_activity: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
