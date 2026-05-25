"""
Unit tests for LLM rewrite adapter.
No live model required — tests cover pure functions and graceful degradation.
"""
import pytest
from app.services.llm_rewrite import (
    build_rewrite_prompt,
    parse_variants,
    rank_variants,
    is_llm_configured,
    generate_rewrite_variants,
    _role_hint_from_keywords,
    _variant_score,
)


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

def test_llm_not_configured_when_env_unset(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "llm_endpoint", "")
    assert not is_llm_configured()


def test_llm_configured_when_endpoint_set(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "llm_endpoint", "http://localhost:11434")
    assert is_llm_configured()


# ---------------------------------------------------------------------------
# Graceful degradation
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Role hint extraction
# ---------------------------------------------------------------------------

def test_role_hint_ml_keywords():
    hint = _role_hint_from_keywords(["pytorch", "tensorflow", "python"])
    assert "machine learning" in hint.lower() or "ai" in hint.lower()


def test_role_hint_devops_keywords():
    hint = _role_hint_from_keywords(["kubernetes", "terraform", "helm"])
    assert "devops" in hint.lower() or "platform" in hint.lower()


def test_role_hint_frontend_keywords():
    hint = _role_hint_from_keywords(["react", "typescript", "nextjs"])
    assert "frontend" in hint.lower() or "full-stack" in hint.lower()


def test_role_hint_default_when_no_match():
    hint = _role_hint_from_keywords(["bespoke_tool_xyz"])
    assert "engineer" in hint.lower()


def test_role_hint_empty_keywords():
    hint = _role_hint_from_keywords([])
    assert isinstance(hint, str)
    assert len(hint) > 0


# ---------------------------------------------------------------------------
# Prompt construction
# ---------------------------------------------------------------------------

def test_prompt_contains_role_context():
    prompt = build_rewrite_prompt(
        issue_type="weak_phrasing",
        original_text="Responsible for database migrations",
        evidence="Passive phrasing",
        fix_pattern="Use active verb",
        rewrite_starter="",
        jd_keywords=["kubernetes", "docker"],
        count=3,
    )
    assert "devops" in prompt.lower() or "platform" in prompt.lower() or "engineer" in prompt.lower()


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
    assert "[X%]" in prompt


def test_prompt_bans_weak_openings():
    prompt = build_rewrite_prompt(
        issue_type="weak_phrasing",
        original_text="x",
        evidence="",
        fix_pattern="",
        rewrite_starter="",
        jd_keywords=[],
        count=3,
    )
    assert "Do NOT start with" in prompt
    assert "I, My, The" in prompt


def test_prompt_treats_starter_as_hard_constraint():
    prompt = build_rewrite_prompt(
        issue_type="weak_phrasing",
        original_text="x",
        evidence="",
        fix_pattern="",
        rewrite_starter="Migrated legacy monolith",
        jd_keywords=[],
        count=3,
    )
    assert "Direction to follow" in prompt
    assert "Migrated legacy monolith" in prompt


def test_prompt_omits_direction_block_when_no_starter():
    prompt = build_rewrite_prompt(
        issue_type="weak_phrasing",
        original_text="x",
        evidence="",
        fix_pattern="",
        rewrite_starter="",
        jd_keywords=[],
        count=3,
    )
    assert "Direction to follow" not in prompt


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
    assert "kw7" in prompt
    assert "kw8" not in prompt


def test_prompt_includes_verb_examples():
    prompt = build_rewrite_prompt(
        issue_type="weak_phrasing",
        original_text="x",
        evidence="",
        fix_pattern="",
        rewrite_starter="",
        jd_keywords=[],
        count=3,
    )
    # At least some well-known verbs should appear in the prompt
    assert any(v in prompt for v in ["Built", "Led", "Reduced", "Delivered"])


# ---------------------------------------------------------------------------
# Output parsing
# ---------------------------------------------------------------------------

def test_parse_variants_numbered_list():
    content = "1. Built backend API for [N] services.\n2. Led API migration, improving throughput by [X%].\n3. Delivered REST API serving [N] clients."
    # parse_variants returns up to count*2 extras; pass count=3 so it collects ≥3
    variants = parse_variants(content, 3)
    assert len(variants) >= 3
    assert any(v.startswith("Built") for v in variants)
    assert any(v.startswith("Led") for v in variants)


def test_parse_variants_strips_numbering():
    content = "1. First rewrite here.\n2) Second rewrite here.\n- Third rewrite here."
    variants = parse_variants(content, 3)
    assert all(not v[0].isdigit() for v in variants)
    assert all(not v.startswith("-") for v in variants)


def test_parse_variants_collects_extras_for_ranking():
    # parse_variants now returns up to count*2 so rank_variants can filter
    content = "\n".join(f"{i+1}. Variant line {i+1} with enough text" for i in range(10))
    variants = parse_variants(content, 3)
    assert len(variants) >= 3   # at least count
    assert len(variants) <= 6   # at most count*2


def test_parse_variants_empty_input():
    assert parse_variants("", 3) == []


