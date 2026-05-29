"""
ATS Profile Simulator — deterministic, explainable multi-profile scoring.

Simulates how different ATS-style pipelines score the same résumé/JD pair by
applying different signal weights to the same raw extracted signals.

IMPORTANT: These are profile simulations inspired by common ATS behavior
patterns. They are NOT exact replicas of Greenhouse, Lever, Workday, or any
other real system. Semantic scoring uses adjacent skill inference heuristics,
not true NLP similarity.
"""
from __future__ import annotations
from dataclasses import dataclass

from app.schemas import Issue, ProfileResult, ProfileSimulationResult, ScoreSpread
from app.services.scoring import RawSignals


# ---------------------------------------------------------------------------
# Profile configuration
# Each profile weight set must sum to 1.0.
# All weights are explicit and tunable here.
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ProfileConfig:
    id: str
    label: str
    description: str
    w_kw_exact: float       # exact keyword overlap
    w_kw_must: float        # must-have keyword coverage
    w_adjacent: float       # adjacent skill inference (heuristic)
    w_structure: float      # section completeness
    w_parse: float          # parse integrity
    w_impact: float         # evidence / quantification density
    w_experience: float     # years-of-experience match


EXACT_MATCH = ProfileConfig(
    id="exact_match",
    label="Exact Match",
    description=(
        "Rewards exact keyword overlap; heavily penalises missing must-have terms; "
        "uses only light adjacent skill inference. Simulates keyword-first screening."
    ),
    w_kw_exact=0.35,
    w_kw_must=0.20,
    w_adjacent=0.08,
    w_structure=0.12,
    w_parse=0.10,
    w_impact=0.08,
    w_experience=0.07,
)

STRUCTURE_SENSITIVE = ProfileConfig(
    id="structure_sensitive",
    label="Structure Sensitive",
    description=(
        "Penalises ambiguous or fragmented formatting; rewards clearly parsed sections, "
        "date ranges, and dedicated skills blocks. Skills buried in prose may not register."
    ),
    w_kw_exact=0.18,
    w_kw_must=0.12,
    w_adjacent=0.08,
    w_structure=0.28,
    w_parse=0.22,
    w_impact=0.06,
    w_experience=0.06,
)

ADJACENT_COVERAGE = ProfileConfig(
    id="adjacent_coverage",
    label="Transferable Skills",
    description=(
        "Broader matching using adjacent skill inference; rewards transferable and "
        "contextually relevant experience. Still considers exact keywords but less "
        "aggressively. Heuristic — not true semantic embedding."
    ),
    w_kw_exact=0.14,
    w_kw_must=0.10,
    w_adjacent=0.30,
    w_structure=0.13,
    w_parse=0.10,
    w_impact=0.13,
    w_experience=0.10,
)

ALL_PROFILES: list[ProfileConfig] = [EXACT_MATCH, STRUCTURE_SENSITIVE, ADJACENT_COVERAGE]


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

def _score_profile(cfg: ProfileConfig, sig: RawSignals) -> float:
    return min(1.0, (
        sig.kw_exact          * cfg.w_kw_exact
        + sig.kw_must         * cfg.w_kw_must
        + sig.adjacent        * cfg.w_adjacent
        + sig.structure       * cfg.w_structure
        + sig.parse_integrity * cfg.w_parse
        + sig.impact          * cfg.w_impact
        + sig.experience      * cfg.w_experience
    ))


def _risk(score: int) -> str:
    if score >= 70:
        return "LOW"
    if score >= 50:
        return "MEDIUM"
    return "HIGH"


# ---------------------------------------------------------------------------
# Explainability templates
# ---------------------------------------------------------------------------

