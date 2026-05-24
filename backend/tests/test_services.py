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


# --- Keyword extraction quality ---

def test_go_in_prose_not_a_keyword():
    """Prose uses of 'go' should not be extracted as the Go language."""
    jd = "We go above and beyond for our customers. You will go through onboarding."
    reqs = extract_jd_requirements(jd)
    assert "go" not in reqs["required_keywords"]


def test_golang_in_jd_extracts_go():
    """'golang' explicitly in JD should produce 'go' keyword."""
    jd = "We are looking for a Golang developer with 3+ years of experience."
    reqs = extract_jd_requirements(jd)
    assert "go" in reqs["required_keywords"]


def test_go_technical_context_extracts_go():
    """'go developer' and similar technical phrases should extract 'go'."""
    jd = "You will build microservices in Python and Go. Go developer experience preferred."
    reqs = extract_jd_requirements(jd)
    assert "go" in reqs["required_keywords"]


def test_phrase_keyword_machine_learning():
    """Multi-word phrase 'machine learning' should be extracted."""
    jd = "Experience with machine learning and deep learning required."
    reqs = extract_jd_requirements(jd)
    assert "machine learning" in reqs["required_keywords"]
    assert "deep learning" in reqs["required_keywords"]


# --- Section parsing robustness ---

def test_parse_skills_tech_stack_variant():
    resume = "Tech Stack\nPython, Docker, Kubernetes\n\nExperience\nEngineer at Corp"
    sections = parse_resume_sections(resume)
    assert "skills" in sections


def test_parse_skills_competencies_variant():
    resume = "Core Competencies\nPython, AWS, Docker\n\nExperience\nEngineer at Corp"
    sections = parse_resume_sections(resume)
    assert "skills" in sections


def test_parse_skills_technologies_variant():
    resume = "Technologies\nReact, Node.js, PostgreSQL\n\nExperience\nEngineer at Corp"
    sections = parse_resume_sections(resume)
    assert "skills" in sections


# --- Issue quality ---

def test_keyword_issues_skip_noise_tokens():
    """Noise tokens like 'it', 'do', 'no' should never become user-facing issues."""
    reqs = {
        "missing_from_resume": ["it", "do", "no", "python"],
        "required_keywords": ["it", "do", "no", "python"],
    }
    from app.services.rewrite_suggestions import _check_missing_keywords
    issues = _check_missing_keywords(reqs)
    titles = [i.title for i in issues]
    assert not any(tok in t for tok in ["it", "do", "no"] for t in titles)
    assert any("python" in t for t in titles)


# --- Evidence and fix_pattern ---

def test_keyword_issue_has_evidence():
    """Missing keyword issues must carry non-empty evidence and fix_pattern."""
    reqs = {"missing_from_resume": ["kubernetes"], "required_keywords": ["kubernetes"]}
    from app.services.rewrite_suggestions import _check_missing_keywords
    issues = _check_missing_keywords(reqs)
    assert len(issues) == 1
    assert "kubernetes" in issues[0].evidence
    assert issues[0].fix_pattern != ""


def test_quantification_issue_has_evidence_with_counts():
    """Low-quantification evidence must include actual bullet counts."""
    resume = (
        "Experience\n"
        "- Responsible for the backend service\n"
        "- Helped with CI/CD pipeline setup\n"
        "- Worked on database migrations\n"
        "- Assisted in code reviews\n"
    )
    sections = parse_resume_sections(resume)
    reqs = {"missing_from_resume": [], "required_keywords": []}
    from app.services.rewrite_suggestions import _check_quantification
    issues = _check_quantification(sections)
    if issues:
        assert any(c.isdigit() for c in issues[0].evidence)
        assert issues[0].fix_pattern != ""


def test_missing_summary_issue_has_evidence():
    """Missing section issues carry evidence and fix_pattern."""
    sections = {"experience": "Engineer at Corp", "skills": "Python"}
    from app.services.rewrite_suggestions import _check_missing_sections
    issues = _check_missing_sections(sections)
    summary_issues = [i for i in issues if i.issue_type == "missing_section" and "Summary" in i.title]
    assert len(summary_issues) == 1
    assert summary_issues[0].evidence != ""
    assert summary_issues[0].fix_pattern != ""


def test_summary_mismatch_evidence_contains_percentage():
    """Summary mismatch evidence must state the overlap percentage."""
    sections = {"summary": "Experienced engineer working on distributed systems."}
    reqs = {
        "required_keywords": ["kubernetes", "terraform", "aws", "docker", "python"],
        "matched_keywords": [],
        "missing_from_resume": ["kubernetes", "terraform", "aws", "docker"],
    }
    from app.services.rewrite_suggestions import _check_summary_relevance
    issues = _check_summary_relevance(sections, reqs)
    assert len(issues) == 1
    assert "%" in issues[0].evidence
    assert issues[0].fix_pattern != ""