def test_parse_variants_skips_short_lines():
    content = "1. ok\n2. This is a proper rewrite with enough content\n3. x"
    variants = parse_variants(content, 3)
    assert len(variants) == 1
    assert "proper rewrite" in variants[0]


# ---------------------------------------------------------------------------
# Metric sanitization
# ---------------------------------------------------------------------------

def test_sanitize_wraps_bare_percentage():
    from app.services.llm_rewrite import _sanitize_variant
    result = _sanitize_variant("Reduced latency by 35% across all services")
    assert "[35%]" in result
    assert "35%" not in result.replace("[35%]", "")


def test_sanitize_leaves_bracketed_percentage_alone():
    from app.services.llm_rewrite import _sanitize_variant
    result = _sanitize_variant("Reduced latency by [X%] across all services")
    assert result == "Reduced latency by [X%] across all services"


def test_sanitize_wraps_dollar_amount():
    from app.services.llm_rewrite import _sanitize_variant
    result = _sanitize_variant("Saved $150,000 in infrastructure costs")
    assert "[$150,000]" in result


def test_sanitize_wraps_millisecond_metric():
    from app.services.llm_rewrite import _sanitize_variant
    result = _sanitize_variant("Reduced p99 latency from 200ms to 50ms")
    assert "[200ms]" in result
    assert "[50ms]" in result


def test_sanitize_leaves_plain_text_alone():
    from app.services.llm_rewrite import _sanitize_variant
    text = "Built backend API supporting [N users] with [X%] uptime"
    assert _sanitize_variant(text) == text


def test_parse_variants_sanitizes_bare_metrics():
    content = "1. Reduced API latency by 45%, saving $20,000 annually across 3 regions."
    variants = parse_variants(content, 1)
    assert len(variants) == 1
    assert "[45%]" in variants[0]
    assert "[$20,000]" in variants[0]


# ---------------------------------------------------------------------------
# Variant scoring
# ---------------------------------------------------------------------------

def test_score_strong_verb_opening_rewarded():
    good = _variant_score("Built backend API for [N] services", [])
    weak = _variant_score("The backend API was built for [N] services", [])
    assert good > weak


def test_score_banned_opening_penalized():
    score_i     = _variant_score("I built the API", [])
    score_the   = _variant_score("The API was built", [])
    score_built = _variant_score("Built the API", [])
    assert score_built > score_i
    assert score_built > score_the


def test_score_jd_keyword_hit_rewarded():
    with_kw    = _variant_score("Deployed kubernetes clusters across [N] regions", ["kubernetes"])
    without_kw = _variant_score("Deployed container clusters across [N] regions", ["kubernetes"])
    assert with_kw > without_kw


def test_score_too_short_penalized():
    short  = _variant_score("Built it", [])
    normal = _variant_score("Built backend services for distributed team", [])
    assert normal > short


def test_score_too_many_placeholders_penalized():
    clean      = _variant_score("Built [N] services reducing latency by [X%]", [])
    overloaded = _variant_score("[Built] [N] [things] [reducing] [X%] by [Y] for [scope]", [])
    assert clean > overloaded


# ---------------------------------------------------------------------------
# Ranking
# ---------------------------------------------------------------------------

def test_rank_variants_returns_top_n():
    variants = [
        "I helped with things",                      # banned opening
        "Built backend API for [N] services",        # strong
        "The system was configured",                 # banned opening + passive
        "Deployed kubernetes clusters globally",     # strong + JD kw
        "Led migration of [N] microservices",        # strong
    ]
    ranked = rank_variants(variants, ["kubernetes"], 3)
    assert len(ranked) == 3


def test_rank_variants_prefers_strong_verb():
    variants = [
        "I managed the project",
        "Built scalable backend for [N] users",
    ]
    ranked = rank_variants(variants, [], 2)
    assert ranked[0].startswith("Built")


def test_rank_variants_deduplicates_similar_openings():
    variants = [
        "Built backend API for [N] services with [X%] uptime",
        "Built backend API for [N] clients across regions",  # identical 4-word prefix
        "Deployed kubernetes platform reducing latency by [X%]",
    ]
    ranked = rank_variants(variants, [], 3)
    # Only one "Built backend API for" variant should survive
    dup_count = sum(1 for v in ranked if v.startswith("Built backend API for"))
    assert dup_count <= 1


def test_rank_variants_fallback_when_all_weak():
    # All variants have banned openings — fallback should still return something
    variants = ["I did this", "My team did that", "The thing was done"]
    ranked = rank_variants(variants, [], 2)
    assert len(ranked) >= 1  # fallback ensures non-empty


def test_rank_variants_empty_input():
    assert rank_variants([], [], 3) == []


def test_rank_variants_deterministic():
    variants = [
        "Built backend API for [N] services",
        "Led migration to kubernetes",
        "I managed infrastructure",
        "Deployed pipeline reducing latency",
    ]
    result_a = rank_variants(variants, ["kubernetes"], 3)
    result_b = rank_variants(variants, ["kubernetes"], 3)
    assert result_a == result_b


# ---------------------------------------------------------------------------
# Status route
# ---------------------------------------------------------------------------

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
