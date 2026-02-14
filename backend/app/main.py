from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.config import get_settings
from app.routes import auth, telegram_accounts, tasks, templates, off_days, activity_logs
from app.services.user_service import user_service
from app.services.telegram_account_service import telegram_account_service
from app.services.telegram_client_manager import telegram_client_manager
from app.services.task_service import task_service
from app.services.activity_log_service import activity_log_service
from app.services.scheduler_engine import scheduler_engine

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting up...")
    from app.database import get_database_client, close_database_client
    await get_database_client()

    # Create indexes
    await user_service.create_indexes()
    await telegram_account_service.create_indexes()
    await task_service.create_indexes()
    await activity_log_service.create_indexes()

    # Seed templates
    from app.routes.templates import seed_templates
    await seed_templates()

    # Start scheduler
    await scheduler_engine.start()

    yield

    # Shutdown
    print("Shutting down...")
    scheduler_engine.stop()
    await telegram_client_manager.disconnect_all()
    await close_database_client()

app = FastAPI(
    title="Telegram Automation Platform API",
    version="1.0.0",
    lifespan=lifespan
)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(telegram_accounts.router, prefix="/api/v1/telegram-accounts", tags=["Telegram Accounts"])
app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["Tasks"])
app.include_router(templates.router, prefix="/api/v1/templates", tags=["Templates"])
app.include_router(off_days.router, prefix="/api/v1/off-days", tags=["Off Days"])
app.include_router(activity_logs.router, prefix="/api/v1/activity-logs", tags=["Activity Logs"])

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