def _strengths(cfg: ProfileConfig, sig: RawSignals, score: int) -> list[str]:
    out: list[str] = []

    if sig.kw_exact >= 0.80:
        n, m = len(sig.matched_kws), len(sig.matched_kws) + len(sig.missing_kws)
        out.append(f"Strong keyword coverage: {n} of {m} required terms present")
    elif sig.kw_exact >= 0.60:
        out.append(f"Reasonable keyword coverage ({round(sig.kw_exact * 100)}%)")

    if sig.parse_integrity >= 0.85 and cfg.w_parse >= 0.15:
        out.append("Clean parse: résumé structure extracted with high confidence")

    if sig.structure >= 0.75 and cfg.w_structure >= 0.15:
        secs = ", ".join(sorted(sig.sections_found))
        out.append(f"All expected sections found: {secs}")

    if sig.adjacent >= 0.75 and cfg.w_adjacent >= 0.20:
        out.append("Adjacent skill signals cover most missing required terms")

    if sig.impact >= 0.75:
        out.append("Strong evidence density: quantified impact language throughout")

    if sig.experience >= 1.0:
        out.append("Experience requirement met or exceeded")

    if sig.kw_must >= 1.0 and sig.must_haves:
        out.append(f"All {len(sig.must_haves)} must-have terms present")

    return out[:3]


def _failures(cfg: ProfileConfig, sig: RawSignals, score: int) -> list[str]:
    out: list[str] = []

    if sig.missing_must_haves:
        terms = ", ".join(sorted(sig.missing_must_haves)[:4])
        out.append(f"Missing must-have term(s): {terms}")

    if sig.kw_exact < 0.50:
        missing = ", ".join(sorted(sig.missing_kws)[:5])
        out.append(f"Keyword gap: {round((1 - sig.kw_exact) * 100)}% of required terms absent ({missing})")
    elif sig.kw_exact < 0.70:
        out.append(f"Partial keyword coverage: {round(sig.kw_exact * 100)}%")

    if sig.sections_missing and cfg.w_structure >= 0.15:
        secs = ", ".join(sorted(sig.sections_missing))
        out.append(f"Section extraction incomplete: {secs} not found")

    if sig.prose_only_kws and cfg.id == "structure_sensitive":
        n = len(sig.prose_only_kws)
        out.append(f"{n} skill(s) only found in prose — may not register in this profile")

    if sig.parse_integrity < 0.60 and cfg.w_parse >= 0.15:
        out.append(f"Low parse integrity ({round(sig.parse_integrity * 100)}%): formatting may confuse parsers")

    if sig.impact < 0.40:
        out.append("Low evidence density: few quantified or impact-oriented bullets")

    if sig.adjacent < 0.50 and cfg.w_adjacent >= 0.20:
        out.append("Adjacent skill inference found limited transferable signals")

    return out[:3]


def _lost_signals(cfg: ProfileConfig, sig: RawSignals) -> list[str]:
    out: list[str] = []
    if cfg.id == "structure_sensitive" and sig.prose_only_kws:
        for kw in sorted(sig.prose_only_kws)[:3]:
            out.append(f"'{kw}' detected in experience body only — may be skipped without a skills block")
    if cfg.id == "exact_match" and sig.adjacent > sig.kw_exact + 0.15:
        out.append("Adjacent skills present but not exact matches — no credit in this profile")
    if sig.sections_missing:
        for s in sorted(sig.sections_missing)[:2]:
            out.append(f"'{s}' section absent — signals from that block unavailable")
    return out[:3]


def _recommended_fixes(
    cfg: ProfileConfig,
    sig: RawSignals,
    base_issues: list[Issue],
) -> list[str]:
    fixes: list[str] = []
    if sig.missing_must_haves:
        terms = ", ".join(sorted(sig.missing_must_haves)[:3])
        fixes.append(f"Add must-have keywords to résumé: {terms}")
    if cfg.id == "structure_sensitive" and sig.prose_only_kws:
        terms = ", ".join(sorted(sig.prose_only_kws)[:3])
        fixes.append(f"Move '{terms}' into a dedicated skills block")
    if sig.sections_missing:
        fixes.append(f"Add missing sections: {', '.join(sorted(sig.sections_missing))}")
    for issue in base_issues:
        if issue.severity in ("critical", "high") and issue.suggested_fix:
            fixes.append(issue.suggested_fix)
            if len(fixes) >= 4:
                break
    return fixes[:4]


# ---------------------------------------------------------------------------
# Cross-profile explanation
# ---------------------------------------------------------------------------

