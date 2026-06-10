"""
Tests for Fix Order Engine.
All pure functions — no I/O, no DB, no HTTP.
"""
import pytest
from app.services.fix_ranker import rank_fixes
from app.services.scoring import RawSignals
from app.schemas import Issue


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _issue(
    issue_type: str = "keyword_gap",
    severity: str = "high",
    title: str = "Test issue",
    evidence: str = "",
    suggested_fix: str = "Fix it",
    fix_pattern: str = "",
    rewrite_starter: str = "",
    impact_score: float = 3.2,
) -> Issue:
    return Issue(
        issue_type=issue_type,
        severity=severity,
        title=title,
        description="desc",
        evidence=evidence,
        fix_pattern=fix_pattern,
        rewrite_starter=rewrite_starter,
        source_excerpt="",
        suggested_fix=suggested_fix,
        impact_score=impact_score,
    )


def _raw(
    missing_must_haves: set[str] | None = None,
    sections_missing: set[str] | None = None,
) -> RawSignals:
    return RawSignals(
        kw_exact=0.5,
        kw_must=0.5,
        adjacent=0.5,
        structure=0.5,
        parse_integrity=0.7,
        impact=0.4,
        experience=1.0,
        missing_must_haves=missing_must_haves or set(),
        sections_missing=sections_missing or set(),
    )


# ---------------------------------------------------------------------------
# Basic ranking
# ---------------------------------------------------------------------------

def test_returns_at_most_top_n():
    issues = [_issue() for _ in range(10)]
    result = rank_fixes(issues, _raw(), top_n=5)
    assert len(result) <= 5


def test_empty_issues_returns_empty():
    result = rank_fixes([], _raw())
    assert result == []


def test_single_issue_returned():
    result = rank_fixes([_issue()], _raw())
    assert len(result) == 1
    assert result[0].issue_index == 0


def test_issue_index_matches_position_in_input():
    issues = [
        _issue(issue_type="weak_phrasing", impact_score=1.0),
        _issue(issue_type="keyword_gap", impact_score=4.0),
    ]
    result = rank_fixes(issues, _raw())
    # keyword_gap (idx=1) scores higher due to type bonus
    assert result[0].issue_index == 1


# ---------------------------------------------------------------------------
# Ranking heuristics
# ---------------------------------------------------------------------------

def test_must_have_gap_boosts_rank():
    # keyword_gap on a must-have keyword should outrank same impact_score without must-have
    raw = _raw(missing_must_haves={"terraform"})
    must_have_issue = _issue(issue_type="keyword_gap", evidence="terraform", impact_score=3.2)
    plain_issue = _issue(issue_type="keyword_gap", evidence="docker", impact_score=3.2)
    result = rank_fixes([plain_issue, must_have_issue], raw)
    assert result[0].issue_index == 1  # must-have issue at index 1 ranked first


def test_critical_section_missing_boosts_rank():
    raw = _raw()
    section_issue = _issue(issue_type="missing_section", title="Missing Summary Section", impact_score=2.0)
    plain_issue = _issue(issue_type="keyword_gap", impact_score=2.0)
    result = rank_fixes([plain_issue, section_issue], raw)
    # missing_section gets +3.0 (critical) + 1.5 (broad) = +4.5 vs keyword_gap +1.5
    assert result[0].issue_index == 1


def test_rewrite_starter_bonus_applied():
    plain = _issue(issue_type="weak_phrasing", impact_score=3.0, rewrite_starter="")
    with_starter = _issue(issue_type="weak_phrasing", impact_score=3.0, rewrite_starter="Try: Led team of...")
    result = rank_fixes([plain, with_starter], _raw())
    assert result[0].issue_index == 1  # with_starter gets +1.0


def test_low_quantification_bonus_at_threshold():
    below = _issue(issue_type="low_quantification", impact_score=3.1)
    at_threshold = _issue(issue_type="low_quantification", impact_score=3.2)
    result = rank_fixes([below, at_threshold], _raw())
    # at_threshold gets +0.5 extra
    assert result[0].issue_index == 1


# ---------------------------------------------------------------------------
# Labels
# ---------------------------------------------------------------------------

