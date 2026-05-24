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
