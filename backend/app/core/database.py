"""
Database connection and session handling.
Supports async PostgreSQL (Supabase) with automatic fallback for testing.
"""

import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

# Normalize database URL for SQLAlchemy 2+ async drivers
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Handle asyncpg SSL and query parameters
if "asyncpg" in db_url:
    if "sslmode=" in db_url:
        db_url = db_url.replace("sslmode=", "ssl=")
    if "channel_binding=" in db_url:
        import re
        db_url = re.sub(r'[?&]channel_binding=[^&]+', '', db_url)
        if '?' not in db_url and '&' in db_url:
            db_url = db_url.replace('&', '?', 1)

# Detect serverless environment (Vercel / Lambda)
is_serverless = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))

# Configure async engine
# Supports SQLite (aiosqlite) or PostgreSQL (asyncpg / Supabase / Neon)
if "sqlite" in db_url:
    # Ensure parent directory exists for SQLite
    clean_path = db_url.split("sqlite+aiosqlite:///")[-1]
    if clean_path and not clean_path.startswith(":memory:"):
        db_dir = os.path.dirname(clean_path)
        if db_dir and not os.path.exists(db_dir):
            try:
                os.makedirs(db_dir, exist_ok=True)
            except Exception:
                pass
    engine = create_async_engine(
        db_url,
        echo=False,
        future=True,
        connect_args={"check_same_thread": False}
    )
else:
    connect_args = {}
    if "asyncpg" in db_url:
        connect_args["statement_cache_size"] = 0

    if is_serverless:
        from sqlalchemy.pool import NullPool
        engine = create_async_engine(
            db_url,
            echo=False,
            future=True,
            poolclass=NullPool,
            connect_args=connect_args
        )
    else:
        engine = create_async_engine(
            db_url,
            echo=False,
            future=True,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=5,
            pool_recycle=300,
            pool_timeout=15,
            connect_args=connect_args
        )

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for obtaining an asynchronous DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
