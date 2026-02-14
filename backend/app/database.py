from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_settings

settings = get_settings()

class Database:
    client: AsyncIOMotorClient = None

db = Database()

async def get_database_client():
    if db.client is None:
        db.client = AsyncIOMotorClient(settings.MONGO_URI)
    return db.client

async def close_database_client():
    if db.client:
        db.client.close()
        db.client = None

def get_db():
    if db.client is None:
        # Fallback or error if called before startup
        return None
    return db.client[settings.DB_NAME]
