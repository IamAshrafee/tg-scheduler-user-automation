"""
Admin API endpoints — all require admin role.
"""
from typing import Annotated, Optional
from datetime import datetime, timedelta
import time

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from bson import ObjectId

from app.middleware.deps import get_current_admin_user
from app.models.user import User, UserUpdate
from app.services.user_service import user_service
from app.services.telegram_account_service import telegram_account_service
from app.services.task_service import task_service
from app.services.activity_log_service import activity_log_service
from app.services.scheduler_engine import scheduler_engine
from app.services.telegram_client_manager import telegram_client_manager
from app.database import get_db

router = APIRouter()

_server_start_time = time.time()


# ─── Pydantic schemas ────────────────────────────────────────────────

class AdminUserUpdate(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[str] = None
    telegram_account_limit: Optional[int] = None
    task_limit: Optional[int] = None


# ─── Dashboard Stats ─────────────────────────────────────────────────

@router.get("/dashboard/stats")
async def admin_dashboard_stats(
    admin: Annotated[User, Depends(get_current_admin_user)],
):
    db = get_db()

    total_users = await db["users"].count_documents({})
    total_accounts = await db["telegram_accounts"].count_documents({})
    total_tasks = await db["tasks"].count_documents({})
    active_tasks = await db["tasks"].count_documents({"is_enabled": True})

    # Today's execution stats
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_filter = {"created_at": {"$gte": today_start}}

    total_executions_today = await db["activity_logs"].count_documents(today_filter)
    sent_today = await db["activity_logs"].count_documents({**today_filter, "status": "sent"})
    failed_today = await db["activity_logs"].count_documents({**today_filter, "status": "failed"})
    skipped_today = await db["activity_logs"].count_documents({**today_filter, "status": "skipped"})

    # Recent failures (last 10)
    recent_failures = []
    cursor = db["activity_logs"].find({"status": "failed"}).sort("created_at", -1).limit(10)
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        recent_failures.append(doc)

    # Top 5 most active users (by task count)
    pipeline = [
        {"$group": {"_id": "$user_id", "task_count": {"$sum": 1}}},
        {"$sort": {"task_count": -1}},
        {"$limit": 5},
    ]
    top_users = []
    async for entry in db["tasks"].aggregate(pipeline):
        user = await user_service.get_by_id(entry["_id"])
        top_users.append({
            "user_id": entry["_id"],
            "email": user.email if user else "deleted",
            "task_count": entry["task_count"],
        })

    return {
        "total_users": total_users,
        "total_accounts": total_accounts,
        "total_tasks": total_tasks,
        "active_tasks": active_tasks,
        "today": {
            "total": total_executions_today,
            "sent": sent_today,
            "failed": failed_today,
            "skipped": skipped_today,
        },
        "recent_failures": recent_failures,
        "top_users": top_users,
    }


# ─── User Management ─────────────────────────────────────────────────

@router.get("/users")
async def admin_list_users(
    admin: Annotated[User, Depends(get_current_admin_user)],
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
):
    db = get_db()
    query = {}
    if search:
        query["email"] = {"$regex": search, "$options": "i"}

    cursor = db["users"].find(query).sort("created_at", -1).skip(skip).limit(limit)
    users = []
    async for doc in cursor:
        user_id = str(doc["_id"])
        doc["_id"] = user_id
        # Attach counts
        doc["accounts_count"] = await db["telegram_accounts"].count_documents({"user_id": user_id})
        doc["tasks_count"] = await db["tasks"].count_documents({"user_id": user_id})
        # Remove password hash from response
        doc.pop("password_hash", None)
        users.append(doc)

    total = await db["users"].count_documents(query)
    return {"users": users, "total": total}


@router.get("/users/{user_id}")
async def admin_get_user(
    user_id: str,
    admin: Annotated[User, Depends(get_current_admin_user)],
):
    user = await user_service.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db = get_db()
    uid = str(user.id)

    # Accounts
    accounts = []
    cursor = db["telegram_accounts"].find({"user_id": uid})
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        accounts.append(doc)

    # Tasks
    tasks = []
    cursor = db["tasks"].find({"user_id": uid})
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        tasks.append(doc)

    user_dict = user.model_dump(by_alias=True)
    user_dict.pop("password_hash", None)
    user_dict["_id"] = uid

    return {
        "user": user_dict,
        "accounts": accounts,
        "tasks": tasks,
    }


@router.patch("/users/{user_id}")
async def admin_update_user(
    user_id: str,
    body: AdminUserUpdate,
    admin: Annotated[User, Depends(get_current_admin_user)],
):
    user = await user_service.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update = UserUpdate(**body.model_dump(exclude_unset=True))
    updated = await user_service.update(user_id, update)
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update user")

    result = updated.model_dump(by_alias=True)
    result.pop("password_hash", None)
    return result


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_user(
    user_id: str,
    admin: Annotated[User, Depends(get_current_admin_user)],
):
    user = await user_service.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if str(user.id) == str(admin.id):
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    db = get_db()
    uid = str(user.id)

    # Cascade: remove tasks, accounts, off days, activity logs
    await db["tasks"].delete_many({"user_id": uid})
    await db["telegram_accounts"].delete_many({"user_id": uid})
    await db["off_days"].delete_many({"user_id": uid})
    await db["activity_logs"].delete_many({"user_id": uid})
    await db["users"].delete_one({"_id": ObjectId(uid)})

    return None


# ─── Telegram Account Control ────────────────────────────────────────

@router.get("/telegram-accounts")
async def admin_list_telegram_accounts(
    admin: Annotated[User, Depends(get_current_admin_user)],
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
):
    db = get_db()
    query = {}
    if search:
        query["$or"] = [
            {"phone": {"$regex": search, "$options": "i"}},
            {"first_name": {"$regex": search, "$options": "i"}},
        ]

    cursor = db["telegram_accounts"].find(query).sort("created_at", -1).skip(skip).limit(limit)
    accounts = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        # Attach owner email
        owner = await user_service.get_by_id(doc.get("user_id", ""))
        doc["owner_email"] = owner.email if owner else "unknown"
        doc["active_tasks"] = await db["tasks"].count_documents({
            "telegram_account_id": doc["_id"],
            "is_enabled": True,
        })
        accounts.append(doc)

    total = await db["telegram_accounts"].count_documents(query)
    return {"accounts": accounts, "total": total}


@router.patch("/telegram-accounts/{account_id}/lock")
async def admin_lock_account(
    account_id: str,
    admin: Annotated[User, Depends(get_current_admin_user)],
):
    db = get_db()
    try:
        oid = ObjectId(account_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid account ID")

    result = await db["telegram_accounts"].find_one_and_update(
        {"_id": oid},
        {"$set": {"is_locked_by_admin": True, "status": "locked"}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Account not found")

    result["_id"] = str(result["_id"])
    return result


@router.patch("/telegram-accounts/{account_id}/unlock")
async def admin_unlock_account(
    account_id: str,
    admin: Annotated[User, Depends(get_current_admin_user)],
):
    db = get_db()
    try:
        oid = ObjectId(account_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid account ID")

    result = await db["telegram_accounts"].find_one_and_update(
        {"_id": oid},
        {"$set": {"is_locked_by_admin": False, "status": "active"}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Account not found")

    result["_id"] = str(result["_id"])
    return result


# ─── Task Monitoring ──────────────────────────────────────────────────

@router.get("/tasks")
async def admin_list_tasks(
    admin: Annotated[User, Depends(get_current_admin_user)],
    task_status: Optional[str] = Query(None, alias="status"),
    action_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
):
    db = get_db()
    query = {}
    if task_status == "active":
        query["is_enabled"] = True
    elif task_status == "paused":
        query["is_enabled"] = False
    if action_type:
        query["action_type"] = action_type
    if search:
        query["name"] = {"$regex": search, "$options": "i"}

    cursor = db["tasks"].find(query).sort("created_at", -1).skip(skip).limit(limit)
    tasks = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        # Attach owner email
        owner = await user_service.get_by_id(doc.get("user_id", ""))
        doc["owner_email"] = owner.email if owner else "unknown"
        tasks.append(doc)

    total = await db["tasks"].count_documents(query)
    return {"tasks": tasks, "total": total}


# ─── Activity Logs ────────────────────────────────────────────────────

@router.get("/activity-logs")
async def admin_list_activity_logs(
    admin: Annotated[User, Depends(get_current_admin_user)],
    log_status: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
):
    db = get_db()
    query = {}
    if log_status:
        query["status"] = log_status

    cursor = db["activity_logs"].find(query).sort("created_at", -1).skip(skip).limit(limit)
    logs = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        logs.append(doc)

    total = await db["activity_logs"].count_documents(query)
    return {"logs": logs, "total": total}


# ─── System Controls ──────────────────────────────────────────────────

@router.post("/system/restart")
async def admin_restart_scheduler(
    admin: Annotated[User, Depends(get_current_admin_user)],
):
    scheduler_engine.stop()
    await scheduler_engine.start()
    return {"message": "Scheduler restarted successfully"}


@router.get("/system/health")
async def admin_system_health(
    admin: Annotated[User, Depends(get_current_admin_user)],
):
    db = get_db()

    # DB check
    db_connected = False
    try:
        await db.client.admin.command("ping")
        db_connected = True
    except Exception:
        pass

    uptime_seconds = int(time.time() - _server_start_time)
    hours, remainder = divmod(uptime_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)

    active_clients = len(telegram_client_manager._clients) if hasattr(telegram_client_manager, "_clients") else 0
    scheduler_running = scheduler_engine._started
    scheduled_jobs = len(scheduler_engine.scheduler.get_jobs()) if scheduler_running else 0

    return {
        "status": "healthy" if db_connected and scheduler_running else "degraded",
        "uptime": f"{hours}h {minutes}m {seconds}s",
        "uptime_seconds": uptime_seconds,
        "database": "connected" if db_connected else "disconnected",
        "scheduler": "running" if scheduler_running else "stopped",
        "scheduled_jobs": scheduled_jobs,
        "active_telegram_clients": active_clients,
    }
