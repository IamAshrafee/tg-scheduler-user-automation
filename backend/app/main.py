import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.middleware.rate_limiter import limiter
from app.routes import auth, telegram_accounts, tasks, templates, off_days, activity_logs, admin
from app.services.user_service import user_service
from app.services.telegram_account_service import telegram_account_service
from app.services.telegram_client_manager import telegram_client_manager
from app.services.task_service import task_service
from app.services.activity_log_service import activity_log_service
from app.services.scheduler_engine import scheduler_engine

settings = get_settings()
logger = logging.getLogger(__name__)

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
    lifespan=lifespan,
    # Hide docs in production
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# ─── Rate Limiter ───
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── CORS ───
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# ─── Global Exception Handler ───
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch-all handler: masks stack traces in production.
    In debug mode, returns the full exception detail.
    """
    logger.exception("Unhandled exception: %s", exc)
    if settings.DEBUG:
        return JSONResponse(
            status_code=500,
            content={"error": {"code": "INTERNAL_ERROR", "message": str(exc)}},
        )
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred."}},
    )

# ─── Routes ───
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(telegram_accounts.router, prefix="/api/v1/telegram-accounts", tags=["Telegram Accounts"])
app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["Tasks"])
app.include_router(templates.router, prefix="/api/v1/templates", tags=["Templates"])
app.include_router(off_days.router, prefix="/api/v1/off-days", tags=["Off Days"])
app.include_router(activity_logs.router, prefix="/api/v1/activity-logs", tags=["Activity Logs"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])

@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "ok", 
        "version": "1.0.0",
        "mode": "debug" if settings.DEBUG else "production"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=settings.DEBUG)
