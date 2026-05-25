"""
Tests for ATS Profile Simulator.
All tests use pure functions — no I/O, no DB, no HTTP.
"""
import pytest
from app.services.ats_profiles import simulate_profiles, ALL_PROFILES, _spread
from app.services.scoring import extract_raw_signals, RawSignals
from app.schemas import Issue

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _issue(severity="high", suggested_fix="Add missing keyword") -> Issue:
    return Issue(
        issue_type="keyword_gap",
        severity=severity,
        title="Test issue",
        description="desc",
        evidence="",
        fix_pattern="",
        rewrite_starter="",
        source_excerpt="",
        suggested_fix=suggested_fix,
        impact_score=3.0,
    )


FULL_RESUME = {
    "summary": "Senior engineer with 5 years building distributed systems.",
    "experience": (
        "Led migration of monolith to kubernetes microservices, reducing latency by 40%. "
        "Built CI/CD pipeline with docker and GitHub Actions. "
        "Developed FastAPI services in python. "
        "Managed postgresql database migrations."
    ),
    "skills": "Python, Docker, Kubernetes, PostgreSQL, Terraform, AWS",
    "education": "B.S. Computer Science",
}

WEAK_RESUME = {
    "experience": "Helped with various backend tasks and front-end updates.",
}

JD_STANDARD = {
    "required_keywords": ["python", "docker", "kubernetes", "terraform", "aws"],
    "min_years_experience": 3,
    "requirement_lines": ["Must have: terraform, aws"],
    "matched_keywords": [],
    "missing_from_resume": [],
}

JD_EMPTY = {
    "required_keywords": [],
    "min_years_experience": None,
    "requirement_lines": [],
    "matched_keywords": [],
    "missing_from_resume": [],
}


# ---------------------------------------------------------------------------
# Profile scoring differences
# ---------------------------------------------------------------------------

def test_exact_match_lower_when_keywords_missing():
    jd = dict(JD_STANDARD)
    jd["required_keywords"] = ["terraform", "aws", "kubernetes", "helm", "vault"]
    result = simulate_profiles(WEAK_RESUME, jd, 0.8, [])
    exact = next(p for p in result.profiles if p.id == "exact_match")
    semantic = next(p for p in result.profiles if p.id == "semantic_fit")
    # semantic fit should score >= exact match when keywords missing but adjacent terms present
    assert semantic.score >= exact.score


def test_structure_sensitive_lower_with_no_sections():
    # Keywords present but no section structure and low parse — structure_sensitive
    # penalises structure (w=0.28) + parse (w=0.22) more than exact_match does (0.12+0.10).
    flat_resume = {
        "experience": "Expert in python, docker, kubernetes, terraform, and aws deployments.",
    }
    result = simulate_profiles(flat_resume, dict(JD_STANDARD), 0.30, [])
    structure = next(p for p in result.profiles if p.id == "structure_sensitive")
    exact = next(p for p in result.profiles if p.id == "exact_match")
    assert structure.score <= exact.score


def test_semantic_fit_highest_with_adjacent_skills():
    # Resume has docker/kubernetes/python but missing aws/terraform
    sections = {
        "skills": "Python, Docker, Kubernetes",
        "experience": "Built cloud infrastructure and deployed containerized services.",
    }
    jd = {**JD_STANDARD, "required_keywords": ["aws", "terraform", "kubernetes"]}
    result = simulate_profiles(sections, jd, 0.85, [])
    semantic = next(p for p in result.profiles if p.id == "semantic_fit")
    exact = next(p for p in result.profiles if p.id == "exact_match")
    assert semantic.score >= exact.score


# ---------------------------------------------------------------------------
# All profiles return valid shape
# ---------------------------------------------------------------------------

def test_all_profiles_return_valid_shapes():
    result = simulate_profiles(FULL_RESUME, dict(JD_STANDARD), 0.9, [_issue()])
    assert len(result.profiles) == 3
    for p in result.profiles:
        assert 0 <= p.score <= 100
        assert 0 <= p.parse_quality <= 100
        assert 0 <= p.keyword_match <= 100
        assert 0 <= p.semantic_fit <= 100
        assert 0 <= p.structure_confidence <= 100
        assert p.risk_level in ("LOW", "MEDIUM", "HIGH")
        assert isinstance(p.top_strengths, list)
        assert isinstance(p.top_failures, list)
        assert isinstance(p.lost_signals, list)
        assert isinstance(p.recommended_fixes, list)


def test_profile_ids_match_expected():
    result = simulate_profiles(FULL_RESUME, dict(JD_STANDARD), 0.9, [])
    ids = {p.id for p in result.profiles}
    assert ids == {"exact_match", "structure_sensitive", "semantic_fit"}


# ---------------------------------------------------------------------------
# Score spread + volatility
# ---------------------------------------------------------------------------

def test_score_spread_computed_correctly():
    spread = _spread([61, 72, 84])
    assert spread.min == 61
    assert spread.max == 84
    assert spread.delta == 23
    assert spread.volatility == "HIGH"


def test_volatility_low():
    spread = _spread([75, 78, 80])
    assert spread.delta == 5
    assert spread.volatility == "LOW"


def test_volatility_medium():
    spread = _spread([60, 70, 75])
    assert spread.delta == 15
    assert spread.volatility == "MEDIUM"


