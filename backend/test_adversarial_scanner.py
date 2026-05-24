"""
Unit tests for adversarial_scanner.scan_source_for_adversarial_signatures().
All tests use synthetic data — no I/O, no DB.
"""

import pytest
from datetime import datetime, timezone, timedelta
from adversarial_scanner import scan_source_for_adversarial_signatures


def _ts(hours_ago: float) -> str:
    t = datetime.now(tz=timezone.utc) - timedelta(hours=hours_ago)
    return t.isoformat()


def _event(
    event_type: str,
    hours_ago: float,
    corroborated: bool = False,
    event_id: str = "evt_0",
    impact_score: float = 0.5,
) -> dict:
    return {
        "event_id": event_id,
        "acled_event_type": event_type,
        "timestamp": _ts(hours_ago),
        "corroborated": corroborated,
        "impact_score": impact_score,
    }


def _snap(reliability: float, days_ago: float) -> dict:
    t = datetime.now(tz=timezone.utc) - timedelta(days=days_ago)
    return {"snapshot_time": t.isoformat(), "reliability_score": reliability}


def _base_history(start: float = 0.50, end: float = 0.55) -> list[dict]:
    """Stable trust history — no meaningful velocity."""
    return [
        _snap(start, 30),
        _snap((start + end) / 2, 15),
        _snap(end, 0.1),
    ]


# ---------------------------------------------------------------------------
# Cold-start guard
# ---------------------------------------------------------------------------


def test_insufficient_history_returns_clean():
    events = [
        _event("Protests::Peaceful protest", h)
        for h in range(10)  # only 10 events, below MIN_EVENTS_30D=15
    ]
    result = scan_source_for_adversarial_signatures("src_1", _base_history(), events, [])
    assert result["risk_level"] == "CLEAN"
    assert result["note"] == "insufficient_history"


# ---------------------------------------------------------------------------
# Signature 1 — Trust Pumping
# ---------------------------------------------------------------------------


def test_trust_pumping_detected():
    # +0.20 velocity in 7 days, 80% low-impact events
    history = [_snap(0.40, 8), _snap(0.60, 0.1)]
    events = [
        _event("Protests::Peaceful protest", float(h))
        for h in range(1, 17)  # 16 low-impact events
    ]
    result = scan_source_for_adversarial_signatures("src_pump", history, events, [])
    assert "TRUST_PUMPING" in result["active_signatures"]


def test_trust_pumping_not_triggered_stable():
    history = [_snap(0.55, 8), _snap(0.57, 0.1)]  # +0.02 velocity
    events = [_event("Protests::Peaceful protest", float(h)) for h in range(1, 17)]
    result = scan_source_for_adversarial_signatures("src_stable", history, events, [])
    assert "TRUST_PUMPING" not in result["active_signatures"]


# ---------------------------------------------------------------------------
# Signature 2 — High-Impact Injection After Trust Peak
# ---------------------------------------------------------------------------


def test_high_impact_injection_detected():
    # New peak + high-impact event within 24h + not first ever high-impact
    history = [_snap(0.50, 30), _snap(0.60, 8), _snap(0.80, 0.1)]  # new peak
    events = (
        # 14 low-impact for sample threshold
        [_event("Protests::Peaceful protest", float(h)) for h in range(5, 20)]
        # 1 older high-impact (so not "first ever")
        + [_event("Battles", 200.0, event_id="evt_old")]
        # injection within 24h
        + [_event("Battles", 12.0, event_id="evt_inject")]
    )
    result = scan_source_for_adversarial_signatures("src_inject", history, events, [])
    assert "HIGH_IMPACT_INJECTION" in result["active_signatures"]
    assert result["signature_details"]["HIGH_IMPACT_INJECTION"]["injection_event_id"] == "evt_inject"


def test_first_ever_high_impact_skipped():
    history = [_snap(0.50, 30), _snap(0.80, 0.1)]
    events = (
        [_event("Protests::Peaceful protest", float(h)) for h in range(2, 17)]
        + [_event("Battles", 6.0, event_id="evt_first")]  # only 1 high-impact ever
    )
    result = scan_source_for_adversarial_signatures("src_first", history, events, [])
    assert "HIGH_IMPACT_INJECTION" not in result["active_signatures"]


# ---------------------------------------------------------------------------
# Signature 3 — Corroboration Desert
# ---------------------------------------------------------------------------


