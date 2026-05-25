"""
Unit tests for LLM rewrite adapter.
No live model required — tests cover pure functions and graceful degradation.
"""
import os
import pytest
from app.services.llm_rewrite import (
    build_rewrite_prompt,
    parse_variants,
    is_llm_configured,
    generate_rewrite_variants,
)


# --- Configuration ---

def test_llm_not_configured_when_env_unset(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "llm_endpoint", "")
    assert not is_llm_configured()


def test_llm_configured_when_endpoint_set(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "llm_endpoint", "http://localhost:11434")
    assert is_llm_configured()


# --- Graceful degradation ---

@pytest.mark.anyio(backends=["asyncio"])
async def test_generate_returns_not_available_when_unconfigured(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "llm_endpoint", "")
    variants, available, error = await generate_rewrite_variants(
        issue_type="weak_phrasing",
        original_text="Responsible for backend services",
        evidence="Passive phrasing",
        fix_pattern="Use active verb",
        rewrite_starter="",
        jd_keywords=["python", "docker"],
    )
    assert available is False
    assert variants == []
    assert error == ""


@pytest.mark.anyio(backends=["asyncio"])
async def test_generate_returns_available_true_for_unsupported_type(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "llm_endpoint", "http://localhost:11434")
    variants, available, error = await generate_rewrite_variants(
        issue_type="missing_section",
        original_text="",
        evidence="",
        fix_pattern="",
        rewrite_starter="",
        jd_keywords=[],
    )
    assert available is True
    assert variants == []
    assert "not supported" in error


# --- Prompt safety ---

def test_prompt_forbids_fabrication():
    prompt = build_rewrite_prompt(
        issue_type="weak_phrasing",
        original_text="Responsible for database migrations",
        evidence="Passive phrasing detected",
        fix_pattern="Use active verb",
        rewrite_starter="Migrated database schema",
        jd_keywords=["postgresql", "python"],
        count=3,
    )
    assert "Do not invent" in prompt
    assert "placeholder" in prompt.lower() or "[X%]" in prompt


def test_prompt_includes_original_text():
    prompt = build_rewrite_prompt(
        issue_type="weak_phrasing",
        original_text="Helped with CI/CD pipeline",
        evidence="weak verb",
        fix_pattern="active verb",
        rewrite_starter="",
        jd_keywords=[],
        count=3,
    )
    assert "Helped with CI/CD pipeline" in prompt


def test_prompt_includes_jd_keywords():
    prompt = build_rewrite_prompt(
        issue_type="low_quantification",
        original_text="Built backend API",
        evidence="no metrics",
        fix_pattern="add numbers",
        rewrite_starter="",
        jd_keywords=["kubernetes", "terraform", "aws"],
        count=2,
    )
    assert "kubernetes" in prompt
    assert "terraform" in prompt


def test_prompt_caps_jd_keywords_at_8():
    keywords = [f"kw{i}" for i in range(20)]
    prompt = build_rewrite_prompt(
        issue_type="weak_phrasing",
        original_text="x",
        evidence="",
        fix_pattern="",
        rewrite_starter="",
        jd_keywords=keywords,
        count=3,
    )
    # Only first 8 should appear
    assert "kw7" in prompt
    assert "kw8" not in prompt


def test_prompt_omits_starter_when_empty():
    prompt = build_rewrite_prompt(
        issue_type="weak_phrasing",
        original_text="x",
        evidence="",
        fix_pattern="",
        rewrite_starter="",
        jd_keywords=[],
        count=3,
    )
    assert "Suggested direction" not in prompt


# --- Output parsing ---

def test_parse_variants_numbered_list():
    content = "1. Built backend API for [N] services, reducing latency by [X ms].\n2. Led API migration, improving throughput by [X%].\n3. Delivered REST API serving [N] clients with [X%] uptime."
    variants = parse_variants(content, 3)
    assert len(variants) == 3
    assert variants[0].startswith("Built")
    assert variants[1].startswith("Led")


def test_parse_variants_strips_numbering():
    content = "1. First rewrite here.\n2) Second rewrite here.\n- Third rewrite here."
    variants = parse_variants(content, 3)
    assert all(not v[0].isdigit() for v in variants)
    assert all(not v.startswith("-") for v in variants)


def test_parse_variants_caps_at_count():
    content = "\n".join(f"{i+1}. Variant line {i+1} with enough text" for i in range(10))
    variants = parse_variants(content, 3)
    assert len(variants) == 3


def test_parse_variants_empty_input():
    assert parse_variants("", 3) == []


def test_parse_variants_skips_short_lines():
    content = "1. ok\n2. This is a proper rewrite with enough content\n3. x"
    variants = parse_variants(content, 3)
    assert len(variants) == 1
    assert "proper rewrite" in variants[0]


# --- Metric sanitization ---

def test_sanitize_wraps_bare_percentage(monkeypatch):
    from app.services.llm_rewrite import _sanitize_variant
    result = _sanitize_variant("Reduced latency by 35% across all services")
    assert "[35%]" in result
    assert "35%" not in result.replace("[35%]", "")


def test_sanitize_leaves_bracketed_percentage_alone(monkeypatch):
    from app.services.llm_rewrite import _sanitize_variant
    result = _sanitize_variant("Reduced latency by [X%] across all services")
    assert result == "Reduced latency by [X%] across all services"


def test_sanitize_wraps_dollar_amount(monkeypatch):
    from app.services.llm_rewrite import _sanitize_variant
    result = _sanitize_variant("Saved $150,000 in infrastructure costs")
    assert "[$150,000]" in result


def test_sanitize_wraps_millisecond_metric(monkeypatch):
    from app.services.llm_rewrite import _sanitize_variant
    result = _sanitize_variant("Reduced p99 latency from 200ms to 50ms")
    assert "[200ms]" in result
    assert "[50ms]" in result


def test_sanitize_leaves_plain_text_alone(monkeypatch):
    from app.services.llm_rewrite import _sanitize_variant
    text = "Built backend API supporting [N users] with [X%] uptime"
    assert _sanitize_variant(text) == text


def test_parse_variants_sanitizes_bare_metrics():
    """parse_variants must sanitize fabricated numbers in model output."""
    content = "1. Reduced API latency by 45%, saving $20,000 annually across 3 regions."
    variants = parse_variants(content, 1)
    assert len(variants) == 1
    assert "[45%]" in variants[0]
    assert "[$20,000]" in variants[0]


# --- Status route behavior ---

@pytest.mark.anyio(backends=["asyncio"])
async def test_check_llm_health_returns_none_when_unconfigured(monkeypatch):
    from app.config import settings
    import app.services.llm_rewrite as mod
    monkeypatch.setattr(settings, "llm_endpoint", "")
    result = await mod.check_llm_health()
    assert result is None


@pytest.mark.anyio(backends=["asyncio"])
async def test_check_llm_health_returns_false_on_connection_error(monkeypatch):
    from app.config import settings
    import app.services.llm_rewrite as mod
    monkeypatch.setattr(settings, "llm_endpoint", "http://localhost:19999")
    result = await mod.check_llm_health()
    assert result is False
