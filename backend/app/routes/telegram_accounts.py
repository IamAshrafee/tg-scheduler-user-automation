import logging
from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, Request, status
from bson import ObjectId

from app.models.user import User
from app.models.telegram_account import (
    SendCodeRequest,
    VerifyCodeRequest,
    TelegramAccountResponse,
)
from app.middleware.deps import get_current_active_user
from app.middleware.rate_limiter import limiter
from app.services.telegram_account_service import telegram_account_service
from app.services.telegram_client_manager import telegram_client_manager

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/", response_model=List[TelegramAccountResponse])
async def list_accounts(current_user: Annotated[User, Depends(get_current_active_user)]):
    """List all Telegram accounts connected by the current user."""
    accounts = await telegram_account_service.get_by_user_id(str(current_user.id))
    return accounts


@router.post("/send-code")
@limiter.limit("3/10minutes")
async def send_code(
    request: Request,
    req: SendCodeRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Step 1: Send a login code to the given phone number via Telegram."""
    # Check account limit
    count = await telegram_account_service.count_by_user(str(current_user.id))
    if count >= current_user.telegram_account_limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Account limit reached ({current_user.telegram_account_limit}). Remove an account first.",
        )

    # Check if this phone is already connected for this user
    existing = await telegram_account_service.get_by_phone(
        str(current_user.id), req.phone_number
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This phone number is already connected to your account.",
        )

    try:
        result = await telegram_client_manager.send_code(req.phone_number)
        return result
    except Exception as e:
        logger.exception("send_code failed for user %s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to send verification code. Please try again later.",
        )


@router.post("/verify-code", status_code=status.HTTP_201_CREATED)
async def verify_code(
    req: VerifyCodeRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Step 2: Verify the login code (and optional 2FA password) to complete connection."""
    try:
        result = await telegram_client_manager.verify_code(
            phone_number=req.phone_number,
            code=req.code,
            password=req.password,
        )
    except Exception as e:
        error_msg = str(e)
        # Preserve user-actionable messages, mask unknown errors
        safe_messages = [
            "Login session expired",
            "Two-factor authentication",
            "Invalid verification code",
            "Verification code has expired",
            "Invalid 2FA password",
        ]
        if any(msg in error_msg for msg in safe_messages):
            detail = error_msg
        else:
            logger.exception("verify_code failed for user %s", current_user.id)
            detail = "Failed to verify code. Please try again."
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )

    # Save account to database
    account_data = {
        "user_id": str(current_user.id),
        "phone_number": req.phone_number,
        "telegram_user_id": result["telegram_user_id"],
        "first_name": result["first_name"],
        "username": result["username"],
        "session_file": "",  # will be set after saving
        "status": "active",
        "is_locked_by_admin": False,
        "active_tasks_count": 0,
    }

    account = await telegram_account_service.create(account_data)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save account.",
        )

    # Save encrypted session to disk
    telegram_client_manager.save_session(str(account.id), result["session_string"])

    # Store client in active pool
    telegram_client_manager.store_client(str(account.id), result["client"])

    # Update session_file path in DB
    await telegram_account_service.collection.update_one(
        {"_id": ObjectId(str(account.id))},
        {"$set": {"session_file": telegram_client_manager._session_path(str(account.id))}},
    )

    return {
        "message": "Telegram account connected successfully!",
        "account": {
            "id": str(account.id),
            "phone_number": account.phone_number,
            "first_name": result["first_name"],
            "username": result["username"],
            "status": "active",
        },
    }


@router.get("/{account_id}", response_model=TelegramAccountResponse)
async def get_account(
    account_id: str,
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Get details of a specific Telegram account."""
    account = await telegram_account_service.get_by_id(account_id)
    if not account or account.user_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")
    return account


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: str,
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Disconnect and delete a Telegram account."""
    account = await telegram_account_service.get_by_id(account_id)
    if not account or account.user_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

    # Disconnect client
    await telegram_client_manager.disconnect_client(account_id)
    # Delete session file
    telegram_client_manager.delete_session_file(account_id)
    # Delete from DB
    await telegram_account_service.delete(account_id)

    return None


# ─── Data Fetching Endpoints ───

@router.get("/{account_id}/groups")
async def get_groups(
    account_id: str,
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """List groups and channels the Telegram account has joined."""
    account = await telegram_account_service.get_by_id(account_id)
    if not account or account.user_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")
    if account.status != "active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is not active.")

    try:
        groups = await telegram_client_manager.get_groups(account_id)
        return {"groups": groups}
    except Exception as e:
        logger.exception("get_groups failed for account %s", account_id)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to fetch groups from Telegram.")


@router.get("/{account_id}/sticker-sets")
async def get_sticker_sets(
    account_id: str,
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """List the user's saved sticker sets."""
    account = await telegram_account_service.get_by_id(account_id)
    if not account or account.user_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")
    if account.status != "active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is not active.")

    try:
        sticker_sets = await telegram_client_manager.get_sticker_sets(account_id)
        return {"sticker_sets": sticker_sets}
    except Exception as e:
        logger.exception("get_sticker_sets failed for account %s", account_id)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to fetch sticker sets from Telegram.")


@router.get("/{account_id}/sticker-sets/{set_short_name}/stickers")
async def get_stickers_in_set(
    account_id: str,
    set_short_name: str,
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """List individual stickers in a specific sticker set."""
    account = await telegram_account_service.get_by_id(account_id)
    if not account or account.user_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")
    if account.status != "active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is not active.")

    try:
        stickers = await telegram_client_manager.get_stickers_in_set(account_id, set_short_name)
        return {"stickers": stickers}
    except Exception as e:
        logger.exception("get_stickers_in_set failed for account %s", account_id)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to fetch stickers from Telegram.")
