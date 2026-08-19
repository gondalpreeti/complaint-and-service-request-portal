"""
Database connection pool for the Complaint & Service Request Portal.

Uses asyncpg directly (no ORM) since dashboard endpoints rely on hand-written
SQL aggregation queries. If Team 1/2 introduce an ORM (e.g. SQLAlchemy) for
CRUD-heavy modules, this file is the only one that needs to change -
routers/services below only depend on `get_db`.
"""
from dotenv import load_dotenv
load_dotenv()
import os
import asyncpg
from typing import AsyncGenerator

DATABASE_URL = os.environ["DATABASE_URL"]  # e.g. postgresql://user:pass@host:5432/dbname

_pool: asyncpg.Pool | None = None


async def connect_db() -> None:
    """Call once on FastAPI startup."""
    global _pool
    _pool = await asyncpg.create_pool(
        dsn=DATABASE_URL,
        min_size=2,
        max_size=10,
    )


async def disconnect_db() -> None:
    """Call once on FastAPI shutdown."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


async def get_db() -> AsyncGenerator[asyncpg.Connection, None]:
    """FastAPI dependency that yields a pooled connection."""
    if _pool is None:
        raise RuntimeError("Database pool not initialized - was connect_db() called on startup?")
    async with _pool.acquire() as connection:
        yield connection

async def get_pool() -> asyncpg.Pool:
    """Return the initialized pool for code that needs separate connections."""
    if _pool is None:
        raise RuntimeError("Database pool not initialized - was connect_db() called on startup?")
    return _pool