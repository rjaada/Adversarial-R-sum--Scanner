"""
Adversarial Résumé Scanner

Detects sources that game Bayesian reliability weight systems by building
a credible history of accurate low-stakes reports (their adversarial "résumé")
before injecting high-impact disinformation at peak trust. Five named
adversarial signatures are scored into a composite adversarial risk score.

Public API:
    scan_source_for_adversarial_signatures()  — pure function, no I/O, fully testable
    adversarial_resume_scan()                 — async DB wrapper for pipeline integration
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    import asyncpg

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Top-level ACLED event families — matched against top-level only (before "::").
HIGH_IMPACT_FAMILIES = frozenset(
    ["Battles", "Explosions/Remote violence", "Violence against civilians"]
)

# Exact ACLED subtype strings for low-impact classification.
LOW_IMPACT_EVENT_TYPES = frozenset(
    [
        "Strategic developments::Agreement",
        "Protests::Peaceful protest",
        "Strategic developments::Other",
    ]
)

SIGNATURE_WEIGHTS: dict[str, float] = {
    "TRUST_PUMPING": 0.25,
    "HIGH_IMPACT_INJECTION": 0.35,
    "CORROBORATION_DESERT": 0.20,
    "NARRATIVE_ISOLATION": 0.15,
    "POST_INJECTION_DORMANCY": 0.05,
}

# Risk thresholds — TRUST_PUMPING alone (0.25) is below WATCH (0.35) → CLEAN.
WATCH_THRESHOLD = 0.35
SUSPECT_THRESHOLD = 0.60
QUARANTINE_THRESHOLD = 0.80

# Minimum sample guards (cold-start protection)
MIN_EVENTS_30D = 15
MIN_HIGH_IMPACT_FOR_CORR_SPLIT = 3


# ---------------------------------------------------------------------------
# Core scanner — pure function, no I/O
# ---------------------------------------------------------------------------


def scan_source_for_adversarial_signatures(
    source_id: str,
    trust_history: list[dict],       # [{snapshot_time, reliability_score, ...}]
    recent_events: list[dict],        # last 30d events from this source
    cluster_data: list[dict],         # current disinfo clusters from disinfo_detector
    prior_injection_detected: bool = False,  # True if source has unresolved HIGH_IMPACT_INJECTION alert
) -> dict:
    """
    Returns:
    {
        "source_id": str,
        "active_signatures": list[str],
        "adversarial_risk_score": float,
        "risk_level": str,          # CLEAN / WATCH / SUSPECT / QUARANTINE
        "signature_details": dict,  # per-sig computed values
    }
    """
    active: list[str] = []
    details: dict[str, Any] = {}

    total_events_30d = len(recent_events)
    if total_events_30d < MIN_EVENTS_30D:
        return _clean_result(source_id, details, note="insufficient_history")

    now = datetime.now(tz=timezone.utc)

    # -----------------------------------------------------------------------
    # Pre-compute shared metrics
    # -----------------------------------------------------------------------

    high_impact_events = [e for e in recent_events if _is_high_impact(e)]
    low_impact_events = [e for e in recent_events if _is_low_impact(e)]

    total_high = len(high_impact_events)
    total_low = len(low_impact_events)

    # 7-day window
    events_7d = [e for e in recent_events if _age_hours(e, now) <= 168]
    high_7d = [e for e in events_7d if _is_high_impact(e)]
    low_7d = [e for e in events_7d if _is_low_impact(e)]
    total_7d = len(events_7d)

    current_reliability = _current_reliability(trust_history)
    reliability_7d_ago = _reliability_at_offset_days(trust_history, 7)
    # Exclude the last (current) snapshot so the peak comparison is against prior history only.
    prior_max_reliability = _max_prior_reliability(trust_history)

    # -----------------------------------------------------------------------
    # Signature 1 — Trust Pumping
    # -----------------------------------------------------------------------

    trust_velocity_7d = current_reliability - reliability_7d_ago
    low_impact_share_7d = len(low_7d) / max(total_7d, 1)

    sig1_details = {
        "trust_velocity_7d": round(trust_velocity_7d, 4),
        "low_impact_share_7d": round(low_impact_share_7d, 4),
        "total_7d": total_7d,
    }
    details["TRUST_PUMPING"] = sig1_details

    if trust_velocity_7d > 0.15 and low_impact_share_7d > 0.70:
        active.append("TRUST_PUMPING")

    # -----------------------------------------------------------------------
    # Signature 2 — High-Impact Injection After Trust Peak
    # -----------------------------------------------------------------------

    # Skip on the very first high-impact report (new-peak condition trivially true at baseline).
    is_first_high_impact = total_high == 1 and len(high_7d) == 1
    # Compare current score against prior history only — excludes current snapshot.
    is_new_trust_peak = current_reliability > prior_max_reliability

    injection_event = None
    if is_new_trust_peak and not is_first_high_impact and high_7d:
        for e in high_7d:
            if _age_hours(e, now) <= 48:
                injection_event = e
                break

    sig2_details = {
        "is_new_trust_peak": is_new_trust_peak,
        "current_reliability": round(current_reliability, 4),
        "prior_max_reliability": round(prior_max_reliability, 4),
        "injection_event_id": injection_event.get("event_id") if injection_event else None,
    }
    details["HIGH_IMPACT_INJECTION"] = sig2_details

    if injection_event:
        active.append("HIGH_IMPACT_INJECTION")

    # -----------------------------------------------------------------------
    # Signature 3 — Corroboration Desert
    # -----------------------------------------------------------------------

    skip_corr_desert = total_high < MIN_HIGH_IMPACT_FOR_CORR_SPLIT

    if not skip_corr_desert:
        corr_low = sum(1 for e in low_impact_events if e.get("corroborated"))
        corr_high = sum(1 for e in high_impact_events if e.get("corroborated"))

        low_corr_rate = corr_low / max(total_low, 1)
        high_corr_rate = corr_high / max(total_high, 1)
        corr_split = low_corr_rate - high_corr_rate

        sig3_details = {
            "low_corr_rate": round(low_corr_rate, 4),
            "high_corr_rate": round(high_corr_rate, 4),
            "corr_split": round(corr_split, 4),
            "total_high": total_high,
            "total_low": total_low,
        }
        details["CORROBORATION_DESERT"] = sig3_details

        if corr_split > 0.50:
            active.append("CORROBORATION_DESERT")
    else:
        details["CORROBORATION_DESERT"] = {"skipped": "insufficient_high_impact_events"}

    # -----------------------------------------------------------------------
    # Signature 4 — Narrative Isolation
    # -----------------------------------------------------------------------

    source_cluster_size, propagation_count = _cluster_stats(source_id, cluster_data)
    is_isolated = source_cluster_size == 1 and propagation_count == 0

    sig4_details = {
        "cluster_size": source_cluster_size,
        "propagation_count": propagation_count,
        "trust_score": round(current_reliability, 4),
        "has_high_impact": total_high > 0,
    }
    details["NARRATIVE_ISOLATION"] = sig4_details

    if is_isolated and total_high > 0 and current_reliability > 0.65:
        active.append("NARRATIVE_ISOLATION")

    # -----------------------------------------------------------------------
    # Signature 5 — Sudden Dormancy After Injection
    #
    # Uses prior_injection_detected (persisted alert history), not same-scan
    # coincidence. The DB wrapper queries prior alerts and passes the flag in.
    # -----------------------------------------------------------------------

    last_event_hours_ago = _hours_since_last_event(recent_events, now)

    sig5_details = {
        "hours_since_last_report": round(last_event_hours_ago, 1),
        "prior_injection_detected": prior_injection_detected,
    }
    details["POST_INJECTION_DORMANCY"] = sig5_details

    if last_event_hours_ago > 72 and prior_injection_detected:
        active.append("POST_INJECTION_DORMANCY")

    # -----------------------------------------------------------------------
    # Composite score + risk level
    # -----------------------------------------------------------------------

    score = round(min(sum(SIGNATURE_WEIGHTS[sig] for sig in active), 1.0), 4)

    if score >= QUARANTINE_THRESHOLD:
        risk_level = "QUARANTINE"
    elif score >= SUSPECT_THRESHOLD:
        risk_level = "SUSPECT"
    elif score >= WATCH_THRESHOLD:
        risk_level = "WATCH"
    else:
        risk_level = "CLEAN"

    return {
        "source_id": source_id,
        "active_signatures": active,
        "adversarial_risk_score": score,
        "risk_level": risk_level,
        "signature_details": details,
    }


# ---------------------------------------------------------------------------
# DB persistence + alert creation
# ---------------------------------------------------------------------------


async def adversarial_resume_scan(
    source_id: str,
    source_label: str,
    updated_score: float,
    recent_events: list[dict],
    cluster_data: list[dict],
    database_url: str,
    conn: asyncpg.Connection | None = None,
) -> dict:
    """
    DB wrapper. Call after update_source_reliability() resolves.

    Loads trust history and prior-injection state from Postgres, runs the pure
    scanner, persists an hourly trust snapshot, and writes an alert row if any
    signatures are active. On QUARANTINE, calls _quarantine_source() which is
    an integration hook — it logs a warning but does not write to a host sources
    table unless you implement the commented UPDATE in _quarantine_source().
    """
    import asyncpg as _asyncpg  # noqa: PLC0415 — deferred so module loads without asyncpg installed

    own_conn = conn is None
    if own_conn:
        conn = await _asyncpg.connect(database_url)

    try:
        trust_history = await _load_trust_history(conn, source_id, days=30)
        prior_injection = await _has_prior_injection_alert(conn, source_id)

        result = scan_source_for_adversarial_signatures(
            source_id=source_id,
            trust_history=trust_history,
            recent_events=recent_events,
            cluster_data=cluster_data,
            prior_injection_detected=prior_injection,
        )

        await _snapshot_trust(conn, source_id, source_label, updated_score, recent_events, result)

        if result["active_signatures"]:
            injection_event_id = (
                result["signature_details"]
                .get("HIGH_IMPACT_INJECTION", {})
                .get("injection_event_id")
            )
            trust_velocity_7d = (
                result["signature_details"]
                .get("TRUST_PUMPING", {})
                .get("trust_velocity_7d", 0.0)
            )
            low_impact_buildup = (
                result["signature_details"]
                .get("TRUST_PUMPING", {})
                .get("low_impact_share_7d", 0.0)
            )
            await _upsert_alert(
                conn,
                source_id=source_id,
                source_label=source_label,
                source_reliability_score=updated_score,
                result=result,
                trust_velocity_7d=trust_velocity_7d,
                low_impact_buildup=low_impact_buildup,
                injection_event_id=injection_event_id,
            )

        if result["risk_level"] == "QUARANTINE":
            await _quarantine_source(conn, source_id, source_label)

        return result

    finally:
        if own_conn:
            await conn.close()


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------


async def _load_trust_history(
    conn: asyncpg.Connection, source_id: str, days: int
) -> list[dict]:
    rows = await conn.fetch(
        """
        SELECT snapshot_hour AS snapshot_time, reliability_score, corroboration_rate,
               avg_event_impact, report_count_7d, trust_velocity
        FROM source_trust_history
        WHERE source_id = $1
          AND snapshot_hour >= NOW() - make_interval(days => $2)
        ORDER BY snapshot_hour ASC
        """,
        source_id,
        days,
    )
    return [dict(r) for r in rows]


async def _has_prior_injection_alert(conn: asyncpg.Connection, source_id: str) -> bool:
    row = await conn.fetchrow(
        """
        SELECT 1 FROM adversarial_source_alerts
        WHERE source_id = $1
          AND high_impact_injection_detected = TRUE
          AND resolved = FALSE
        LIMIT 1
        """,
        source_id,
    )
    return row is not None


async def _snapshot_trust(
    conn: asyncpg.Connection,
    source_id: str,
    source_label: str,
    reliability_score: float,
    recent_events: list[dict],
    scan_result: dict,
) -> None:
    now = datetime.now(tz=timezone.utc)
    # Bucket to the current hour — prevents unbounded row growth on frequent scans.
    snapshot_hour = now.replace(minute=0, second=0, microsecond=0)

    total = len(recent_events)
    high = sum(1 for e in recent_events if _is_high_impact(e))
    low = sum(1 for e in recent_events if _is_low_impact(e))
    corr = sum(1 for e in recent_events if e.get("corroborated"))
    corr_rate = corr / max(total, 1)
    avg_impact = sum(e.get("impact_score", 0.5) for e in recent_events) / max(total, 1)
    trust_velocity = (
        scan_result["signature_details"]
        .get("TRUST_PUMPING", {})
        .get("trust_velocity_7d", 0.0)
    )

    await conn.execute(
        """
        INSERT INTO source_trust_history
            (source_id, source_label, snapshot_hour, reliability_score,
             corroboration_rate, avg_event_impact, report_count_7d,
             high_impact_share, low_impact_share, trust_velocity)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (source_id, snapshot_hour) DO UPDATE SET
            reliability_score  = EXCLUDED.reliability_score,
            corroboration_rate = EXCLUDED.corroboration_rate,
            avg_event_impact   = EXCLUDED.avg_event_impact,
            report_count_7d    = EXCLUDED.report_count_7d,
            high_impact_share  = EXCLUDED.high_impact_share,
            low_impact_share   = EXCLUDED.low_impact_share,
            trust_velocity     = EXCLUDED.trust_velocity
        """,
        source_id,
        source_label,
        snapshot_hour,
        reliability_score,
        corr_rate,
        avg_impact,
        total,
        high / max(total, 1),
        low / max(total, 1),
        trust_velocity,
    )


def _build_alert_payload(
    source_id: str,
    source_label: str,
    source_reliability_score: float,
    result: dict,
    trust_velocity_7d: float,
    low_impact_buildup: float,
    injection_event_id: str | None,
) -> dict:
    """Pure helper — builds alert payload dict. Testable without DB."""
    return {
        "alert_type": "adversarial_source",
        "source_id": source_id,
        "source_label": source_label,
        "trust_score_at_alert": source_reliability_score,   # actual source reliability
        "adversarial_risk_score": result["adversarial_risk_score"],  # composite risk score
        "risk_level": result["risk_level"],
        "active_signatures": result["active_signatures"],
        "trust_velocity_7d": trust_velocity_7d,
        "low_impact_buildup_rate": low_impact_buildup,
        "corroboration_split": (
            result["signature_details"]
            .get("CORROBORATION_DESERT", {})
            .get("corr_split", 0.0)
        ),
        "high_impact_injection_detected": "HIGH_IMPACT_INJECTION" in result["active_signatures"],
        "trigger_event_id": injection_event_id,
        "created_at": datetime.now(tz=timezone.utc).isoformat(),
        "recommended_action": _recommended_action(result["risk_level"]),
    }


async def _upsert_alert(
    conn: asyncpg.Connection,
    source_id: str,
    source_label: str,
    source_reliability_score: float,
    result: dict,
    trust_velocity_7d: float,
    low_impact_buildup: float,
    injection_event_id: str | None,
) -> None:
    payload = _build_alert_payload(
        source_id=source_id,
        source_label=source_label,
        source_reliability_score=source_reliability_score,
        result=result,
        trust_velocity_7d=trust_velocity_7d,
        low_impact_buildup=low_impact_buildup,
        injection_event_id=injection_event_id,
    )

    await conn.execute(
        """
        INSERT INTO adversarial_source_alerts
            (source_id, source_label, alert_type, trust_score_at_alert,
             trust_velocity_7d, low_impact_buildup_rate,
             high_impact_injection_detected, trigger_event_id, payload_json)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
        """,
        source_id,
        source_label,
        result["risk_level"],
        source_reliability_score,          # actual reliability score
        trust_velocity_7d,
        low_impact_buildup,
        "HIGH_IMPACT_INJECTION" in result["active_signatures"],
        injection_event_id,
        json.dumps(payload),
    )


async def _quarantine_source(
    conn: asyncpg.Connection,
    source_id: str,
    source_label: str,
) -> None:
    """
    Integration hook — demotes source reliability in the host system's sources table.

    This function is intentionally left as a template. The standalone repo schema
    does not define a `sources` table. In a full pipeline integration, adapt the
    UPDATE below to match your sources table schema before deploying.

    Until wired up, QUARANTINE risk level is still written to adversarial_source_alerts
    and logged as a warning — analyst review can act on that without this write path.
    """
    logger.warning(
        "QUARANTINE: source %s (%s) — update sources table to demote reliability. "
        "Implement _quarantine_source() for your schema before enabling.",
        source_id,
        source_label,
    )
    # Adapt column names to your sources table before enabling.
    # await conn.execute(
    #     """
    #     UPDATE sources
    #     SET reliability_score = 0.10,
    #         quarantined = TRUE,
    #         quarantined_at = NOW(),
    #         quarantine_reason = 'adversarial_scanner_auto'
    #     WHERE source_id = $1
    #     """,
    #     source_id,
    # )


