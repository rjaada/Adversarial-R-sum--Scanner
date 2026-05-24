"""
Unit tests for adversarial_scanner — pure scanner logic only, no DB.
"""

import pytest
from datetime import datetime, timezone, timedelta

from adversarial_scanner import (
    scan_source_for_adversarial_signatures,
    _build_alert_payload,
    _max_prior_reliability,
    _is_high_impact,
    _is_low_impact,
    _age_hours,
    WATCH_THRESHOLD,
    SUSPECT_THRESHOLD,
    QUARANTINE_THRESHOLD,
    SIGNATURE_WEIGHTS,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _ts(hours_ago: float) -> str:
    return (datetime.now(tz=timezone.utc) - timedelta(hours=hours_ago)).isoformat()


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


def _scan(source_id, history, events, clusters=None, prior_injection=False):
    return scan_source_for_adversarial_signatures(
        source_id, history, events, clusters or [], prior_injection
    )


# ---------------------------------------------------------------------------
# Event family normalization
# ---------------------------------------------------------------------------


def test_battles_subtype_is_high_impact():
    assert _is_high_impact({"acled_event_type": "Battles::Armed clash"})


def test_explosions_subtype_is_high_impact():
    assert _is_high_impact(
        {"acled_event_type": "Explosions/Remote violence::Air/drone strike"}
    )


def test_top_level_battles_is_high_impact():
    assert _is_high_impact({"acled_event_type": "Battles"})


def test_protests_peaceful_is_not_high_impact():
    assert not _is_high_impact({"acled_event_type": "Protests::Peaceful protest"})


def test_low_impact_exact_match_counts():
    assert _is_low_impact({"acled_event_type": "Protests::Peaceful protest"})
    assert _is_low_impact({"acled_event_type": "Strategic developments::Agreement"})
    assert _is_low_impact({"acled_event_type": "Strategic developments::Other"})


def test_low_impact_non_exact_subtype_does_not_count():
    # Non-enumerated subtype — not in LOW_IMPACT_EVENT_TYPES
    assert not _is_low_impact({"acled_event_type": "Protests::Violent demonstration"})


def test_low_impact_top_level_only_does_not_count():
    # Top-level family without subtype is not an exact match
    assert not _is_low_impact({"acled_event_type": "Protests"})


# ---------------------------------------------------------------------------
# Cold-start guard
# ---------------------------------------------------------------------------


def test_insufficient_history_returns_clean():
    events = [_event("Protests::Peaceful protest", float(h)) for h in range(10)]
    result = _scan("src_cold", _base_history(), events)
    assert result["risk_level"] == "CLEAN"
    assert result["note"] == "insufficient_history"


# ---------------------------------------------------------------------------
# Signature 1 — Trust Pumping
# ---------------------------------------------------------------------------


def test_trust_pumping_detected():
    history = [_snap(0.40, 8), _snap(0.60, 0.1)]
    events = [_event("Protests::Peaceful protest", float(h)) for h in range(1, 17)]
    result = _scan("src_pump", history, events)
    assert "TRUST_PUMPING" in result["active_signatures"]


def test_trust_pumping_alone_is_clean_not_watch():
    # TRUST_PUMPING weight 0.25 < WATCH threshold 0.35 → CLEAN
    history = [_snap(0.40, 8), _snap(0.60, 0.1)]
    events = [_event("Protests::Peaceful protest", float(h)) for h in range(1, 17)]
    result = _scan("src_pump_clean", history, events)
    if result["active_signatures"] == ["TRUST_PUMPING"]:
        assert result["risk_level"] == "CLEAN"
        assert result["adversarial_risk_score"] == pytest.approx(0.25)


def test_trust_pumping_not_triggered_stable():
    history = [_snap(0.55, 8), _snap(0.57, 0.1)]
    events = [_event("Protests::Peaceful protest", float(h)) for h in range(1, 17)]
    result = _scan("src_stable", history, events)
    assert "TRUST_PUMPING" not in result["active_signatures"]


# ---------------------------------------------------------------------------
# Signature 2 — High-Impact Injection After Trust Peak
# ---------------------------------------------------------------------------


def test_high_impact_injection_detected():
    # history[-1] = 0.80, prior max = 0.60 → new peak
    history = [_snap(0.50, 30), _snap(0.60, 8), _snap(0.80, 0.1)]
    events = (
        [_event("Protests::Peaceful protest", float(h)) for h in range(5, 20)]
        + [_event("Battles", 200.0, event_id="evt_old")]
        + [_event("Battles", 12.0, event_id="evt_inject")]
    )
    result = _scan("src_inject", history, events)
    assert "HIGH_IMPACT_INJECTION" in result["active_signatures"]
    assert result["signature_details"]["HIGH_IMPACT_INJECTION"]["injection_event_id"] == "evt_inject"


def test_first_ever_high_impact_skipped():
    history = [_snap(0.50, 30), _snap(0.80, 0.1)]
    events = (
        [_event("Protests::Peaceful protest", float(h)) for h in range(2, 17)]
        + [_event("Battles", 6.0, event_id="evt_first")]
    )
    result = _scan("src_first", history, events)
    assert "HIGH_IMPACT_INJECTION" not in result["active_signatures"]


def test_trust_peak_excludes_current_snapshot():
    # history = [0.50, 0.60, 0.75] — last is current
    # prior max = 0.60; current 0.75 > 0.60 → is_new_trust_peak = True
    history = [_snap(0.50, 20), _snap(0.60, 10), _snap(0.75, 0.1)]
    assert _max_prior_reliability(history) == pytest.approx(0.60)
    current = history[-1]["reliability_score"]
    assert current > _max_prior_reliability(history)


def test_trust_peak_not_triggered_when_not_new_peak():
    # current 0.65 < prior max 0.70 → no peak
    history = [_snap(0.70, 20), _snap(0.68, 10), _snap(0.65, 0.1)]
    assert history[-1]["reliability_score"] < _max_prior_reliability(history)


# ---------------------------------------------------------------------------
# Signature 3 — Corroboration Desert
# ---------------------------------------------------------------------------


def test_corroboration_desert_detected():
    history = _base_history()
    events = (
        [_event("Protests::Peaceful protest", float(h), corroborated=(h < 8)) for h in range(10)]
        + [_event("Battles", float(h + 20)) for h in range(5)]
    )
    result = _scan("src_corr", history, events)
    assert "CORROBORATION_DESERT" in result["active_signatures"]
    assert result["signature_details"]["CORROBORATION_DESERT"]["corr_split"] > 0.50


def test_corroboration_desert_skipped_when_few_high():
    history = _base_history()
    events = (
        [_event("Protests::Peaceful protest", float(h), corroborated=True) for h in range(14)]
        + [_event("Battles", 5.0)]
    )
    result = _scan("src_few_hi", history, events)
    assert "CORROBORATION_DESERT" not in result["active_signatures"]
    assert result["signature_details"]["CORROBORATION_DESERT"].get("skipped")


# ---------------------------------------------------------------------------
# Signature 4 — Narrative Isolation
# ---------------------------------------------------------------------------


def test_narrative_isolation_detected():
    history = [_snap(0.70, 10), _snap(0.75, 0.1)]
    events = (
        [_event("Protests::Peaceful protest", float(h)) for h in range(14)]  # 14 + 1 Battles = 15 >= MIN
        + [_event("Battles", 10.0)]
    )
    clusters = [{"members": ["src_iso"], "propagation_count": 0}]
    result = _scan("src_iso", history, events, clusters)
    assert "NARRATIVE_ISOLATION" in result["active_signatures"]


def test_narrative_isolation_not_triggered_low_trust():
    history = [_snap(0.55, 10), _snap(0.60, 0.1)]
    events = (
        [_event("Protests::Peaceful protest", float(h)) for h in range(14)]  # 14 + 1 = 15 >= MIN
        + [_event("Battles", 10.0)]
    )
    clusters = [{"members": ["src_lo"], "propagation_count": 0}]
    result = _scan("src_lo", history, events, clusters)
    assert "NARRATIVE_ISOLATION" not in result["active_signatures"]


# ---------------------------------------------------------------------------
# Signature 5 — Post-Injection Dormancy
# ---------------------------------------------------------------------------


def test_dormancy_triggers_from_prior_injection_flag():
    # prior_injection_detected=True passed in; no current-scan injection needed.
    # All events must be >72h ago so _hours_since_last_event exceeds the threshold.
    history = _base_history(0.60, 0.65)
    events = (
        [_event("Protests::Peaceful protest", float(h + 73)) for h in range(15)]  # 73-87h ago
        + [_event("Battles", 80.0, event_id="evt_old_high")]  # 80h ago — all >72h
    )
    result = _scan("src_dorm", history, events, prior_injection=True)
    assert "POST_INJECTION_DORMANCY" in result["active_signatures"]
    assert "HIGH_IMPACT_INJECTION" not in result["active_signatures"]


def test_dormancy_not_triggered_without_prior_flag():
    # Same-scan HIGH_IMPACT_INJECTION alone must NOT trigger dormancy
    history = [_snap(0.50, 30), _snap(0.60, 8), _snap(0.80, 0.1)]
    events = (
        [_event("Protests::Peaceful protest", float(h)) for h in range(5, 20)]
        + [_event("Battles", 200.0, event_id="evt_old")]
        + [_event("Battles", 80.0, event_id="evt_inject")]
    )
    result = _scan("src_no_dorm", history, events, prior_injection=False)
    assert "POST_INJECTION_DORMANCY" not in result["active_signatures"]


def test_dormancy_not_triggered_when_source_active():
    # prior flag set but source is still reporting (last event 2h ago)
    history = _base_history(0.60, 0.65)
    events = (
        [_event("Protests::Peaceful protest", float(h)) for h in range(5, 20)]
        + [_event("Battles", 2.0, event_id="evt_recent")]
    )
    result = _scan("src_active", history, events, prior_injection=True)
    assert "POST_INJECTION_DORMANCY" not in result["active_signatures"]


# ---------------------------------------------------------------------------
# Alert payload correctness
# ---------------------------------------------------------------------------


def test_alert_payload_trust_score_is_reliability_not_risk_score():
    payload = _build_alert_payload(
        source_id="src_x",
        source_label="Test Source",
        source_reliability_score=0.78,
        result={
            "adversarial_risk_score": 0.60,
            "risk_level": "SUSPECT",
            "active_signatures": ["HIGH_IMPACT_INJECTION"],
            "signature_details": {
                "CORROBORATION_DESERT": {},
                "TRUST_PUMPING": {},
            },
        },
        trust_velocity_7d=0.19,
        low_impact_buildup=0.82,
        injection_event_id="evt_123",
    )
    assert payload["trust_score_at_alert"] == pytest.approx(0.78)
    assert payload["adversarial_risk_score"] == pytest.approx(0.60)
    assert payload["trust_score_at_alert"] != payload["adversarial_risk_score"]


# ---------------------------------------------------------------------------
# Composite scoring + threshold boundaries
# ---------------------------------------------------------------------------


def _classify(score: float) -> str:
    if score >= QUARANTINE_THRESHOLD:
        return "QUARANTINE"
    if score >= SUSPECT_THRESHOLD:
        return "SUSPECT"
    if score >= WATCH_THRESHOLD:
        return "WATCH"
    return "CLEAN"


def test_threshold_boundary_0_25_is_clean():
    assert _classify(0.25) == "CLEAN"


def test_threshold_boundary_0_35_is_watch():
    assert _classify(0.35) == "WATCH"


def test_threshold_boundary_0_60_is_suspect():
    assert _classify(0.60) == "SUSPECT"


def test_threshold_boundary_0_80_is_quarantine():
    assert _classify(0.80) == "QUARANTINE"


def test_threshold_just_below_watch_is_clean():
    assert _classify(round(WATCH_THRESHOLD - 0.001, 4)) == "CLEAN"


def test_threshold_just_below_suspect_is_watch():
    assert _classify(round(SUSPECT_THRESHOLD - 0.001, 4)) == "WATCH"


def test_threshold_just_below_quarantine_is_suspect():
    assert _classify(round(QUARANTINE_THRESHOLD - 0.001, 4)) == "SUSPECT"


def test_score_capped_at_1():
    assert abs(sum(SIGNATURE_WEIGHTS.values()) - 1.0) < 1e-9


def test_risk_level_clean_no_signatures():
    history = _base_history()
    events = [
        _event("Protests::Peaceful protest", float(h), corroborated=True)
        for h in range(16)
    ]
    result = _scan("src_clean", history, events)
    assert result["risk_level"] == "CLEAN"
    assert result["adversarial_risk_score"] == 0.0


# ---------------------------------------------------------------------------
# Timezone safety
# ---------------------------------------------------------------------------


def test_age_hours_naive_datetime_treated_as_utc():
    now = datetime.now(tz=timezone.utc)
    naive_ts = (now - timedelta(hours=5)).replace(tzinfo=None)
    event = {"timestamp": naive_ts}
    age = _age_hours(event, now)
    assert 4.9 < age < 5.1


def test_age_hours_iso_string_with_trailing_z():
    now = datetime.now(tz=timezone.utc)
    z_str = (now - timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%SZ")
    event = {"timestamp": z_str}
    age = _age_hours(event, now)
    assert 2.9 < age < 3.1
