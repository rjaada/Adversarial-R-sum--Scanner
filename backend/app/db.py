"""
asyncpg connection pool. Pool stays None when DATABASE_URL is unset OR
when the DB is temporarily unreachable at startup — all persistence calls
degrade gracefully to no-ops in both cases.

On every successful pool creation the schema is reconciled idempotently
(CREATE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS). The deployed database
had drifted from schema.sql — the users table was missing entirely, which
silently broke every signed-in write (history, claim, account) — and there
is no migration runner in the deploy pipeline to prevent a repeat.
"""
from __future__ import annotations
import logging
import os
from pathlib import Path

import asyncpg

log = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None

# Repairs for older live databases where CREATE TABLE IF NOT EXISTS is a
# no-op but Phase-1 columns are missing.
_DRIFT_REPAIRS = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_pref TEXT",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS bench_opt_in BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE scans ADD COLUMN IF NOT EXISTS user_id TEXT",
    "ALTER TABLE scans ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ",
    "ALTER TABLE scans ADD COLUMN IF NOT EXISTS jd_text_hash TEXT",
    "ALTER TABLE scans ADD COLUMN IF NOT EXISTS keyword_match FLOAT",
    "ALTER TABLE scans ADD COLUMN IF NOT EXISTS experience_alignment FLOAT",
    "ALTER TABLE scans ADD COLUMN IF NOT EXISTS parse_integrity_score FLOAT",
    "ALTER TABLE scans ADD COLUMN IF NOT EXISTS structure_score FLOAT",
    "ALTER TABLE scans ADD COLUMN IF NOT EXISTS quantified_impact FLOAT",
]


async def ensure_schema(pool: asyncpg.Pool) -> None:
    """Apply schema.sql plus drift repairs. Every statement is idempotent;
    failures are logged and never block startup."""
    schema_path = Path(__file__).resolve().parent.parent / "schema.sql"
    try:
        # Statement-by-statement: a multi-statement execute runs in one
        # implicit transaction, where a single failure rolls back the rest.
        schema_stmts = [s.strip() for s in schema_path.read_text(encoding="utf-8").split(";") if s.strip()]
    except Exception as exc:
        log.warning("schema.sql unreadable, applying drift repairs only: %s", exc)
        schema_stmts = []
    async with pool.acquire() as conn:
        for stmt in schema_stmts + _DRIFT_REPAIRS:
            try:
                await conn.execute(stmt)
            except Exception as exc:
                log.warning("schema statement failed (%s…): %s", stmt[:48], exc)
    log.info("Schema reconciled")


async def init_pool() -> None:
    global _pool
    url = os.getenv("DATABASE_URL")
    if not url:
        log.info("DATABASE_URL not set — running without persistence")
        return
    try:
        _pool = await asyncpg.create_pool(url, min_size=1, max_size=5)
        log.info("Database pool established")
        await ensure_schema(_pool)
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
        await ensure_schema(_pool)
    except Exception as exc:
        log.warning("Lazy DB init failed: %s", exc)
        _pool = None
    return _pool
