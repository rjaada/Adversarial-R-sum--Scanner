from __future__ import annotations
from pydantic import BaseModel, field_validator, EmailStr
from typing import Literal, Union, Optional

EventPropertyValue = Union[str, int, float, bool, None]

_ALLOWED_EVENTS = {
    "scan_completed",
    "rewrite_requested",
    "export_triggered",
    "compare_started",
    "fix_clicked",
}

_BLOCKED_KEY_FRAGMENTS = {"resume", "jd_text", "jd", "email", "name", "phone", "text", "filename", "excerpt"}


class AnalyticsEvent(BaseModel):
    event: str
    properties: dict[str, EventPropertyValue] = {}

    @field_validator("event")
    @classmethod
    def _valid_event(cls, v: str) -> str:
        if v not in _ALLOWED_EVENTS:
            raise ValueError(f"Unknown event '{v}'")
        return v

    @field_validator("properties")
    @classmethod
    def _safe_properties(cls, v: dict[str, EventPropertyValue]) -> dict[str, EventPropertyValue]:
        for key in v:
            key_lower = key.lower()
            for fragment in _BLOCKED_KEY_FRAGMENTS:
                if fragment in key_lower:
                    raise ValueError(f"Property key '{key}' rejected — may contain sensitive content")
            if isinstance(v[key], str) and len(v[key]) > 200:  # type: ignore[arg-type]
                raise ValueError(f"Property '{key}' string value exceeds 200 chars")
        if len(v) > 20:
            raise ValueError("Too many properties")
        return v


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
# These profiles are heuristic simulations, not replicas of any real ATS vendor.
# ---------------------------------------------------------------------------

class ProfileResult(BaseModel):
    id: str
    label: str
    description: str
    score: int
    parse_quality: int
    keyword_match: int
    adjacent_skills: int
    structure_confidence: int
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
    issue_index: int
    issue_type: str
    title: str
    suggested_fix: str
    fix_pattern: str = ""
    labels: list[str]
    affects_profiles: list[str]
    rank_score: float


class ScanResult(BaseModel):
    scan_id: str
    source_id: str
    ats_text_preview: str = ""
    resume_sections: dict = {}
    jd_requirements: dict = {}
    scores: Scores
    issues: list[Issue]
    missing_keywords: list[str]
    matched_keywords: list[str]
    # keyword -> "hard" | "soft" | "buzzword" for every keyword in the two
    # lists above (plus JD buzzwords). Additive; scoring is hard-skill only.
    keyword_categories: dict[str, str] = {}
    # keyword -> {"jd": n, "resume": m} occurrence counts (gap #3 — frequency,
    # not just presence). Display-only.
    keyword_frequencies: dict[str, dict[str, int]] = {}
    # Named formatting checklist (gap #2): {check, status: pass|fail|warn, detail}
    formatting_audit: list[dict] = []
    # keyword -> the synonym/alias that actually matched, when it differs
    # (gap #6 — shown as ✓ postgresql ≈ "postgres"; never a fake exact hit).
    matched_via: dict[str, str] = {}


class RescanRequest(BaseModel):
    """Live edit-and-rescore (gap #5): re-score edited TEXT without a file."""
    text: str
    jd_text: str
    # Carried from the original upload so the composite stays comparable —
    # text edits can't change how the original FILE parses.
    parse_integrity: float = 1.0


class RescanResult(BaseModel):
    scores: Scores
    issues: list[Issue]
    total_issues: int
    missing_keywords: list[str]
    matched_keywords: list[str]
    keyword_categories: dict[str, str] = {}
    keyword_frequencies: dict[str, dict[str, int]] = {}
    matched_via: dict[str, str] = {}
    top_fixes: list[RankedFix] = []
    simulation: ProfileSimulationResult | None = None
    # Gating metadata. `gated` is True when the response has been reduced for
    # an unauthenticated caller (issues truncated, preview/simulation/keyword
    # gaps stripped server-side). `total_issues` is the true issue count
    # before truncation, so the UI can show an accurate "N more — sign in".
    gated: bool = False
    total_issues: int = 0


# ---------------------------------------------------------------------------
# Account / user schemas
# ---------------------------------------------------------------------------

class UserProfile(BaseModel):
    clerk_user_id: str
    plan: str
    theme_pref: Optional[str] = None
    bench_opt_in: bool = False


class ThemePrefUpdate(BaseModel):
    theme_pref: Literal["dark", "light"]


class WaitlistEntry(BaseModel):
    email: str


# ---------------------------------------------------------------------------
# Beta feedback
# ---------------------------------------------------------------------------

_USEFULNESS   = {"very_useful", "somewhat_useful", "not_useful"}
_TRUST        = {"very_trustworthy", "somewhat_trustworthy", "not_trustworthy"}
_HELPFUL      = {"keyword_gaps", "missing_sections", "rewrites", "review_view", "score", "other"}
_REPORT_TYPE  = {"bug", "confusing_result", "feature_request", "general"}
_SURFACE      = {"end_of_scan", "report_problem"}


class FeedbackPayload(BaseModel):
    surface: str

    # Survey (end_of_scan)
    usefulness:      Optional[str] = None
    trustworthiness: Optional[str] = None
    most_helpful:    Optional[str] = None
    confusing_text:  Optional[str] = None
    broken:          Optional[bool] = None
    broken_text:     Optional[str] = None

    # Bug / problem report
    report_type: Optional[str] = None
    report_text: Optional[str] = None

    # Contact opt-in
    contact_email: Optional[str] = None

    # Context metadata
    scan_id:     Optional[str] = None
    view_mode:   Optional[str] = None
    route:       Optional[str] = None
    user_agent:  Optional[str] = None
    app_version: Optional[str] = None

    @field_validator("surface")
    @classmethod
    def _valid_surface(cls, v: str) -> str:
        if v not in _SURFACE:
            raise ValueError(f"Invalid surface '{v}'")
        return v

    @field_validator("usefulness")
    @classmethod
    def _valid_usefulness(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in _USEFULNESS:
            raise ValueError(f"Invalid usefulness '{v}'")
        return v

    @field_validator("trustworthiness")
    @classmethod
    def _valid_trust(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in _TRUST:
            raise ValueError(f"Invalid trustworthiness '{v}'")
        return v

    @field_validator("most_helpful")
    @classmethod
    def _valid_helpful(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in _HELPFUL:
            raise ValueError(f"Invalid most_helpful '{v}'")
        return v

    @field_validator("report_type")
    @classmethod
    def _valid_report_type(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in _REPORT_TYPE:
            raise ValueError(f"Invalid report_type '{v}'")
        return v

    @field_validator("confusing_text", "broken_text", "report_text")
    @classmethod
    def _trim_text(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        trimmed = v.strip()
        return trimmed[:2000] if trimmed else None

    @field_validator("contact_email")
    @classmethod
    def _trim_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        trimmed = v.strip()[:254]
        return trimmed if trimmed else None

    @field_validator("scan_id", "view_mode", "route", "user_agent", "app_version")
    @classmethod
    def _trim_meta(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return v.strip()[:500]


class PurgeResult(BaseModel):
    deleted: int


class ClaimScanRequest(BaseModel):
    result: dict  # full ScanResult as dict — validated and stripped server-side
    scanned_at: str
