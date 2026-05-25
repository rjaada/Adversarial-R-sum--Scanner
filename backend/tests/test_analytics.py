"""
Tests for analytics route and schema validation.
All tests use pure Pydantic validation or HTTPX TestClient — no DB, no LLM.
"""
import pytest
from pydantic import ValidationError
from app.schemas import AnalyticsEvent


# ---------------------------------------------------------------------------
# Schema validation — allowed events
# ---------------------------------------------------------------------------

def test_known_event_accepted():
    e = AnalyticsEvent(event="scan_completed", properties={"overall_score": 72})
    assert e.event == "scan_completed"


def test_unknown_event_rejected():
    with pytest.raises(ValidationError):
        AnalyticsEvent(event="secret_event", properties={})


def test_all_known_events_accepted():
    for name in ["scan_completed", "rewrite_requested", "export_triggered",
                 "compare_started", "fix_clicked"]:
        e = AnalyticsEvent(event=name)
        assert e.event == name


# ---------------------------------------------------------------------------
# Property key blocklist
# ---------------------------------------------------------------------------

def test_resume_key_rejected():
    with pytest.raises(ValidationError):
        AnalyticsEvent(event="scan_completed", properties={"resume_text": "hello"})


def test_jd_key_rejected():
    with pytest.raises(ValidationError):
        AnalyticsEvent(event="scan_completed", properties={"jd_text": "hello"})


def test_email_key_rejected():
    with pytest.raises(ValidationError):
        AnalyticsEvent(event="scan_completed", properties={"email": "a@b.com"})


def test_filename_key_rejected():
    with pytest.raises(ValidationError):
        AnalyticsEvent(event="scan_completed", properties={"filename": "resume.pdf"})


def test_excerpt_key_rejected():
    with pytest.raises(ValidationError):
        AnalyticsEvent(event="fix_clicked", properties={"source_excerpt": "some text"})


def test_safe_keys_accepted():
    e = AnalyticsEvent(event="scan_completed", properties={
        "overall_score": 72,
        "issue_count": 4,
        "has_simulation": True,
        "keyword_match_count": 3,
    })
    assert e.properties["overall_score"] == 72


# ---------------------------------------------------------------------------
# Property value constraints
# ---------------------------------------------------------------------------

def test_string_value_too_long_rejected():
    with pytest.raises(ValidationError):
        AnalyticsEvent(event="scan_completed", properties={"label": "x" * 201})


def test_string_value_at_limit_accepted():
    e = AnalyticsEvent(event="scan_completed", properties={"label": "x" * 200})
    assert len(e.properties["label"]) == 200


def test_too_many_properties_rejected():
    with pytest.raises(ValidationError):
        AnalyticsEvent(event="scan_completed", properties={f"k{i}": i for i in range(21)})


def test_none_value_accepted():
    e = AnalyticsEvent(event="compare_started", properties={"verdict": None})
    assert e.properties["verdict"] is None


def test_bool_value_accepted():
    e = AnalyticsEvent(event="export_triggered", properties={"has_real_scan": False})
    assert e.properties["has_real_scan"] is False


# ---------------------------------------------------------------------------
# Route — no-op when disabled (default)
# ---------------------------------------------------------------------------

def test_route_returns_204_when_disabled():
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app)
    resp = client.post("/api/analytics/event", json={
        "event": "scan_completed",
        "properties": {"overall_score": 55},
    })
    assert resp.status_code == 204
    assert resp.content == b""


def test_route_rejects_unknown_event():
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app)
    resp = client.post("/api/analytics/event", json={
        "event": "not_a_real_event",
        "properties": {},
    })
    assert resp.status_code == 422


def test_route_rejects_pii_property():
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app)
    resp = client.post("/api/analytics/event", json={
        "event": "scan_completed",
        "properties": {"resume_text": "some content"},
    })
    assert resp.status_code == 422
