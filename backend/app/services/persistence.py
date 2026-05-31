"""
Save and retrieve scan results from Postgres.

Privacy decisions — documented here so future contributors understand the intent:

- `ats_text_preview` IS stored, but only after PII regex scrubbing (email, phone,
  LinkedIn/GitHub URLs, US address patterns). This field enables the "What ATS sees"
  panel in historical scan views. Storing it is intentional and disclosed in /privacy.
  Never store it without calling scrub_pii() first.

- `resume_sections` is NEVER stored — it contains the full parsed résumé content
  organized by section. Stripping it is a hard privacy requirement.

- `source_excerpt`, `evidence`, `rewrite_starter` are stripped from issues before
  storage because they may contain verbatim résumé text.

- Raw PDF/DOCX, raw résumé text, and raw JD text are never stored anywhere.
"""
from __future__ import annotations

import hashlib
import json
import re
import copy
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

import asyncpg

from app.schemas import ScanResult, ScanSummary

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# PII scrubbing — applied to ats_text_preview before any storage
# ---------------------------------------------------------------------------

_PII_PATTERNS = [
    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b',
    r'\b(\+1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b',
    r'linkedin\.com/in/[A-Za-z0-9_-]+',
    r'github\.com/[A-Za-z0-9_-]+',
    r'\b\d{1,5}\s+[A-Za-z0-9\s.]+,\s+[A-Za-z\s]+,\s+[A-Z]{2}\s+\d{5}(-\d{4})?\b',
]


def scrub_pii(text: str) -> str:
    for pattern in _PII_PATTERNS:
        text = re.sub(pattern, '[redacted]', text, flags=re.IGNORECASE)
    return text


# ---------------------------------------------------------------------------
# Strip sensitive fields before storage
# ---------------------------------------------------------------------------

def _strip_for_storage(result: ScanResult) -> dict:
    """Return a dict safe to store — résumé content removed, PII scrubbed."""
    d = result.model_dump()

    # Never store full section content
    d.pop("resume_sections", None)

    # Never store raw JD requirements (only jd_text_hash is stored)
    d.pop("jd_requirements", None)

    # Strip text fields from issues that may contain verbatim résumé content
    for issue in d.get("issues", []):
        issue.pop("source_excerpt", None)
        issue.pop("evidence", None)
        issue.pop("rewrite_starter", None)

    # PII-scrub the ATS preview before storage
    if d.get("ats_text_preview"):
        d["ats_text_preview"] = scrub_pii(d["ats_text_preview"])

    return d


def _expires_at(plan: str) -> datetime:
    now = datetime.now(timezone.utc)
    if plan == "pro":
        return now + timedelta(days=365)
    elif plan == "free":
        return now + timedelta(days=90)
    else:
        # Guest / anonymous — short TTL
        return now + timedelta(days=1)


# ---------------------------------------------------------------------------
# User management
# ---------------------------------------------------------------------------

async def upsert_user(pool: asyncpg.Pool, clerk_user_id: str) -> None:
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO users (clerk_user_id)
            VALUES ($1)
            ON CONFLICT (clerk_user_id) DO NOTHING
            """,
            clerk_user_id,
        )


async def get_user_plan(pool: asyncpg.Pool, clerk_user_id: str) -> str:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT plan FROM users WHERE clerk_user_id = $1",
            clerk_user_id,
        )
    return row["plan"] if row else "free"


async def update_theme_pref(pool: asyncpg.Pool, clerk_user_id: str, theme: str) -> None:
    async with pool.acquire() as conn:
        await conn.execute(
            """
            UPDATE users SET theme_pref = $2 WHERE clerk_user_id = $1
            """,
            clerk_user_id,
            theme,
        )


# ---------------------------------------------------------------------------
# Scan storage
# ---------------------------------------------------------------------------

async def save_scan(
    pool: asyncpg.Pool,
    result: ScanResult,
    user_id: Optional[str] = None,
    jd_text: str = "",
    plan: str = "free",
) -> None:
    stripped = _strip_for_storage(result)
    jd_hash = hashlib.sha256(jd_text.encode()).hexdigest() if jd_text else None
    exp = _expires_at(plan if user_id else "guest")

    scores = result.scores
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO scans (
              id, user_id, source_id, overall_score,
              keyword_match, experience_alignment, parse_integrity_score,
              structure_score, quantified_impact,
              jd_text_hash, expires_at, result_json
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
            ON CONFLICT (id) DO NOTHING
            """,
            result.scan_id,
            user_id,
            result.source_id,
            scores.overall,
            scores.keyword_match,
            scores.experience_alignment,
            scores.parse_integrity,
            scores.structure,
            scores.quantified_impact,
            jd_hash,
            exp,
            json.dumps(stripped),
        )
        if result.issues:
            await conn.executemany(
                """
                INSERT INTO scan_issues
                  (scan_id, issue_type, severity, title, description, suggested_fix, impact_score)
                VALUES ($1,$2,$3,$4,$5,$6,$7)
                """,
                [
                    (
                        result.scan_id,
                        issue.issue_type,
                        issue.severity,
                        issue.title,
                        issue.description,
                        issue.suggested_fix,
                        issue.impact_score,
                    )
                    for issue in result.issues
                ],
            )


