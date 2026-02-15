from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    # App
    PORT: int = 8000
    DEBUG: bool = False
    
    # Database
    MONGO_URI: str
    DB_NAME: str = "telegram_automation"
    
    # Security
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ENCRYPTION_KEY: str

    # Telegram
    TELEGRAM_API_ID: int
    TELEGRAM_API_HASH: str
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    
    # Admin
    ADMIN_EMAIL: str = "admin@example.com"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

@lru_cache
def get_settings():
    return Settings()
