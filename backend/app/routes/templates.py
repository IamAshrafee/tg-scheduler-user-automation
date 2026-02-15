from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, status

from app.models.task import TaskCreate, TaskTarget, ActionContent, TaskSchedule, SkipDays

from app.models.user import User
from app.models.template import TaskTemplate, BUILT_IN_TEMPLATES
from app.middleware.deps import get_current_active_user
from app.database import get_db

router = APIRouter()


async def get_template_collection():
    db = get_db()
    return db["templates"]


async def seed_templates():
    """Seed built-in templates if they don't exist."""
    coll = await get_template_collection()
    count = await coll.count_documents({"is_system": True})
    if count == 0:
        await coll.insert_many(BUILT_IN_TEMPLATES)
        print(f"Seeded {len(BUILT_IN_TEMPLATES)} built-in templates.")


@router.get("/")
async def list_templates(
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """List all available task templates."""
    coll = await get_template_collection()
    cursor = coll.find({})
    templates = []
    async for doc in cursor:
        templates.append(TaskTemplate(**doc))
    return {"templates": templates}


@router.post("/{template_id}/apply")
async def apply_template(
    template_id: str,
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Apply a template — returns the pre-configured task configs.
    The frontend uses these to pre-fill the task creation form.
    The user still needs to select account, target group, and stickers.
    """
    from bson import ObjectId
    coll = await get_template_collection()
    try:
        doc = await coll.find_one({"_id": ObjectId(template_id)})
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found.")

    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found.")

    template = TaskTemplate(**doc)
    return {
        "template_name": template.name,
        "template_description": template.description,
        "tasks": template.tasks,
        "message": f"Apply '{template.name}' — {len(template.tasks)} task(s) to configure.",
    }


# ─── Template Instantiation ───
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid

class TemplateTaskOverride(BaseModel):
    name: str
    description: str = ""
    action_type: str
    action_content: dict = {} # We'll parse this into ActionContent
    
    # Advanced / Full Override
    schedule: Optional[TaskSchedule] = None
    simulate_typing: bool = False
    skip_days: Optional[SkipDays] = None

    # Legacy / Template basic fields (used if schedule is missing)
    schedule_type: Optional[str] = None
    default_time: Optional[str] = None

class TemplateInstantiationRequest(BaseModel):
    telegram_account_id: str
    target_chat_id: int
    target_chat_title: str
    target_access_hash: str = Field(default=None)
    tasks: Optional[List[TemplateTaskOverride]] = None


@router.post("/{template_id}/instantiate", status_code=status.HTTP_201_CREATED)
async def instantiate_template(
    template_id: str,
    request: TemplateInstantiationRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Apply a template and CREATE all tasks immediately.
    Supports optional 'tasks' list to override/customize the creation.
    """
    from bson import ObjectId
    from app.services.task_service import task_service
    from app.services.telegram_account_service import telegram_account_service

    # 1. Fetch template
    coll = await get_template_collection()
    try:
        doc = await coll.find_one({"_id": ObjectId(template_id)})
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found.")
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found.")
    template = TaskTemplate(**doc)

    # 2. Verify Account
    account = await telegram_account_service.get_by_id(request.telegram_account_id)
    if not account or account.user_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Telegram account.")
    if account.status != "active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Telegram account is not active.")

    # 3. Create Tasks
    created_ids = []
    batch_id = str(uuid.uuid4())
    
    tasks_to_create = request.tasks if request.tasks else template.tasks
    
    # Check limit first
    current_count = await task_service.count_by_user(str(current_user.id))
    if current_count + len(tasks_to_create) > current_user.task_limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Task limit reached. Cannot add {len(tasks_to_create)} tasks. Limit: {current_user.task_limit}"
        )

    for task_config in tasks_to_create:
        # Construct TaskCreate object
        # Handle ActionContent from dict if override, or empty if template config
        
        # If it's an override, action_content is a dict
        content_dict = {}
        if isinstance(task_config, TemplateTaskOverride):
            content_dict = task_config.action_content
        
        # Safe construction of ActionContent
        action_content_obj = ActionContent(**content_dict) if content_dict else ActionContent(text="")
        
        # Resolve Schedule
        schedule_obj = None
        if isinstance(task_config, TemplateTaskOverride) and task_config.schedule:
             schedule_obj = task_config.schedule
        else:
             # Fallback to simple properties
             stype = getattr(task_config, 'schedule_type', 'daily')
             sdefault = getattr(task_config, 'default_time', '09:00')
             schedule_obj = TaskSchedule(
                 type=stype,
                 time=sdefault,
                 timezone=current_user.timezone
             )
        
        # Resolve Options
        sim_typing = getattr(task_config, 'simulate_typing', False)
        # Handle SkipDays default
        skip_days_val = getattr(task_config, 'skip_days', None)
        if not skip_days_val:
             skip_days_val = SkipDays()

        task_in = TaskCreate(
            telegram_account_id=request.telegram_account_id,
            name=task_config.name,
            description=task_config.description,
            target=TaskTarget(
                type="group" if request.target_chat_id < 0 else "channel", 
                chat_id=request.target_chat_id,
                chat_title=request.target_chat_title,
                access_hash=int(request.target_access_hash) if request.target_access_hash else None
            ),
            action_type=task_config.action_type,
            action_content=action_content_obj,
            schedule=schedule_obj,
            simulate_typing=sim_typing,
            skip_days=skip_days_val,
            template_id=template_id,
            batch_id=batch_id
        )

        # Create
        new_task = await task_service.create(
            user_id=str(current_user.id),
            task_in=task_in,
            timezone=current_user.timezone
        )
        created_ids.append(str(new_task.id))

        # Notify Scheduler
        try:
            from app.services.scheduler_engine import scheduler_engine
            await scheduler_engine.add_job(new_task)
        except Exception:
            pass

    return {
        "count": len(created_ids),
        "task_ids": created_ids,
        "batch_id": batch_id,
        "message": f"Successfully created {len(created_ids)} tasks."
    }
