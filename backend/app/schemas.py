from __future__ import annotations
from pydantic import BaseModel
from typing import Literal


class ScanRequest(BaseModel):
    jd_text: str


class Issue(BaseModel):
    issue_type: str
    severity: Literal["critical", "high", "medium", "low"]
    title: str
    description: str
    evidence: str = ""
    fix_pattern: str = ""
    rewrite_starter: str = ""
    source_excerpt: str
    suggested_fix: str
    impact_score: float


class Scores(BaseModel):
    overall: float
    keyword_match: float
    experience_alignment: float
    parse_integrity: float
    structure: float
    quantified_impact: float


class ScanSummary(BaseModel):
    scan_id: str
    source_id: str
    scanned_at: str
    overall_score: float


class LLMStatusResponse(BaseModel):
    available: bool
    model: str = ""
    healthy: bool | None = None


class RewriteRequest(BaseModel):
    issue_type: str
    original_text: str
    evidence: str = ""
    fix_pattern: str = ""
    rewrite_starter: str = ""
    jd_keywords: list[str] = []
    count: int = 3


class RewriteResponse(BaseModel):
    variants: list[str]
    available: bool
    model: str = ""
    error: str = ""


# ---------------------------------------------------------------------------
# ATS Profile Simulation schemas
# Labeled as profile simulations inspired by common ATS behavior patterns.
# Sub-scores and semantic inference are heuristics, not exact ATS replicas.
# ---------------------------------------------------------------------------

class ProfileResult(BaseModel):
    id: str
    label: str
    description: str
    score: int                                           # 0–100
    parse_quality: int                                   # 0–100
    keyword_match: int                                   # 0–100
    semantic_fit: int                                    # 0–100 (adjacent skill inference)
    structure_confidence: int                            # 0–100
    risk_level: Literal["LOW", "MEDIUM", "HIGH"]
    top_strengths: list[str]
    top_failures: list[str]
    lost_signals: list[str]
    recommended_fixes: list[str]


class ScoreSpread(BaseModel):
    min: int
    max: int
    delta: int
    volatility: Literal["LOW", "MEDIUM", "HIGH"]


class ProfileSimulationResult(BaseModel):
    profiles: list[ProfileResult]
    universal_fixes: list[str]
    score_spread: ScoreSpread
    cross_profile_summary: str


class RankedFix(BaseModel):
    issue_index: int          # 0-based index into ScanResult.issues
    issue_type: str
    title: str
    suggested_fix: str
    fix_pattern: str = ""
    labels: list[str]         # e.g. ["Must-have gap", "Broad impact", "Fast win"]
    affects_profiles: list[str]
    rank_score: float         # internal ranking value, exposed for transparency


class ScanResult(BaseModel):
    scan_id: str
    source_id: str
    ats_text_preview: str
    resume_sections: dict
    jd_requirements: dict
    scores: Scores
    issues: list[Issue]
    missing_keywords: list[str]
    matched_keywords: list[str]
    top_fixes: list[RankedFix] = []
    simulation: ProfileSimulationResult | None = None