def _cross_profile_summary(results: list[ProfileResult]) -> str:
    if not results:
        return ""
    best = max(results, key=lambda r: r.score)
    worst = min(results, key=lambda r: r.score)
    delta = best.score - worst.score
    if delta == 0:
        return f"All profiles scored {best.score} — résumé performance is consistent."
    parts = [f"Best in {best.label} ({best.score}), weakest in {worst.label} ({worst.score}). {delta}-pt spread."]
    # Explain the driver
    if worst.id == "structure_sensitive":
        parts.append("Structure-Sensitive score lower due to section or formatting signals.")
    elif worst.id == "exact_match":
        parts.append("Exact-Match score lower due to keyword gap.")
    elif worst.id == "adjacent_coverage":
        parts.append("Transferable Skills score lower — adjacent skill inference found limited overlap.")
    return " ".join(parts)


# ---------------------------------------------------------------------------
# Universal fixes
# ---------------------------------------------------------------------------

def _universal_fixes(sig: RawSignals, base_issues: list[Issue]) -> list[str]:
    """Fixes likely to improve ALL profile scores simultaneously."""
    fixes: list[str] = []
    if sig.missing_must_haves:
        terms = ", ".join(sorted(sig.missing_must_haves)[:4])
        fixes.append(f"Add must-have keywords to résumé: {terms}")
    if sig.prose_only_kws:
        terms = ", ".join(sorted(sig.prose_only_kws)[:4])
        fixes.append(f"Move '{terms}' from prose into a dedicated skills section")
    if sig.sections_missing:
        fixes.append(f"Add missing sections: {', '.join(sorted(sig.sections_missing))}")
    if sig.kw_exact < 0.50:
        fixes.append("Keyword coverage below 50% — align résumé terminology with JD language")
    if sig.impact < 0.40:
        fixes.append("Add quantified impact to 2–3 bullets (%, $, scale, or time saved)")
    for issue in base_issues:
        if issue.severity in ("critical", "high") and issue.suggested_fix:
            candidate = issue.suggested_fix
            if candidate not in fixes:
                fixes.append(candidate)
        if len(fixes) >= 6:
            break
    return fixes[:6]


# ---------------------------------------------------------------------------
# Score spread / volatility
# ---------------------------------------------------------------------------

def _spread(scores: list[int]) -> ScoreSpread:
    lo, hi = min(scores), max(scores)
    delta = hi - lo
    if delta < 10:
        vol = "LOW"
    elif delta < 20:
        vol = "MEDIUM"
    else:
        vol = "HIGH"
    return ScoreSpread(min=lo, max=hi, delta=delta, volatility=vol)


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def simulate_profiles(
    resume_sections: dict,
    jd_requirements: dict,
    parse_integrity: float,
    base_issues: list[Issue],
) -> ProfileSimulationResult:
    """
    Run all profile simulations against pre-extracted signals.
    Returns ProfileSimulationResult with per-profile breakdowns and universal fixes.
    jd_requirements must already contain matched_keywords / missing_from_resume
    (populated by extract_raw_signals beforehand).
    """
    from app.services.scoring import extract_raw_signals

    # Pass a copy so we don't double-mutate jd_requirements already processed by scan.py
    sig = extract_raw_signals(resume_sections, dict(jd_requirements), parse_integrity)

    profile_results: list[ProfileResult] = []
    for cfg in ALL_PROFILES:
        raw_score = _score_profile(cfg, sig)
        score_int = round(raw_score * 100)

        strengths = _strengths(cfg, sig, score_int)
        failures = _failures(cfg, sig, score_int)
        lost = _lost_signals(cfg, sig)
        fixes = _recommended_fixes(cfg, sig, base_issues)

        profile_results.append(ProfileResult(
            id=cfg.id,
            label=cfg.label,
            description=cfg.description,
            score=score_int,
            parse_quality=round(sig.parse_integrity * 100),
            keyword_match=round(sig.kw_exact * 100),
            adjacent_skills=round(sig.adjacent * 100),
            structure_confidence=round(sig.structure * 100),
            risk_level=_risk(score_int),
            top_strengths=strengths,
            top_failures=failures,
            lost_signals=lost,
            recommended_fixes=fixes,
        ))

    univ = _universal_fixes(sig, base_issues)
    spread = _spread([r.score for r in profile_results])
    summary = _cross_profile_summary(profile_results)

    return ProfileSimulationResult(
        profiles=profile_results,
        universal_fixes=univ,
        score_spread=spread,
        cross_profile_summary=summary,
    )
