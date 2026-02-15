import os
import logging
from typing import Annotated, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request, status, UploadFile, File, Query
from bson import ObjectId

from app.models.user import User
from app.models.task import Task, TaskCreate, TaskUpdate
from app.middleware.deps import get_current_active_user
from app.middleware.rate_limiter import limiter
from app.services.task_service import task_service
from app.services.telegram_account_service import telegram_account_service
from app.services.activity_log_service import activity_log_service

router = APIRouter()
logger = logging.getLogger(__name__)

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

# ─── File upload security ───
ALLOWED_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp",          # images
    ".mp4", ".mpeg", ".webm",                           # videos
    ".pdf", ".zip", ".doc", ".docx", ".txt",            # documents
}
ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "video/mp4", "video/mpeg", "video/webm",
    "application/pdf", "application/zip",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}


@router.get("/")
async def list_tasks(
    current_user: Annotated[User, Depends(get_current_active_user)],
    account_id: Optional[str] = Query(None),
    task_status: Optional[str] = Query(None, alias="status"),
    action_type: Optional[str] = Query(None),
):
    """List all tasks for the current user with optional filters."""
    tasks = await task_service.get_by_user(
        str(current_user.id),
        account_id=account_id,
        status=task_status,
        action_type=action_type,
    )
    return {"tasks": tasks}


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_task(
    task_in: TaskCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Create a new automated task."""
    # Enforce task limit
    count = await task_service.count_by_user(str(current_user.id))
    if count >= current_user.task_limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Task limit reached ({current_user.task_limit}).",
        )

    # Verify account belongs to user and is active
    account = await telegram_account_service.get_by_id(task_in.telegram_account_id)
    if not account or account.user_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Telegram account.")
    if account.status != "active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Telegram account is not active.")

    # Validate action_type
    valid_actions = ["send_sticker", "send_text", "send_photo", "send_video", "send_document", "forward_message"]
    if task_in.action_type not in valid_actions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid action_type. Must be one of: {valid_actions}")

    task = await task_service.create(
        user_id=str(current_user.id),
        task_in=task_in,
        timezone=current_user.timezone,
    )

    # Notify scheduler to add job
    try:
        from app.services.scheduler_engine import scheduler_engine
        await scheduler_engine.add_job(task)
    except Exception:
        pass  # Scheduler may not be fully initialized

    return task


@router.get("/upload-info")
async def upload_info():
    """Get upload configuration."""
    return {
        "max_file_size_mb": MAX_FILE_SIZE // (1024 * 1024),
        "allowed_extensions": sorted(ALLOWED_EXTENSIONS),
    }


@router.post("/upload")
@limiter.limit("10/hour")
async def upload_media(
    request: Request,
    file: UploadFile = File(...),
    current_user: Annotated[User, Depends(get_current_active_user)] = None,
):
    """Upload a media file (photo, video, document) for use in a task."""
    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{ext}' is not allowed. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
        )

    # Validate MIME type
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Content type '{file.content_type}' is not allowed.",
        )

    # Read and validate size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Max size is {MAX_FILE_SIZE // (1024 * 1024)}MB.",
        )

    # Save with unique name (preserving validated extension)
    unique_name = f"{ObjectId()}{ext}"
    file_path = os.path.join(UPLOADS_DIR, unique_name)

    with open(file_path, "wb") as f:
        f.write(contents)

    return {
        "file_path": f"uploads/{unique_name}",
        "filename": file.filename,
        "size": len(contents),
    }


@router.get("/{task_id}")
async def get_task(
    task_id: str,
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Get details of a specific task."""
    task = await task_service.get_by_id(task_id)
    if not task or task.user_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")
    return task


@router.put("/{task_id}")
async def update_task(
    task_id: str,
    task_update: TaskUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Update an existing task."""
    existing = await task_service.get_by_id(task_id)
    if not existing or existing.user_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    task = await task_service.update(task_id, task_update, current_user.timezone)

    # Notify scheduler to update job
    try:
        from app.services.scheduler_engine import scheduler_engine
        await scheduler_engine.update_job(task)
    except Exception:
        pass

    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Delete a task."""
    existing = await task_service.get_by_id(task_id)
    if not existing or existing.user_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    # Remove from scheduler
    try:
        from app.services.scheduler_engine import scheduler_engine
        scheduler_engine.remove_job(task_id)
    except Exception:
        pass

    await task_service.delete(task_id)
    return None


@router.patch("/{task_id}/toggle")
async def toggle_task(
    task_id: str,
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Enable or disable a task."""
    existing = await task_service.get_by_id(task_id)
    if not existing or existing.user_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    task = await task_service.toggle(task_id)

    # Update scheduler
    try:
        from app.services.scheduler_engine import scheduler_engine
        if task.is_enabled:
            await scheduler_engine.add_job(task)
        else:
            scheduler_engine.remove_job(task_id)
    except Exception:
        pass

    return task


@router.post("/{task_id}/test")
async def test_task(
    task_id: str,
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Dry Run: Execute a task immediately (one-time)."""
    existing = await task_service.get_by_id(task_id)
    if not existing or existing.user_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    try:
        from app.services.action_executor import execute_task
        result = await execute_task(existing, dry_run=True)
        return {"message": "Test execution complete.", "result": result}
    except Exception as e:
        logger.exception("test_task failed for task %s", task_id)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task test execution failed. Check your account connection and target.")


@router.get("/{task_id}/history")
async def get_task_history(
    task_id: str,
    current_user: Annotated[User, Depends(get_current_active_user)],
    limit: int = Query(50, le=100),
    skip: int = Query(0, ge=0),
):
    """Get execution history for a specific task."""
    existing = await task_service.get_by_id(task_id)
    if not existing or existing.user_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    logs = await activity_log_service.get_by_task(task_id, limit=limit, skip=skip)
    return {"logs": logs}
