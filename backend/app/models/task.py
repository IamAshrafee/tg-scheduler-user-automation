from datetime import datetime
from typing import Optional, List
from typing_extensions import Annotated
from pydantic import BaseModel, Field, BeforeValidator
from bson import ObjectId

PyObjectId = Annotated[str, BeforeValidator(str)]


# --- Nested schemas ---

class TaskTarget(BaseModel):
    type: str  # "group" | "channel"
    chat_id: int
    chat_title: str = ""
    access_hash: Optional[int] = None


class ActionContent(BaseModel):
    # For send_sticker
    sticker_set_id: Optional[str] = None
    sticker_id: Optional[str] = None
    sticker_emoji: Optional[str] = None
    sticker_access_hash: Optional[int] = None

    # For send_text
    text: Optional[str] = None
    parse_mode: Optional[str] = None  # "markdown" | "html" | null

    # For send_photo / send_video / send_document
    file_path: Optional[str] = None
    caption: Optional[str] = None

    # For forward_message
    source_chat_id: Optional[int] = None
    source_message_id: Optional[int] = None


class TaskSchedule(BaseModel):
    type: str  # "daily" | "weekly" | "monthly" | "custom_days" | "specific_dates"
    time: str  # "09:00" HH:MM 24hr
    timezone: Optional[str] = None  # inherited from user if null

    # Weekly
    days_of_week: Optional[List[int]] = None  # [0,1,2,3,4] Mon-Fri

    # Monthly
    days_of_month: Optional[List[int]] = None  # [1,15]

    # Specific dates
    specific_dates: Optional[List[str]] = None  # ["2026-02-20"]

    # Anti-ban
    random_delay_minutes: int = 0


class SkipDays(BaseModel):
    weekly_holidays: List[int] = []  # 0=Monday, 6=Sunday
    specific_dates: List[str] = []  # ["2026-03-26"]
    this_month_only: bool = False  # If true, task auto-deactivates at month end
    monthly_skip_days: List[int] = []  # Day-of-month to skip, e.g. [5, 12, 20]
    active_month: Optional[int] = None  # Month number (1-12) when activated
    active_year: Optional[int] = None  # Year when activated


# --- Create / Update ---

class TaskCreate(BaseModel):
    telegram_account_id: str
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = ""

    target: TaskTarget
    action_type: str  # "send_sticker" | "send_text" | "send_photo" | "send_video" | "send_document" | "forward_message"
    action_content: ActionContent
    schedule: TaskSchedule

    simulate_typing: bool = False
    skip_days: SkipDays = SkipDays()
    template_id: Optional[str] = None
    batch_id: Optional[str] = None


class TaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    target: Optional[TaskTarget] = None
    action_type: Optional[str] = None
    action_content: Optional[ActionContent] = None
    schedule: Optional[TaskSchedule] = None
    simulate_typing: Optional[bool] = None
    skip_days: Optional[SkipDays] = None
    batch_id: Optional[str] = None


# --- DB Model ---

class TaskInDB(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: PyObjectId
    telegram_account_id: PyObjectId
    name: str
    description: str = ""

    target: TaskTarget
    action_type: str
    action_content: ActionContent
    schedule: TaskSchedule

    simulate_typing: bool = False
    skip_days: SkipDays = SkipDays()

    is_enabled: bool = True
    status: str = "active"  # "active" | "paused" | "error"
    last_execution: Optional[datetime] = None
    next_execution: Optional[datetime] = None
    template_id: Optional[str] = None
    batch_id: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class Task(TaskInDB):
    pass
