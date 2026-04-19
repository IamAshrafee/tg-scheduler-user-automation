from fastapi import APIRouter, Depends, HTTPException, status
from app.routes.auth import get_current_user
from app.models.user import User
from app.models.keep_online import KeepOnline, KeepOnlineUpdate
from app.services.keep_online_service import keep_online_service
from app.services.telegram_account_service import telegram_account_service

router = APIRouter()


@router.get("/{account_id}", response_model=KeepOnline)
async def get_keep_online_settings(
    account_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get Keep Online settings for a specific Telegram account."""
    # Verify account belongs to user
    account = await telegram_account_service.get_by_id(account_id)
    if not account or str(account.user_id) != str(current_user.id):
        raise HTTPException(status_code=404, detail="Telegram account not found.")

    settings = await keep_online_service.get_by_account(account_id, str(current_user.id))
    
    # If no settings exist yet, return a default disabled state
    if not settings:
        return KeepOnline(
            user_id=str(current_user.id),
            telegram_account_id=account_id,
            enabled=False,
            mode="always",
        )
    return settings


@router.put("/{account_id}", response_model=KeepOnline)
async def update_keep_online_settings(
    account_id: str,
    update_data: KeepOnlineUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update or create Keep Online settings for a specific Telegram account."""
    # Verify account belongs to user
    account = await telegram_account_service.get_by_id(account_id)
    if not account or str(account.user_id) != str(current_user.id):
        raise HTTPException(status_code=404, detail="Telegram account not found.")
        
    # Apply user's timezone if not provided
    if not update_data.timezone:
        update_data.timezone = current_user.timezone

    settings = await keep_online_service.upsert(
        account_id=account_id,
        user_id=str(current_user.id),
        update=update_data
    )
    return settings