# ---------------------------------------------------------------------------
# Scan retrieval — always user-scoped
# ---------------------------------------------------------------------------

async def get_recent_scans(
    pool: asyncpg.Pool,
    user_id: str,
    limit: int = 50,
) -> list[ScanSummary]:
    rows = await pool.fetch(
        """
        SELECT id, source_id, scanned_at, overall_score
        FROM scans
        WHERE user_id = $1
        ORDER BY scanned_at DESC
        LIMIT $2
        """,
        user_id,
        limit,
    )
    return [
        ScanSummary(
            scan_id=str(row["id"]),
            source_id=row["source_id"],
            scanned_at=row["scanned_at"].isoformat(),
            overall_score=float(row["overall_score"]),
        )
        for row in rows
    ]


async def get_scan_by_id(
    pool: asyncpg.Pool,
    scan_id: str,
    user_id: Optional[str] = None,
) -> Optional[ScanResult]:
    """Return a scan by ID. If user_id is provided, enforces ownership."""
    if user_id:
        row = await pool.fetchrow(
            "SELECT result_json FROM scans WHERE id = $1 AND user_id = $2",
            scan_id,
            user_id,
        )
    else:
        row = await pool.fetchrow(
            "SELECT result_json FROM scans WHERE id = $1",
            scan_id,
        )
    if row is None:
        return None
    data = row["result_json"]
    if isinstance(data, str):
        data = json.loads(data)
    return ScanResult.model_validate(data)


async def delete_scan(pool: asyncpg.Pool, scan_id: str, user_id: str) -> bool:
    result = await pool.execute(
        "DELETE FROM scans WHERE id = $1 AND user_id = $2",
        scan_id,
        user_id,
    )
    return result == "DELETE 1"


async def delete_all_user_scans(pool: asyncpg.Pool, user_id: str) -> int:
    result = await pool.execute(
        "DELETE FROM scans WHERE user_id = $1",
        user_id,
    )
    return int(result.split()[-1])


async def get_all_scan_summaries(pool: asyncpg.Pool, user_id: str) -> list[ScanSummary]:
    return await get_recent_scans(pool, user_id, limit=10_000)


# ---------------------------------------------------------------------------
# Account deletion
# ---------------------------------------------------------------------------

async def delete_user_account(pool: asyncpg.Pool, user_id: str) -> None:
    """Mark all scans for immediate expiry then delete the user row."""
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE scans SET expires_at = NOW() WHERE user_id = $1",
            user_id,
        )
        await conn.execute(
            "DELETE FROM users WHERE clerk_user_id = $1",
            user_id,
        )


# ---------------------------------------------------------------------------
# Retention purge — called by cron endpoint
# ---------------------------------------------------------------------------

async def purge_expired_scans(pool: asyncpg.Pool) -> int:
    result = await pool.execute(
        "DELETE FROM scans WHERE expires_at IS NOT NULL AND expires_at < NOW()"
    )
    return int(result.split()[-1])


# ---------------------------------------------------------------------------
# Waitlist
# ---------------------------------------------------------------------------

async def add_to_waitlist(pool: asyncpg.Pool, email: str) -> bool:
    """Insert email into waitlist. Returns False if already present."""
    try:
        await pool.execute(
            "INSERT INTO waitlist (email) VALUES ($1) ON CONFLICT (email) DO NOTHING",
            email.lower().strip(),
        )
        return True
    except Exception as exc:
        log.warning("Waitlist insert failed: %s", exc)
        return False
