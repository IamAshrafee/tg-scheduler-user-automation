from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.config import get_settings
from app.routes import auth
from app.services.user_service import user_service

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to DB, Initialize Scheduler, Connect Telegram Clients
    print("Starting up...")
    from app.database import get_database_client, close_database_client
    await get_database_client()
    await user_service.create_indexes()
    yield
    # Shutdown: Disconnect DB, Shutdown Scheduler, Disconnect Telegram Clients
    print("Shutting down...")
    await close_database_client()

app = FastAPI(
    title="Telegram Automation Platform API",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])

@app.get("/health")
async def health_check():
    return {
        "status": "ok", 
        "version": "1.0.0",
        "mode": "debug" if settings.DEBUG else "production"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=settings.DEBUG)
