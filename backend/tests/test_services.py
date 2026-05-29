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


# --- Rewrite starters ---

def test_weak_phrasing_issue_has_rewrite_starter():
    """Weak phrasing issues must produce a non-empty rewrite_starter."""
    resume = (
        "Experience\n"
        "- Responsible for database migrations across 5 services\n"
        "- Helped with CI/CD pipeline setup\n"
    )
    sections = parse_resume_sections(resume)
    reqs = {"missing_from_resume": [], "required_keywords": []}
    compute_scores(sections, reqs, parse_integrity=1.0)
    issues = generate_fix_suggestions(sections, reqs)
    weak = [i for i in issues if i.issue_type == "weak_phrasing"]
    assert len(weak) > 0
    assert all(i.rewrite_starter != "" for i in weak)


def test_weak_phrasing_starter_uses_placeholder_brackets():
    """Rewrite starters must use [placeholder] syntax, not fabricated metrics."""
    from app.services.rewrite_suggestions import _build_rewrite_weak
    starter = _build_rewrite_weak("- Responsible for digital marketing strategies", "responsible for")
    assert "[" in starter and "]" in starter
    assert starter != ""


def test_weak_phrasing_starter_has_active_verb():
    """Rewrite starter for a database bullet should use a strong active verb."""
    from app.services.rewrite_suggestions import _build_rewrite_weak
    starter = _build_rewrite_weak("- Responsible for database migrations", "responsible for")
    # Should not start with "Responsible" or any weak verb
    assert not starter.lower().startswith("responsible")
    assert starter[0].isupper()


def test_quantification_issue_has_rewrite_starter():
    """Low-quantification issues must produce a non-empty rewrite_starter."""
    resume = (
        "Experience\n"
        "- Built backend API for the platform\n"
        "- Designed the authentication system\n"
        "- Set up monitoring and alerting\n"
        "- Reviewed pull requests weekly\n"
    )
    sections = parse_resume_sections(resume)
    reqs = {"missing_from_resume": [], "required_keywords": []}
    compute_scores(sections, reqs, parse_integrity=1.0)
    issues = generate_fix_suggestions(sections, reqs)
    quant = [i for i in issues if i.issue_type == "low_quantification"]
    if quant:
        assert quant[0].rewrite_starter != ""
        assert "[" in quant[0].rewrite_starter


def test_keyword_gap_has_no_rewrite_starter():
    """Keyword gap issues should not generate a rewrite_starter."""
    reqs = {"missing_from_resume": ["kubernetes"], "required_keywords": ["kubernetes"]}
    from app.services.rewrite_suggestions import _check_missing_keywords
    issues = _check_missing_keywords(reqs)
    assert issues[0].rewrite_starter == ""


def test_missing_section_has_no_rewrite_starter():
    """Missing section issues should not generate a rewrite_starter."""
    from app.services.rewrite_suggestions import _check_missing_sections
    issues = _check_missing_sections({"experience": "Engineer at Corp"})
    for issue in issues:
        assert issue.rewrite_starter == ""


# ── Item 1: Synonym / acronym matching ────────────────────────────────────────

def test_k8s_matches_kubernetes():
    """k8s in résumé should satisfy a 'kubernetes' JD requirement."""
    sections = {"skills": "Python, k8s, Docker, Terraform"}
    reqs = {"required_keywords": ["kubernetes"], "min_years_experience": None}
    compute_scores(sections, reqs, parse_integrity=1.0)
    assert "kubernetes" in reqs["matched_keywords"]


def test_ml_matches_machine_learning():
    """'ml' as a whole word in résumé should satisfy 'machine learning' JD requirement."""
    sections = {"skills": "Python, ML, TensorFlow, SQL"}
    reqs = {"required_keywords": ["machine learning"], "min_years_experience": None}
    compute_scores(sections, reqs, parse_integrity=1.0)
    assert "machine learning" in reqs["matched_keywords"]


def test_nlp_matches_natural_language_processing():
    """'nlp' as a whole word should satisfy 'natural language processing' JD requirement."""
    sections = {"skills": "Python, NLP, PyTorch"}
    reqs = {"required_keywords": ["natural language processing"], "min_years_experience": None}
    compute_scores(sections, reqs, parse_integrity=1.0)
    assert "natural language processing" in reqs["matched_keywords"]


def test_continuous_integration_matches_cicd():
    """'continuous integration' in résumé should satisfy 'ci/cd' JD requirement."""
    sections = {"experience": "Built continuous integration and deployment pipelines using GitHub."}
    reqs = {"required_keywords": ["ci/cd"], "min_years_experience": None}
    compute_scores(sections, reqs, parse_integrity=1.0)
    assert "ci/cd" in reqs["matched_keywords"]


def test_xml_does_not_match_machine_learning():
    """'xml' in résumé must NOT trigger 'ml' synonym — word-set prevents substring false positive."""
    sections = {"skills": "XML processing, XSLT, Java"}
    reqs = {"required_keywords": ["machine learning"], "min_years_experience": None}
    compute_scores(sections, reqs, parse_integrity=1.0)
    assert "machine learning" not in reqs["matched_keywords"]


# ── Item 2: Expanded JD vocabulary ────────────────────────────────────────────

