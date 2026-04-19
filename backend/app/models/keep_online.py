from datetime import datetime
from typing import Optional
from typing_extensions import Annotated
from pydantic import BaseModel, Field, BeforeValidator
from bson import ObjectId

PyObjectId = Annotated[str, BeforeValidator(str)]


class KeepOnlineUpdate(BaseModel):
    enabled: bool = False
    mode: str = "always"  # "always" | "time_range"
    start_time: Optional[str] = None  # "08:00" HH:MM 24hr
    end_time: Optional[str] = None    # "23:00" HH:MM 24hr
    timezone: Optional[str] = None


class KeepOnlineInDB(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str
    telegram_account_id: str
    enabled: bool = False
    mode: str = "always"  # "always" | "time_range"
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    timezone: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class KeepOnline(KeepOnlineInDB):
    pass
