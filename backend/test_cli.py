"""
CLI and fixture tests — no subprocess, no DB required.

Tests that _resolve_fixture() produces correct scanner inputs and that
each fixture produces the expected risk level. Also tests JSON/Markdown export.
"""

import json
from pathlib import Path

import pytest

from adversarial_scanner import scan_source_for_adversarial_signatures
from cli import _build_markdown_report, _resolve_fixture, run_fixture_scan

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


# ---------------------------------------------------------------------------
# Report export — JSON
# ---------------------------------------------------------------------------


def test_out_json_writes_valid_json(tmp_path):
    result = _run_fixture("sample_quarantine.json")
    out = tmp_path / "report.json"
    out.write_text(json.dumps(result, indent=2))

    loaded = json.loads(out.read_text())
    assert loaded["source_id"] == result["source_id"]
    assert loaded["risk_level"] == "QUARANTINE"
    assert loaded["adversarial_risk_score"] == pytest.approx(0.80)
    assert "active_signatures" in loaded


def test_out_json_contains_signature_details(tmp_path):
    result = _run_fixture("sample_quarantine.json")
    out = tmp_path / "report.json"
    out.write_text(json.dumps(result, indent=2))

    loaded = json.loads(out.read_text())
    assert "signature_details" in loaded
    assert "TRUST_PUMPING" in loaded["signature_details"]


# ---------------------------------------------------------------------------
# Report export — Markdown
# ---------------------------------------------------------------------------


def test_build_markdown_report_contains_source_id():
    result = _run_fixture("sample_quarantine.json")
    md = _build_markdown_report(result)
    assert result["source_id"] in md


def test_build_markdown_report_contains_risk_level():
    result = _run_fixture("sample_quarantine.json")
    md = _build_markdown_report(result)
    assert "QUARANTINE" in md


def test_build_markdown_report_lists_active_signatures():
    result = _run_fixture("sample_quarantine.json")
    md = _build_markdown_report(result)
    for sig in result["active_signatures"]:
        assert sig in md


def test_build_markdown_report_clean_says_no_signatures():
    result = _run_fixture("sample_clean.json")
    md = _build_markdown_report(result)
    assert "No adversarial signatures detected" in md


def test_build_markdown_report_writes_to_file(tmp_path):
    result = _run_fixture("sample_watch.json")
    md = _build_markdown_report(result)
    out = tmp_path / "report.md"
    out.write_text(md)

    content = out.read_text()
    assert "# Adversarial Source Scan Report" in content
    assert result["source_id"] in content
    assert "WATCH" in content


# ---------------------------------------------------------------------------
# run_fixture_scan — direct export-path tests
# ---------------------------------------------------------------------------


def test_run_fixture_scan_out_json_creates_file(tmp_path):
    out = tmp_path / "report.json"
    run_fixture_scan(FIXTURES / "sample_quarantine.json", out_json=out)

    assert out.exists()
    loaded = json.loads(out.read_text())
    assert loaded["risk_level"] == "QUARANTINE"


def test_run_fixture_scan_out_md_creates_file(tmp_path):
    out = tmp_path / "report.md"
    run_fixture_scan(FIXTURES / "sample_quarantine.json", out_md=out)

    assert out.exists()
    assert "# Adversarial Source Scan Report" in out.read_text()


def test_run_fixture_scan_both_flags_create_both_files(tmp_path):
    json_out = tmp_path / "report.json"
    md_out = tmp_path / "report.md"
    run_fixture_scan(FIXTURES / "sample_quarantine.json", out_json=json_out, out_md=md_out)

    assert json_out.exists()
    assert md_out.exists()


def test_run_fixture_scan_return_value_matches_file_content(tmp_path):
    out = tmp_path / "report.json"
    result = run_fixture_scan(FIXTURES / "sample_quarantine.json", out_json=out)

    loaded = json.loads(out.read_text())
    assert loaded["source_id"] == result["source_id"]
    assert loaded["risk_level"] == result["risk_level"]
