from datetime import datetime
from typing import Optional, List
from typing_extensions import Annotated
from pydantic import BaseModel, Field, BeforeValidator
from bson import ObjectId

PyObjectId = Annotated[str, BeforeValidator(str)]


class GlobalOffDaysInDB(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: PyObjectId
    weekly_holidays: List[int] = []  # 0=Mon, 6=Sun
    specific_dates: List[str] = []  # ["2026-03-26"]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class GlobalOffDays(GlobalOffDaysInDB):
    pass


class OffDaysUpdate(BaseModel):
    weekly_holidays: Optional[List[int]] = None
    specific_dates: Optional[List[str]] = None


class OffDaysDatesModify(BaseModel):
    dates: List[str]  # ["2026-03-26", "2026-04-14"]
