"""App configuration, read from environment / .env.

The only value you change to point at Cloud SQL instead of local Docker is
DATABASE_URL — everything else stays the same.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql+psycopg://appuser:130976@localhost:5432/taskmgmt"

    # Auth
    jwt_secret: str = "SIGgfCwTk9eolxHvkMv19ztxcCIOaTm8"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 240

    # Seeded manager account (the single manager, per the scope)
    manager_email: str = "manager@demo.com"
    manager_password: str = "manager123"
    manager_name: str = "Team Manager"

    # Optional Google Tasks integration (leave empty to disable)
    gtasks_url: str = ""
    gtasks_api_key: str = ""


settings = Settings()
