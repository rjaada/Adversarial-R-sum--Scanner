"""
Save and retrieve scan results from Postgres.
All functions accept a live asyncpg pool; callers skip when pool is None.
"""
from __future__ import annotations
import json

import asyncpg

from app.schemas import ScanResult, ScanSummary


async def save_scan(pool: asyncpg.Pool, result: ScanResult) -> None:
    result_dict = result.model_dump()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO scans (id, source_id, overall_score, result_json)
            VALUES ($1, $2, $3, $4::jsonb)
            ON CONFLICT (id) DO NOTHING
            """,
            result.scan_id,
            result.source_id,
            result.scores.overall,
            json.dumps(result_dict),
        )
        if result.issues:
            await conn.executemany(
                """
                INSERT INTO scan_issues
                  (scan_id, issue_type, severity, title, description,
                   source_excerpt, suggested_fix, impact_score)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """,
                [
                    (
                        result.scan_id,
                        issue.issue_type,
                        issue.severity,
                        issue.title,
                        issue.description,
                        issue.source_excerpt,
                        issue.suggested_fix,
                        issue.impact_score,
                    )
                    for issue in result.issues
                ],
            )


async def get_recent_scans(pool: asyncpg.Pool, limit: int = 20) -> list[ScanSummary]:
    rows = await pool.fetch(
        """
        SELECT id, source_id, scanned_at, overall_score
        FROM scans
        ORDER BY scanned_at DESC
        LIMIT $1
        """,
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


async def get_scan_by_id(pool: asyncpg.Pool, scan_id: str) -> ScanResult | None:
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
