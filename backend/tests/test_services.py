"""
Unit tests for TraceRank backend services — no file I/O, no DB required.
"""
import pytest
from app.services.parse_sections import parse_resume_sections
from app.services.jd_requirements import extract_jd_requirements
from app.services.scoring import compute_scores
from app.services.rewrite_suggestions import generate_fix_suggestions


SAMPLE_RESUME = """
Summary
Experienced software engineer with 5 years building distributed systems.

Experience
Software Engineer at Acme Corp
- Led migration of monolith to microservices, reducing latency by 40%
- Built CI/CD pipeline using GitHub Actions and Docker
- Managed team of 5 engineers

Skills
Python, Go, Docker, Kubernetes, PostgreSQL, AWS

Education
B.S. Computer Science, MIT, 2018
"""

SAMPLE_JD = """
We are looking for a Senior Software Engineer with 4+ years of experience.
Requirements:
- Python and Go required
- Docker and Kubernetes experience
- Experience with AWS or GCP
- Strong communication skills
"""


def test_parse_sections_finds_experience():
    sections = parse_resume_sections(SAMPLE_RESUME)
    assert "experience" in sections
    assert "Engineer" in sections["experience"]


def test_parse_sections_finds_skills():
    sections = parse_resume_sections(SAMPLE_RESUME)
    assert "skills" in sections


def test_parse_sections_finds_education():
    sections = parse_resume_sections(SAMPLE_RESUME)
    assert "education" in sections


def test_jd_extract_finds_python():
    reqs = extract_jd_requirements(SAMPLE_JD)
    assert "python" in reqs["required_keywords"]


def test_jd_extract_finds_min_years():
    reqs = extract_jd_requirements(SAMPLE_JD)
    assert reqs["min_years_experience"] == 4


def test_scoring_returns_valid_range():
    sections = parse_resume_sections(SAMPLE_RESUME)
    reqs = extract_jd_requirements(SAMPLE_JD)
    scores = compute_scores(sections, reqs, parse_integrity=1.0)
    assert 0.0 <= scores.overall <= 1.0
    assert 0.0 <= scores.keyword_match <= 1.0


def test_scoring_populates_matched_keywords():
    sections = parse_resume_sections(SAMPLE_RESUME)
    reqs = extract_jd_requirements(SAMPLE_JD)
    compute_scores(sections, reqs, parse_integrity=1.0)
    assert len(reqs["matched_keywords"]) > 0


def test_fix_suggestions_flags_missing_keywords():
    sections = parse_resume_sections(SAMPLE_RESUME)
    reqs = extract_jd_requirements(SAMPLE_JD)
    compute_scores(sections, reqs, parse_integrity=1.0)
    issues = generate_fix_suggestions(sections, reqs)
    types = [i.issue_type for i in issues]
    assert any(t in types for t in ["keyword_gap", "weak_phrasing", "low_quantification", "missing_section", "summary_keyword_mismatch"])


def test_fix_suggestions_have_nonzero_impact_scores():
    sections = parse_resume_sections(SAMPLE_RESUME)
    reqs = extract_jd_requirements(SAMPLE_JD)
    compute_scores(sections, reqs, parse_integrity=1.0)
    issues = generate_fix_suggestions(sections, reqs)
    assert all(i.impact_score > 0 for i in issues)