def test_must_have_gap_label():
    raw = _raw(missing_must_haves={"aws"})
    issue = _issue(issue_type="keyword_gap", evidence="aws")
    result = rank_fixes([issue], raw)
    assert "Must-have gap" in result[0].labels


def test_critical_section_label():
    issue = _issue(issue_type="missing_section", title="Missing Experience Section")
    result = rank_fixes([issue], _raw())
    assert "Critical section" in result[0].labels


def test_broad_impact_label_on_keyword_gap():
    issue = _issue(issue_type="keyword_gap")
    result = rank_fixes([issue], _raw())
    assert "Broad impact" in result[0].labels


def test_broad_impact_label_on_missing_section():
    issue = _issue(issue_type="missing_section", title="Missing Skills Section")
    result = rank_fixes([issue], _raw())
    assert "Broad impact" in result[0].labels


def test_fast_win_label_when_rewrite_starter():
    issue = _issue(rewrite_starter="Try: Built scalable systems...")
    result = rank_fixes([issue], _raw())
    assert "Fast win" in result[0].labels


def test_no_fast_win_label_without_rewrite_starter():
    issue = _issue(rewrite_starter="")
    result = rank_fixes([issue], _raw())
    assert "Fast win" not in result[0].labels


def test_quantify_label_on_low_quantification():
    issue = _issue(issue_type="low_quantification")
    result = rank_fixes([issue], _raw())
    assert "Quantify" in result[0].labels


# ---------------------------------------------------------------------------
# affects_profiles
# ---------------------------------------------------------------------------

def test_keyword_gap_affects_all_profiles():
    issue = _issue(issue_type="keyword_gap")
    result = rank_fixes([issue], _raw())
    assert set(result[0].affects_profiles) == {"exact_match", "structure_sensitive", "adjacent_coverage"}


def test_missing_section_affects_all_profiles():
    issue = _issue(issue_type="missing_section", title="Missing Summary Section")
    result = rank_fixes([issue], _raw())
    assert set(result[0].affects_profiles) == {"exact_match", "structure_sensitive", "adjacent_coverage"}


def test_weak_phrasing_affects_two_profiles():
    issue = _issue(issue_type="weak_phrasing")
    result = rank_fixes([issue], _raw())
    assert set(result[0].affects_profiles) == {"exact_match", "adjacent_coverage"}


def test_summary_mismatch_affects_exact_match_only():
    issue = _issue(issue_type="summary_keyword_mismatch")
    result = rank_fixes([issue], _raw())
    assert result[0].affects_profiles == ["exact_match"]


# ---------------------------------------------------------------------------
# Determinism
# ---------------------------------------------------------------------------

def test_ranking_is_deterministic():
    import random
    raw = _raw(missing_must_haves={"terraform"})
    issues = [
        _issue(issue_type="keyword_gap", evidence="terraform", impact_score=3.2),
        _issue(issue_type="missing_section", title="Missing Summary Section", impact_score=2.0),
        _issue(issue_type="weak_phrasing", impact_score=2.4),
        _issue(issue_type="low_quantification", impact_score=3.2),
    ]
    result_a = rank_fixes(issues, raw)
    result_b = rank_fixes(issues, raw)
    assert [r.issue_index for r in result_a] == [r.issue_index for r in result_b]


def test_tie_broken_by_original_order():
    # Two identical issues — lower index should appear first
    issues = [
        _issue(issue_type="weak_phrasing", impact_score=2.0, rewrite_starter=""),
        _issue(issue_type="weak_phrasing", impact_score=2.0, rewrite_starter=""),
    ]
    result = rank_fixes(issues, _raw())
    assert result[0].issue_index < result[1].issue_index


# ---------------------------------------------------------------------------
# rank_score exposed
# ---------------------------------------------------------------------------

def test_rank_score_present_and_positive():
    result = rank_fixes([_issue()], _raw())
    assert result[0].rank_score > 0


def test_rank_score_reflects_bonuses():
    plain = _issue(issue_type="weak_phrasing", impact_score=3.0)
    with_starter = _issue(issue_type="weak_phrasing", impact_score=3.0, rewrite_starter="Try:")
    r_plain = rank_fixes([plain], _raw())
    r_starter = rank_fixes([with_starter], _raw())
    assert r_starter[0].rank_score > r_plain[0].rank_score