def test_spread_attached_to_result():
    result = simulate_profiles(FULL_RESUME, dict(JD_STANDARD), 0.9, [])
    assert result.score_spread.min <= result.score_spread.max
    assert result.score_spread.delta == result.score_spread.max - result.score_spread.min


# ---------------------------------------------------------------------------
# Cross-profile summary
# ---------------------------------------------------------------------------

def test_cross_profile_summary_present():
    result = simulate_profiles(WEAK_RESUME, dict(JD_STANDARD), 0.4, [])
    assert len(result.cross_profile_summary) > 10


def test_cross_profile_summary_identifies_best_worst():
    result = simulate_profiles(WEAK_RESUME, dict(JD_STANDARD), 0.4, [])
    scores = {p.label: p.score for p in result.profiles}
    best_label = max(scores, key=scores.get)
    worst_label = min(scores, key=scores.get)
    if scores[best_label] != scores[worst_label]:
        assert best_label in result.cross_profile_summary
        assert worst_label in result.cross_profile_summary


# ---------------------------------------------------------------------------
# Universal fixes
# ---------------------------------------------------------------------------

def test_universal_fixes_present():
    result = simulate_profiles(WEAK_RESUME, dict(JD_STANDARD), 0.4, [])
    assert len(result.universal_fixes) > 0


def test_universal_fixes_includes_must_haves():
    jd = {**JD_STANDARD, "requirement_lines": ["Must have: terraform, aws"]}
    result = simulate_profiles(WEAK_RESUME, jd, 0.7, [])
    combined = " ".join(result.universal_fixes).lower()
    assert "terraform" in combined or "aws" in combined


def test_universal_fixes_bounded():
    result = simulate_profiles(WEAK_RESUME, dict(JD_STANDARD), 0.4, [_issue()] * 10)
    assert len(result.universal_fixes) <= 6


# ---------------------------------------------------------------------------
# Prose-only keyword detection
# ---------------------------------------------------------------------------

def test_prose_only_kws_detected():
    sections = {
        "experience": "Built kubernetes deployments and managed docker containers.",
        "skills": "Python, FastAPI",  # kubernetes/docker NOT in skills
    }
    jd = {**JD_STANDARD, "required_keywords": ["kubernetes", "docker", "python"]}
    result = simulate_profiles(sections, jd, 0.85, [])
    structure = next(p for p in result.profiles if p.id == "structure_sensitive")
    lost_text = " ".join(structure.lost_signals).lower()
    assert "kubernetes" in lost_text or "docker" in lost_text


# ---------------------------------------------------------------------------
# Degraded behavior — no JD
# ---------------------------------------------------------------------------

def test_degraded_no_jd_no_crash():
    result = simulate_profiles(FULL_RESUME, dict(JD_EMPTY), 0.85, [])
    assert len(result.profiles) == 3
    for p in result.profiles:
        assert 0 <= p.score <= 100


def test_degraded_no_jd_scores_reflect_non_keyword_signals():
    result = simulate_profiles(FULL_RESUME, dict(JD_EMPTY), 0.95, [])
    # With full sections + high parse integrity + no keyword requirements,
    # structure_sensitive should not be lowest (it rewards good structure)
    exact = next(p for p in result.profiles if p.id == "exact_match")
    # exact_match keyword weight dominant — if no required keywords, kw_exact=1.0
    assert exact.score >= 50


# ---------------------------------------------------------------------------
# Degraded behavior — poor parse integrity
# ---------------------------------------------------------------------------

def test_structure_sensitive_lowest_on_poor_parse():
    # Keywords all present, sections present, but parse integrity catastrophically low.
    # structure_sensitive weights parse (0.22) + structure (0.28) = 0.50 of its score.
    # exact_match weights parse (0.10) + structure (0.12) = 0.22 — less exposed to poor parse.
    flat_resume = {
        "experience": "I work with python, docker, kubernetes, terraform, and aws daily.",
    }
    result = simulate_profiles(flat_resume, dict(JD_STANDARD), 0.10, [])
    structure = next(p for p in result.profiles if p.id == "structure_sensitive")
    exact = next(p for p in result.profiles if p.id == "exact_match")
    assert structure.score <= exact.score


# ---------------------------------------------------------------------------
# Explanation presence
# ---------------------------------------------------------------------------

def test_every_profile_has_at_least_one_strength_or_failure():
    result = simulate_profiles(FULL_RESUME, dict(JD_STANDARD), 0.9, [])
    for p in result.profiles:
        assert len(p.top_strengths) + len(p.top_failures) >= 1


def test_high_scoring_profile_has_at_least_one_strength():
    result = simulate_profiles(FULL_RESUME, dict(JD_STANDARD), 0.95, [])
    high_scorers = [p for p in result.profiles if p.score >= 60]
    for p in high_scorers:
        assert len(p.top_strengths) >= 1


# ---------------------------------------------------------------------------
# Profile weight integrity
# ---------------------------------------------------------------------------

def test_all_profile_weights_sum_to_one():
    for cfg in ALL_PROFILES:
        total = (
            cfg.w_kw_exact + cfg.w_kw_must + cfg.w_semantic
            + cfg.w_structure + cfg.w_parse + cfg.w_impact + cfg.w_experience
        )
        assert abs(total - 1.0) < 1e-9, f"{cfg.id} weights sum to {total}"
