from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, status

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
