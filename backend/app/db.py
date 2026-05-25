"""
asyncpg connection pool. Pool stays None when DATABASE_URL is unset OR
when the DB is temporarily unreachable at startup — all persistence calls
degrade gracefully to no-ops in both cases.
"""
from __future__ import annotations
import logging
import os

import asyncpg

log = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None


async def init_pool() -> None:
    global _pool
    url = os.getenv("DATABASE_URL")
    if not url:
        log.info("DATABASE_URL not set — running without persistence")
        return
    try:
        _pool = await asyncpg.create_pool(url, min_size=1, max_size=5)
        log.info("Database pool established")
    except Exception as exc:
        log.warning("Database unavailable at startup (will retry on first request): %s", exc)
        _pool = None


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool | None:
    return _pool


async def get_or_init_pool() -> asyncpg.Pool | None:
    """Return pool, attempting a lazy init if startup connection failed."""
    global _pool
    if _pool is not None:
        return _pool
    url = os.getenv("DATABASE_URL")
    if not url:
        return None
    try:
        _pool = await asyncpg.create_pool(url, min_size=1, max_size=5)
        log.info("Database pool established (lazy init)")
    except Exception as exc:
        log.warning("Lazy DB init failed: %s", exc)
        _pool = None
    return _pool
