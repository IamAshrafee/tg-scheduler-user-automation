from datetime import datetime
from typing import Optional, List
from typing_extensions import Annotated
from pydantic import BaseModel, Field, BeforeValidator
from bson import ObjectId

PyObjectId = Annotated[str, BeforeValidator(str)]


class TemplateTaskConfig(BaseModel):
    name: str
    action_type: str
    schedule_type: str
    default_time: str
    description: str = ""


class TaskTemplateInDB(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    name: str
    description: str = ""
    icon: str = "📋"
    category: str = "work"  # "work" | "content" | "community" | "personal"
    tasks: List[TemplateTaskConfig] = []
    is_system: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class TaskTemplate(TaskTemplateInDB):
    pass


# Built-in templates for seeding
BUILT_IN_TEMPLATES = [
    {
        "name": "Office Attendance",
        "description": "4 tasks for daily office attendance — Duty In, Break Start, Break End, Duty Out",
        "icon": "🏢",
        "category": "work",
        "tasks": [
            {"name": "Duty In", "action_type": "send_sticker", "schedule_type": "daily", "default_time": "09:00", "description": "Send duty-in sticker"},
            {"name": "Break Start", "action_type": "send_sticker", "schedule_type": "daily", "default_time": "13:00", "description": "Send break-start sticker"},
            {"name": "Break End", "action_type": "send_sticker", "schedule_type": "daily", "default_time": "14:00", "description": "Send break-end sticker"},
            {"name": "Duty Out", "action_type": "send_sticker", "schedule_type": "daily", "default_time": "18:00", "description": "Send duty-out sticker"},
        ],
        "is_system": True,
    },
    {
        "name": "Daily Motivation Post",
        "description": "Send a daily motivational message to a group or channel",
        "icon": "💪",
        "category": "content",
        "tasks": [
            {"name": "Daily Motivation", "action_type": "send_text", "schedule_type": "daily", "default_time": "08:00", "description": "Post motivational text"},
        ],
        "is_system": True,
    },
    {
        "name": "Channel Content Schedule",
        "description": "Scheduled content posting to a channel on custom days",
        "icon": "📢",
        "category": "content",
        "tasks": [
            {"name": "Scheduled Post", "action_type": "send_text", "schedule_type": "custom_days", "default_time": "10:00", "description": "Post scheduled content"},
        ],
        "is_system": True,
    },
    {
        "name": "Study Reminder",
        "description": "Weekly reminder to study or complete assignments",
        "icon": "📚",
        "category": "personal",
        "tasks": [
            {"name": "Study Reminder", "action_type": "send_text", "schedule_type": "weekly", "default_time": "19:00", "description": "Send study reminder"},
        ],
        "is_system": True,
    },
]