# ---------------------------------------------------------------------------
# Pure utility helpers
# ---------------------------------------------------------------------------


def _to_aware_dt(ts: str | datetime) -> datetime:
    """Parse a timestamp to a timezone-aware datetime. Treats naive datetimes as UTC."""
    if isinstance(ts, str):
        ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return ts


def _top_level_family(event: dict) -> str:
    """Return ACLED top-level event family, stripping any subtype after '::'."""
    raw = event.get("acled_event_type", event.get("event_type", ""))
    return raw.split("::")[0].strip()


def _exact_event_type(event: dict) -> str:
    """Return full ACLED event type string as-is (for exact subtype matching)."""
    return event.get("acled_event_type", event.get("event_type", ""))


def _is_high_impact(event: dict) -> bool:
    return _top_level_family(event) in HIGH_IMPACT_FAMILIES


def _is_low_impact(event: dict) -> bool:
    return _exact_event_type(event) in LOW_IMPACT_EVENT_TYPES


def _age_hours(event: dict, now: datetime) -> float:
    ts = event.get("timestamp") or event.get("event_timestamp")
    if ts is None:
        return 9999.0
    return (now - _to_aware_dt(ts)).total_seconds() / 3600


def _current_reliability(trust_history: list[dict]) -> float:
    if not trust_history:
        return 0.5
    return trust_history[-1]["reliability_score"]


