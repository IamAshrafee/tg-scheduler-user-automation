import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import get_settings
from motor.motor_asyncio import AsyncIOMotorClient
from app.services.telegram_client_manager import telegram_client_manager

async def main():
    settings = get_settings()
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.DB_NAME]
    
    accounts = await db.telegram_accounts.find().to_list(None)
    print(f"Found {len(accounts)} accounts in DB.")
    
    for acc in accounts:
        aid = str(acc["_id"])
        phone = acc["phone_number"]
        session_file = telegram_client_manager._session_path(aid)
        exists = os.path.exists(session_file)
        
        print(f"\nAccount {aid} ({phone}):")
        print(f"  Session Exists: {exists}")
        print(f"  Session Path: {session_file}")
        
        if exists:
            try:
                # Try to load and connect
                t_client = await telegram_client_manager.get_client(aid)
                if t_client:
                    if await t_client.is_user_authorized():
                        me = await t_client.get_me()
                        print(f"  Status: CONNECTED as {me.first_name} (@{me.username})")
                        # Try listing groups
                        dialogs = await t_client.get_dialogs(limit=5)
                        print(f"  Dialogs: Found {len(dialogs)} dialogs (limit 5)")
                    else:
                        print(f"  Status: NOT AUTHORIZED (Session valid but auth invalid)")
                else:
                    print(f"  Status: FAILED (get_client returned None)")
            except Exception as e:
                print(f"  Error: {e}")
        else:
            print("  Status: MISSING SESSION FILE")

if __name__ == "__main__":
    asyncio.run(main())