def test_jd_extracts_snowflake_dbt_airflow():
    """Expanded vocabulary should extract data analytics tools."""
    jd = "Experience with Snowflake, dbt, and Airflow required."
    reqs = extract_jd_requirements(jd)
    assert "snowflake" in reqs["required_keywords"]
    assert "dbt" in reqs["required_keywords"]
    assert "airflow" in reqs["required_keywords"]


def test_jd_extracts_mobile_terms():
    """Expanded vocabulary should extract mobile platform terms."""
    jd = "We need iOS and Android experience. Swift or Kotlin preferred."
    reqs = extract_jd_requirements(jd)
    assert "ios" in reqs["required_keywords"]
    assert "android" in reqs["required_keywords"]


def test_jd_extracts_figma():
    """Expanded vocabulary should extract design tool Figma."""
    jd = "Must be proficient in Figma and comfortable working with design systems."
    reqs = extract_jd_requirements(jd)
    assert "figma" in reqs["required_keywords"]


def test_jd_extracts_ruby_on_rails():
    """Phrase 'ruby on rails' should be extracted from JD."""
    jd = "Strong Ruby on Rails experience required with PostgreSQL."
    reqs = extract_jd_requirements(jd)
    assert "ruby on rails" in reqs["required_keywords"]


def test_jd_extracts_computer_vision():
    """Phrase 'computer vision' should be extracted from JD."""
    jd = "Experience in computer vision and deep learning is required."
    reqs = extract_jd_requirements(jd)
    assert "computer vision" in reqs["required_keywords"]


# ── Item 3: Section header synonyms ───────────────────────────────────────────

def test_parse_about_me_maps_to_summary():
    """'About Me' header should map to summary section."""
    resume = "About Me\nExperienced backend engineer focused on distributed systems.\n\nExperience\nEng at Corp"
    sections = parse_resume_sections(resume)
    assert "summary" in sections


def test_parse_professional_background_maps_to_experience():
    """'Professional Background' header should map to experience section."""
    resume = "Professional Background\nSoftware Engineer 2019-2024\n\nSkills\nPython"
    sections = parse_resume_sections(resume)
    assert "experience" in sections


def test_parse_relevant_experience_maps_to_experience():
    """'Relevant Experience' header should map to experience section."""
    resume = "Relevant Experience\nBuilt backend services at three startups.\n\nEducation\nBS CS"
    sections = parse_resume_sections(resume)
    assert "experience" in sections


def test_parse_educational_background_maps_to_education():
    """'Educational Background' header should map to education section."""
    resume = "Educational Background\nB.S. Computer Science, MIT 2018\n\nExperience\nEng at Corp"
    sections = parse_resume_sections(resume)
    assert "education" in sections


def test_parse_technical_background_maps_to_skills():
    """'Technical Background' header should map to skills section."""
    resume = "Technical Background\nPython, AWS, Docker\n\nExperience\nEng at Corp"
    sections = parse_resume_sections(resume)
    assert "skills" in sections


# ── Item 4: Date-range experience inference ────────────────────────────────────

def test_date_range_infers_experience_years():
    """Date range in résumé contributes to experience signal when no 'X years' stated."""
    from app.services.scoring import _infer_years_from_dates
    text = "Software Engineer at Acme 2019-2024"
    assert _infer_years_from_dates(text) == 5


def test_date_range_present_resolves_to_current_year():
    """'Present' end in date range resolves to _CURRENT_YEAR."""
    from app.services.scoring import _infer_years_from_dates, _CURRENT_YEAR
    text = "Software Engineer 2020-Present"
    assert _infer_years_from_dates(text) == _CURRENT_YEAR - 2020


def test_date_range_no_double_count_overlap():
    """Overlapping date ranges are merged before summing years."""
    from app.services.scoring import _infer_years_from_dates
    text = "Company A 2019-2022\nCompany B 2021-2024"
    total = _infer_years_from_dates(text)
    # [2019,2022] + [2021,2024] merges to [2019,2024] = 5 years
    assert total == 5


def test_date_range_non_overlapping_spans_sum():
    """Non-overlapping spans should be summed independently."""
    from app.services.scoring import _infer_years_from_dates
    text = "Role A 2015-2018\nRole B 2020-2023"
    total = _infer_years_from_dates(text)
    # [2015,2018]=3 + [2020,2023]=3 = 6 years (gap 2018-2020 not counted)
    assert total == 6


def test_date_range_improves_experience_score():
    """Date range in résumé raises experience_alignment when no explicit 'X years' stated."""
    resume = "Experience\nSoftware Engineer at Acme 2019-2024\n- Built distributed systems."
    sections = parse_resume_sections(resume)
    reqs = {"required_keywords": [], "min_years_experience": 4}
    scores = compute_scores(sections, reqs, parse_integrity=1.0)
    # 5 inferred years / 4 required = meets requirement
    assert scores.experience_alignment >= 1.0


def test_date_range_uses_larger_of_explicit_and_inferred():
    """Takes the larger of explicit 'X years' self-report vs date-range inference."""
    from app.services.scoring import _infer_years_from_dates
    # Explicit says "3 years" but date range covers 5 years
    text = "3 years experience. Software Engineer 2019-2024."
    assert _infer_years_from_dates(text) == 5  # date range wins
