"""
DB integration tests — require a live PostgreSQL instance.

    export DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
    pytest backend/test_db_integration.py -m integration -v

Tables must exist before running. Apply adversarial_scanner_schema.sql first:
    psql $DATABASE_URL -f backend/adversarial_scanner_schema.sql
"""

import asyncio
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import asyncpg
import pytest

from adversarial_scanner import (
    _build_alert_payload,
    _has_prior_injection_alert,
    _snapshot_trust,
    _upsert_alert,
)

pytestmark = pytest.mark.integration

DATABASE_URL = os.getenv("DATABASE_URL", "")

SOURCE_ID = "test_integration_src"
SOURCE_LABEL = "Integration Test Source"


def _run(coro):
    return asyncio.run(coro)


def _skip_if_no_db():
    if not DATABASE_URL:
        pytest.skip("DATABASE_URL not set")


async def _get_conn() -> asyncpg.Connection:
    return await asyncpg.connect(DATABASE_URL)


async def _cleanup(conn: asyncpg.Connection) -> None:
    await conn.execute(
        "DELETE FROM adversarial_source_alerts WHERE source_id = $1", SOURCE_ID
    )
    await conn.execute(
        "DELETE FROM source_trust_history WHERE source_id = $1", SOURCE_ID
    )


# ---------------------------------------------------------------------------
# A. Snapshot upsert — hourly dedupe
# ---------------------------------------------------------------------------


def test_snapshot_upsert_creates_row():
    _skip_if_no_db()

    async def run():
        conn = await _get_conn()
        try:
            await _cleanup(conn)
            events = [
                {
                    "acled_event_type": "Protests::Peaceful protest",
                    "timestamp": datetime.now(tz=timezone.utc).isoformat(),
                    "corroborated": True,
                    "impact_score": 0.3,
                }
            ]
            scan_result = {
                "signature_details": {"TRUST_PUMPING": {"trust_velocity_7d": 0.05}}
            }
            await _snapshot_trust(conn, SOURCE_ID, SOURCE_LABEL, 0.62, events, scan_result)

            row = await conn.fetchrow(
                "SELECT reliability_score FROM source_trust_history WHERE source_id = $1",
                SOURCE_ID,
            )
            assert row is not None
            assert abs(row["reliability_score"] - 0.62) < 1e-6
        finally:
            await _cleanup(conn)
            await conn.close()

    _run(run())


def test_snapshot_upsert_dedupes_within_same_hour():
    _skip_if_no_db()

    async def run():
        conn = await _get_conn()
        try:
            await _cleanup(conn)
            events = [
                {
                    "acled_event_type": "Protests::Peaceful protest",
                    "timestamp": datetime.now(tz=timezone.utc).isoformat(),
                    "corroborated": False,
                    "impact_score": 0.4,
                }
            ]
            scan_result = {
                "signature_details": {"TRUST_PUMPING": {"trust_velocity_7d": 0.0}}
            }
            # Insert twice in the same hour — should remain 1 row, updated score.
            await _snapshot_trust(conn, SOURCE_ID, SOURCE_LABEL, 0.60, events, scan_result)
            await _snapshot_trust(conn, SOURCE_ID, SOURCE_LABEL, 0.70, events, scan_result)

            count = await conn.fetchval(
                "SELECT COUNT(*) FROM source_trust_history WHERE source_id = $1",
                SOURCE_ID,
            )
            assert count == 1

            score = await conn.fetchval(
                "SELECT reliability_score FROM source_trust_history WHERE source_id = $1",
                SOURCE_ID,
            )
            assert abs(score - 0.70) < 1e-6  # latest wins
        finally:
            await _cleanup(conn)
            await conn.close()

    _run(run())


# ---------------------------------------------------------------------------
# B. Prior injection lookup
# ---------------------------------------------------------------------------


def test_prior_injection_returns_false_when_no_alerts():
    _skip_if_no_db()

    async def run():
        conn = await _get_conn()
        try:
            await _cleanup(conn)
            result = await _has_prior_injection_alert(conn, SOURCE_ID)
            assert result is False
        finally:
            await conn.close()

    _run(run())


