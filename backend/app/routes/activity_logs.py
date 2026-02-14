from typing import Annotated, Optional
from fastapi import APIRouter, Depends, Query

from app.models.user import User
from app.middleware.deps import get_current_active_user
from app.services.activity_log_service import activity_log_service

router = APIRouter()


@router.get("/")
async def list_activity_logs(
    current_user: Annotated[User, Depends(get_current_active_user)],
    task_id: Optional[str] = Query(None),
    account_id: Optional[str] = Query(None),
    log_status: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, le=100),
    skip: int = Query(0, ge=0),
):
    """List activity logs for the current user with optional filters."""
    logs = await activity_log_service.get_by_user(
        user_id=str(current_user.id),
        task_id=task_id,
        account_id=account_id,
        status=log_status,
        limit=limit,
        skip=skip,
    )
    return {"logs": logs}
