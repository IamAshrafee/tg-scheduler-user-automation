from datetime import datetime
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status

from app.models.user import User
from app.models.off_days import GlobalOffDays, OffDaysUpdate, OffDaysDatesModify
from app.middleware.deps import get_current_active_user
from app.database import get_db

router = APIRouter()


async def get_off_days_collection():
    db = get_db()
    return db["off_days"]


@router.get("/")
async def get_off_days(
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Get the user's global off days configuration."""
    coll = await get_off_days_collection()
    doc = await coll.find_one({"user_id": str(current_user.id)})
    if not doc:
        # Create default
        default = {
            "user_id": str(current_user.id),
            "weekly_holidays": [],
            "specific_dates": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        await coll.insert_one(default)
        doc = await coll.find_one({"user_id": str(current_user.id)})
    return GlobalOffDays(**doc)


@router.put("/")
async def update_off_days(
    update: OffDaysUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Update the user's global off days (replace weekly holidays and/or specific dates)."""
    coll = await get_off_days_collection()
    update_data = update.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()

    await coll.update_one(
        {"user_id": str(current_user.id)},
        {"$set": update_data},
        upsert=True,
    )
    doc = await coll.find_one({"user_id": str(current_user.id)})
    return GlobalOffDays(**doc)


@router.post("/dates")
async def add_off_dates(
    body: OffDaysDatesModify,
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Add specific date(s) to off days."""
    coll = await get_off_days_collection()
    await coll.update_one(
        {"user_id": str(current_user.id)},
        {
            "$addToSet": {"specific_dates": {"$each": body.dates}},
            "$set": {"updated_at": datetime.utcnow()},
        },
        upsert=True,
    )
    doc = await coll.find_one({"user_id": str(current_user.id)})
    return GlobalOffDays(**doc)


@router.delete("/dates")
async def remove_off_dates(
    body: OffDaysDatesModify,
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Remove specific date(s) from off days."""
    coll = await get_off_days_collection()
    await coll.update_one(
        {"user_id": str(current_user.id)},
        {
            "$pull": {"specific_dates": {"$in": body.dates}},
            "$set": {"updated_at": datetime.utcnow()},
        },
    )
    doc = await coll.find_one({"user_id": str(current_user.id)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Off days not found.")
    return GlobalOffDays(**doc)