def test_prior_injection_returns_true_after_alert_inserted():
    _skip_if_no_db()

    async def run():
        conn = await _get_conn()
        try:
            await _cleanup(conn)
            scan_result = {
                "adversarial_risk_score": 0.60,
                "risk_level": "SUSPECT",
                "active_signatures": ["HIGH_IMPACT_INJECTION"],
                "signature_details": {"CORROBORATION_DESERT": {}, "TRUST_PUMPING": {}},
            }
            await _upsert_alert(
                conn,
                source_id=SOURCE_ID,
                source_label=SOURCE_LABEL,
                source_reliability_score=0.78,
                result=scan_result,
                trust_velocity_7d=0.19,
                low_impact_buildup=0.82,
                injection_event_id="evt_test_001",
            )

            result = await _has_prior_injection_alert(conn, SOURCE_ID)
            assert result is True
        finally:
            await _cleanup(conn)
            await conn.close()

    _run(run())


def test_prior_injection_returns_false_when_resolved():
    _skip_if_no_db()

    async def run():
        conn = await _get_conn()
        try:
            await _cleanup(conn)
            scan_result = {
                "adversarial_risk_score": 0.60,
                "risk_level": "SUSPECT",
                "active_signatures": ["HIGH_IMPACT_INJECTION"],
                "signature_details": {"CORROBORATION_DESERT": {}, "TRUST_PUMPING": {}},
            }
            await _upsert_alert(
                conn,
                source_id=SOURCE_ID,
                source_label=SOURCE_LABEL,
                source_reliability_score=0.78,
                result=scan_result,
                trust_velocity_7d=0.19,
                low_impact_buildup=0.82,
                injection_event_id="evt_test_002",
            )
            # Mark resolved.
            await conn.execute(
                "UPDATE adversarial_source_alerts SET resolved = TRUE WHERE source_id = $1",
                SOURCE_ID,
            )

            result = await _has_prior_injection_alert(conn, SOURCE_ID)
            assert result is False
        finally:
            await _cleanup(conn)
            await conn.close()

    _run(run())


# ---------------------------------------------------------------------------
# C. Alert upsert — trust_score_at_alert stores reliability, not risk score
# ---------------------------------------------------------------------------


def test_alert_upsert_stores_reliability_score():
    _skip_if_no_db()

    async def run():
        conn = await _get_conn()
        try:
            await _cleanup(conn)
            scan_result = {
                "adversarial_risk_score": 0.35,
                "risk_level": "WATCH",
                "active_signatures": ["TRUST_PUMPING", "NARRATIVE_ISOLATION"],
                "signature_details": {"CORROBORATION_DESERT": {}, "TRUST_PUMPING": {}},
            }
            reliability_score = 0.81  # distinct from risk score 0.35

            await _upsert_alert(
                conn,
                source_id=SOURCE_ID,
                source_label=SOURCE_LABEL,
                source_reliability_score=reliability_score,
                result=scan_result,
                trust_velocity_7d=0.17,
                low_impact_buildup=0.75,
                injection_event_id=None,
            )

            row = await conn.fetchrow(
                "SELECT trust_score_at_alert, payload_json FROM adversarial_source_alerts WHERE source_id = $1",
                SOURCE_ID,
            )
            assert row is not None
            # Column stores reliability
            assert abs(row["trust_score_at_alert"] - reliability_score) < 1e-6

            payload = json.loads(row["payload_json"])
            # Payload trust_score_at_alert = reliability
            assert abs(payload["trust_score_at_alert"] - reliability_score) < 1e-6
            # Payload adversarial_risk_score = composite risk score, distinct
            assert abs(payload["adversarial_risk_score"] - 0.35) < 1e-6
            assert payload["trust_score_at_alert"] != payload["adversarial_risk_score"]
        finally:
            await _cleanup(conn)
            await conn.close()

    _run(run())
