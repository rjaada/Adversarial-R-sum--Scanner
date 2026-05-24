"""
CLI and fixture tests — no subprocess, no DB required.

Tests that _resolve_fixture() produces correct scanner inputs and that
each fixture produces the expected risk level.
"""

import json
from pathlib import Path

import pytest

from adversarial_scanner import scan_source_for_adversarial_signatures
from cli import _resolve_fixture

FIXTURES = Path(__file__).parent / "fixtures"


def _run_fixture(name: str) -> dict:
    raw = json.loads((FIXTURES / name).read_text())
    resolved = _resolve_fixture(raw)
    return scan_source_for_adversarial_signatures(
        source_id=resolved["source_id"],
        trust_history=resolved["trust_history"],
        recent_events=resolved["recent_events"],
        cluster_data=resolved["cluster_data"],
        prior_injection_detected=resolved["prior_injection_detected"],
    )


# ---------------------------------------------------------------------------
# _resolve_fixture — structural correctness
# ---------------------------------------------------------------------------


def test_resolve_fixture_produces_iso_timestamps():
    raw = json.loads((FIXTURES / "sample_clean.json").read_text())
    resolved = _resolve_fixture(raw)
    for snap in resolved["trust_history"]:
        assert "snapshot_time" in snap
        assert "T" in snap["snapshot_time"]
    for ev in resolved["recent_events"]:
        assert "timestamp" in ev
        assert "T" in ev["timestamp"]


def test_resolve_fixture_preserves_source_id():
    raw = json.loads((FIXTURES / "sample_clean.json").read_text())
    resolved = _resolve_fixture(raw)
    assert resolved["source_id"] == raw["source_id"]


# ---------------------------------------------------------------------------
# Fixture risk levels
# ---------------------------------------------------------------------------


def test_clean_fixture_is_clean():
    result = _run_fixture("sample_clean.json")
    assert result["risk_level"] == "CLEAN"
    assert result["adversarial_risk_score"] == 0.0
    assert result["active_signatures"] == []


def test_watch_fixture_is_watch():
    result = _run_fixture("sample_watch.json")
    assert result["risk_level"] == "WATCH"
    assert "TRUST_PUMPING" in result["active_signatures"]
    assert "NARRATIVE_ISOLATION" in result["active_signatures"]
    assert result["adversarial_risk_score"] == pytest.approx(0.40)


def test_quarantine_fixture_is_quarantine():
    result = _run_fixture("sample_quarantine.json")
    assert result["risk_level"] == "QUARANTINE"
    assert "TRUST_PUMPING" in result["active_signatures"]
    assert "HIGH_IMPACT_INJECTION" in result["active_signatures"]
    assert "CORROBORATION_DESERT" in result["active_signatures"]
    assert result["adversarial_risk_score"] == pytest.approx(0.80)
