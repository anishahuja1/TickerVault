"""
TickerVault — Async Database Layer.

Uses SQLAlchemy 2.0 async engine.
  • Local dev:  aiosqlite  (sqlite+aiosqlite://...)
  • Production: asyncpg    (postgresql+asyncpg://...)
Auto-detects from DATABASE_URL.
"""

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

import os
from .config import get_settings

settings = get_settings()

# Convert standard postgresql:// to async driver format
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)

# Remove pgbouncer param if present (asyncpg handles pooling itself)
if "?pgbouncer=true" in db_url:
    db_url = db_url.replace("?pgbouncer=true", "")

# Prepare engine arguments
engine_kwargs = {
    "echo": False,
    "pool_pre_ping": True,
    "pool_recycle": 300,
}

# Only add pool_size/max_overflow for pooling-capable drivers (not SQLite)
if not db_url.startswith("sqlite"):
    engine_kwargs["pool_size"] = 5
    engine_kwargs["max_overflow"] = 10

# Only add server_settings for PostgreSQL/asyncpg
if "postgresql" in db_url or "postgres" in db_url:
    engine_kwargs["connect_args"] = {
        "server_settings": {
            "application_name": "tickervault"
        }
    }

engine = create_async_engine(db_url, **engine_kwargs)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


async def init_db() -> None:
    """Create all database tables on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Dispose the engine on shutdown."""
    await engine.dispose()
