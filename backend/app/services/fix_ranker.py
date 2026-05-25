"""
Fix Order Engine — deterministic ranking of issues into prioritized fix list.

Ranking formula (additive, no ML):
  rank_score = issue.impact_score
    + 3.0  if missing critical section (summary or experience)
    + 2.0  if keyword_gap and keyword is a must-have
    + 1.5  if issue_type broadly affects all profiles (keyword_gap, missing_section)
    + 1.0  if rewrite_starter present (fast win — actionable immediately)
    + 0.5  if low_quantification with high confidence (impact_score >= 3.2)

Labels (conservative, no overclaiming):
  "Must-have gap"     — keyword required by JD and not present
  "Critical section"  — section absent that most parsers need
  "Broad impact"      — affects all three profile types
  "Fast win"          — rewrite_starter present, low effort
  "Quantify"          — impact language missing, fixable with numbers
"""
from __future__ import annotations

from app.schemas import Issue, RankedFix
from app.services.scoring import RawSignals

# Issue types that hurt all three ATS profile archetypes
_BROAD_IMPACT_TYPES = {"keyword_gap", "missing_section"}

# Profiles affected per issue type
_AFFECTS: dict[str, list[str]] = {
    "keyword_gap":              ["exact_match", "structure_sensitive", "semantic_fit"],
    "missing_section":          ["exact_match", "structure_sensitive", "semantic_fit"],
    "weak_phrasing":            ["exact_match", "semantic_fit"],
    "low_quantification":       ["exact_match", "semantic_fit"],
    "summary_keyword_mismatch": ["exact_match"],
}
_AFFECTS_DEFAULT = ["exact_match"]

# Sections whose absence most parsers flag
_CRITICAL_SECTIONS = {"summary", "experience"}


def _rank_score(issue: Issue, raw: RawSignals) -> float:
    score = issue.impact_score

    if issue.issue_type == "missing_section":
        # Extract section name from title e.g. "Missing Summary Section" -> "summary"
        title_lower = issue.title.lower()
        for sec in _CRITICAL_SECTIONS:
            if sec in title_lower:
                score += 3.0
                break

    if issue.issue_type == "keyword_gap":
        # Check if evidence keyword is a must-have
        kw_lower = issue.evidence.lower().strip()
        if kw_lower and any(kw_lower in mh or mh in kw_lower for mh in raw.missing_must_haves):
            score += 2.0

    if issue.issue_type in _BROAD_IMPACT_TYPES:
        score += 1.5

    if issue.rewrite_starter:
        score += 1.0

    if issue.issue_type == "low_quantification" and issue.impact_score >= 3.2:
        score += 0.5

    return score


def _labels(issue: Issue, raw: RawSignals) -> list[str]:
    tags: list[str] = []

    if issue.issue_type == "keyword_gap":
        kw_lower = issue.evidence.lower().strip()
        if kw_lower and any(kw_lower in mh or mh in kw_lower for mh in raw.missing_must_haves):
            tags.append("Must-have gap")

    if issue.issue_type == "missing_section":
        title_lower = issue.title.lower()
        if any(sec in title_lower for sec in _CRITICAL_SECTIONS):
            tags.append("Critical section")

    if issue.issue_type in _BROAD_IMPACT_TYPES:
        tags.append("Broad impact")

    if issue.rewrite_starter:
        tags.append("Fast win")

    if issue.issue_type == "low_quantification":
        tags.append("Quantify")

    return tags


def rank_fixes(
    issues: list[Issue],
    raw: RawSignals,
    *,
    top_n: int = 5,
) -> list[RankedFix]:
    """
    Rank issues deterministically and return up to top_n RankedFix entries.
    Ties broken by original issue order (stable sort).
    """
    scored: list[tuple[float, int, Issue]] = [
        (_rank_score(issue, raw), idx, issue)
        for idx, issue in enumerate(issues)
    ]
    # Descending by rank_score, stable on idx for tie-breaking
    scored.sort(key=lambda t: (-t[0], t[1]))

    result: list[RankedFix] = []
    for rank_score_val, orig_idx, issue in scored[:top_n]:
        result.append(RankedFix(
            issue_index=orig_idx,
            issue_type=issue.issue_type,
            title=issue.title,
            suggested_fix=issue.suggested_fix,
            fix_pattern=issue.fix_pattern,
            labels=_labels(issue, raw),
            affects_profiles=_AFFECTS.get(issue.issue_type, _AFFECTS_DEFAULT),
            rank_score=round(rank_score_val, 3),
        ))

    return result