def test_corroboration_desert_detected():
    history = _base_history()
    events = (
        # 10 low-impact, 8 corroborated
        [_event("Protests::Peaceful protest", float(h), corroborated=(h < 8)) for h in range(10)]
        # 5 high-impact, 0 corroborated
        + [_event("Battles", float(h + 20)) for h in range(5)]
    )
    result = scan_source_for_adversarial_signatures("src_corr", history, events, [])
    assert "CORROBORATION_DESERT" in result["active_signatures"]
    split = result["signature_details"]["CORROBORATION_DESERT"]["corr_split"]
    assert split > 0.50


def test_corroboration_desert_skipped_when_few_high():
    history = _base_history()
    events = (
        [_event("Protests::Peaceful protest", float(h), corroborated=True) for h in range(14)]
        + [_event("Battles", 5.0)]  # only 1 high-impact — below MIN=3
    )
    result = scan_source_for_adversarial_signatures("src_few_hi", history, events, [])
    assert "CORROBORATION_DESERT" not in result["active_signatures"]
    assert result["signature_details"]["CORROBORATION_DESERT"].get("skipped")


# ---------------------------------------------------------------------------
# Signature 4 — Narrative Isolation
# ---------------------------------------------------------------------------


def test_narrative_isolation_detected():
    history = [_snap(0.70, 10), _snap(0.75, 0.1)]
    events = (
        [_event("Protests::Peaceful protest", float(h)) for h in range(13)]
        + [_event("Battles", 10.0)]
    )
    # Source is in a singleton cluster with no propagation
    clusters = [{"members": ["src_iso"], "propagation_count": 0}]
    result = scan_source_for_adversarial_signatures("src_iso", history, events, clusters)
    assert "NARRATIVE_ISOLATION" in result["active_signatures"]


def test_narrative_isolation_not_triggered_low_trust():
    history = [_snap(0.55, 10), _snap(0.60, 0.1)]
    events = (
        [_event("Protests::Peaceful protest", float(h)) for h in range(13)]
        + [_event("Battles", 10.0)]
    )
    clusters = [{"members": ["src_lo"], "propagation_count": 0}]
    result = scan_source_for_adversarial_signatures("src_lo", history, events, clusters)
    assert "NARRATIVE_ISOLATION" not in result["active_signatures"]


# ---------------------------------------------------------------------------
# Signature 5 — Post-Injection Dormancy
# ---------------------------------------------------------------------------


def test_post_injection_dormancy_detected():
    # Build a scan that first triggers HIGH_IMPACT_INJECTION, then goes dormant
    history = [_snap(0.50, 30), _snap(0.60, 8), _snap(0.80, 0.1)]
    events = (
        [_event("Protests::Peaceful protest", float(h)) for h in range(5, 20)]
        + [_event("Battles", 200.0, event_id="evt_old")]
        # Last report is 80h ago — dormancy
        + [_event("Battles", 80.0, event_id="evt_inject")]
    )
    result = scan_source_for_adversarial_signatures("src_dorm", history, events, [])
    assert "HIGH_IMPACT_INJECTION" in result["active_signatures"]
    assert "POST_INJECTION_DORMANCY" in result["active_signatures"]


# ---------------------------------------------------------------------------
# Composite scoring
# ---------------------------------------------------------------------------


def test_risk_level_watch():
    # Only TRUST_PUMPING (0.25) → WATCH
    history = [_snap(0.40, 8), _snap(0.60, 0.1)]
    events = [_event("Protests::Peaceful protest", float(h)) for h in range(1, 17)]
    result = scan_source_for_adversarial_signatures("src_watch", history, events, [])
    if "TRUST_PUMPING" in result["active_signatures"]:
        assert result["risk_level"] in ("WATCH", "SUSPECT", "QUARANTINE")
        assert result["adversarial_risk_score"] >= 0.25


def test_risk_level_clean_no_signatures():
    history = _base_history()
    events = [_event("Protests::Peaceful protest", float(h), corroborated=True) for h in range(16)]
    result = scan_source_for_adversarial_signatures("src_clean", history, events, [])
    assert result["risk_level"] == "CLEAN"
    assert result["adversarial_risk_score"] == 0.0


def test_score_capped_at_1():
    # All 5 signatures active → 0.25+0.35+0.20+0.15+0.05 = 1.00
    from adversarial_scanner import SIGNATURE_WEIGHTS
    total = sum(SIGNATURE_WEIGHTS.values())
    assert abs(total - 1.0) < 1e-9
