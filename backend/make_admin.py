"""
Promote a user to admin by email.

Usage:
    python make_admin.py your-email@example.com
"""
import asyncio
import sys
from app.database import get_database_client, close_database_client, get_db
from app.config import get_settings

async def main():
    if len(sys.argv) < 2:
        print("Usage: python make_admin.py <email>")
        sys.exit(1)

    email = sys.argv[1]
    await get_database_client()
    db = get_db()

    result = await db["users"].find_one_and_update(
        {"email": email},
        {"$set": {"role": "admin"}},
        return_document=True,
    )

    if result:
        print(f"✅ {email} is now an admin!")
    else:
        print(f"❌ No user found with email: {email}")

    await close_database_client()

if __name__ == "__main__":
    asyncio.run(main())
