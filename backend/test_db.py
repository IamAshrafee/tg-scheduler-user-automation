import asyncio
import os
import sys

# Add current directory to path so we can import app
sys.path.append(os.getcwd())

from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_settings

async def test_connection():
    settings = get_settings()
    print(f"Testing connection to: {settings.MONGO_URI}")
    
    try:
        client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
        # Ping the server
        await client.admin.command('ping')
        print("✅ Successfully connected to MongoDB!")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(test_connection())