def _reliability_at_offset_days(trust_history: list[dict], days: int) -> float:
    if not trust_history:
        return 0.5
    cutoff = datetime.now(tz=timezone.utc).timestamp() - days * 86400
    for snap in reversed(trust_history):
        if _to_aware_dt(snap["snapshot_time"]).timestamp() <= cutoff:
            return snap["reliability_score"]
    return trust_history[0]["reliability_score"]


def _max_prior_reliability(trust_history: list[dict]) -> float:
    """Max reliability across all snapshots except the last (current) one."""
    prior = trust_history[:-1]
    if not prior:
        return 0.0
    return max(s["reliability_score"] for s in prior)


def _cluster_stats(source_id: str, cluster_data: list[dict]) -> tuple[int, int]:
    for cluster in cluster_data:
        members = cluster.get("members", [])
        if source_id in members:
            return len(members), cluster.get("propagation_count", 0)
    return 1, 0


def _hours_since_last_event(events: list[dict], now: datetime) -> float:
    if not events:
        return 9999.0
    return min(_age_hours(e, now) for e in events)


def _recommended_action(risk_level: str) -> str:
    return {
        "WATCH": "Monitor source. Flag reports for secondary review.",
        "SUSPECT": "Hold high-impact claims from SITREP pending corroboration.",
        "QUARANTINE": "Quarantine pending analyst review. Do not include in next SITREP.",
        "CLEAN": "No action required.",
    }.get(risk_level, "No action required.")


def _clean_result(source_id: str, details: dict, note: str = "") -> dict:
    return {
        "source_id": source_id,
        "active_signatures": [],
        "adversarial_risk_score": 0.0,
        "risk_level": "CLEAN",
        "signature_details": details,
        "note": note,
    }
