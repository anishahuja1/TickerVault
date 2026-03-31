"""
TickerVault — Application Configuration.

Uses pydantic-settings to load configuration from environment variables
and .env file. All settings have sensible defaults for development.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ── Database ──────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite+aiosqlite:///./tickervault.db"

    # ── JWT Authentication ────────────────────────────────────────────────
    SECRET_KEY: str = "change-me-in-production-use-a-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # ── External APIs ─────────────────────────────────────────────────────
    FINNHUB_API_KEY: str = ""

    # ── CORS ──────────────────────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:5173,http://localhost:5174"

    @property
    def CORS_ORIGINS(self) -> list[str]:
        # Support multiple comma-separated URLs from FRONTEND_URL
        return [o.strip() for o in self.FRONTEND_URL.split(",") if o.strip()]

    # ── Application ───────────────────────────────────────────────────────
    APP_NAME: str = "TickerVault"
    APP_VERSION: str = "1.0.0"
    LOG_LEVEL: str = "INFO"

    # ── Rate Limits ───────────────────────────────────────────────────────
    MAX_WATCHLIST_ITEMS: int = 50
    MAX_ALERTS_PER_USER: int = 20
    MAX_PORTFOLIO_TRANSACTIONS: int = 500

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton — reads .env once on first call."""
    return Settings()
