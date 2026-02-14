from datetime import datetime
from typing import Optional
from typing_extensions import Annotated
from pydantic import BaseModel, Field, BeforeValidator
from bson import ObjectId

PyObjectId = Annotated[str, BeforeValidator(str)]


class ActivityLogInDB(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    task_id: PyObjectId
    telegram_account_id: PyObjectId
    user_id: PyObjectId
    task_name: str = ""
    action_type: str = ""
    target_title: str = ""
    status: str = "sent"  # "sent" | "failed" | "skipped"
    reason: Optional[str] = None
    scheduled_time: Optional[datetime] = None
    actual_sent_time: Optional[datetime] = None
    retry_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class ActivityLog(ActivityLogInDB):
    pass
