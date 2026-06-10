"""
Regression corpus for parse_resume_sections.

Covers the audit P0 inline-header bug (`Skills: Python, AWS` must NOT lose
its content) plus block headers, case variants, decorated headers, prose
false-positives, and degenerate inputs.

Imports only parse_sections — no pydantic / DB needed.
"""
from app.services.parse_sections import parse_resume_sections


# ── Inline "Label: value" headers (the P0 fix) ────────────────────────────────

def test_inline_skills_label_keeps_content():
    """`Skills: Python, AWS, Docker` must produce a skills section WITH its content."""
    resume = (
        "Summary\nBackend engineer.\n"
        "Skills: Python, AWS, Docker, Kubernetes\n"
        "Experience\nAcme 2020-2023\n- Built things"
    )
    sections = parse_resume_sections(resume)
    assert "skills" in sections, "inline 'Skills:' header must create a skills section"
    for kw in ("Python", "AWS", "Docker", "Kubernetes"):
        assert kw in sections["skills"], f"{kw} lost from inline skills label"


def test_inline_skills_label_does_not_emit_empty_section():
    """The inline skills content must not be silently dropped (regression guard)."""
    sections = parse_resume_sections("Skills: Python, AWS, Docker")
    assert sections.get("skills", "") != ""


def test_inline_languages_label_with_parentheticals():
    resume = "Languages: English (Native), French (Fluent)\nExperience\nEng at Corp"
    sections = parse_resume_sections(resume)
    assert "languages" in sections
    assert "English (Native)" in sections["languages"]
    assert "French (Fluent)" in sections["languages"]


def test_inline_summary_label_keeps_content():
    resume = "Summary: Senior engineer focused on distributed systems.\nSkills\nPython"
    sections = parse_resume_sections(resume)
    assert "summary" in sections
    assert "distributed systems" in sections["summary"]


def test_colon_line_that_is_not_a_header_stays_content():
    """A non-header line containing a colon must remain content, not vanish."""
    resume = "Experience\n- Achievements: increased revenue by 20%\n- Built systems"
    sections = parse_resume_sections(resume)
    assert "increased revenue by 20%" in sections["experience"]


# ── Case variants (must all map to skills) ────────────────────────────────────

def test_skills_case_variants():
    for header in ("SKILLS", "Skills", "skills", "Technical Skills", "TECHNICAL SKILLS"):
        resume = f"{header}\nPython, AWS\nExperience\nEng at Corp"
        sections = parse_resume_sections(resume)
        assert "skills" in sections, f"header variant {header!r} failed to map to skills"
        assert "Python" in sections["skills"]


# ── Block format (must still work — regression) ───────────────────────────────

def test_block_skills_format_still_works():
    resume = "Skills\nPython\nAWS\nDocker\nExperience\nEng at Corp"
    sections = parse_resume_sections(resume)
    assert "skills" in sections
    for kw in ("Python", "AWS", "Docker"):
        assert kw in sections["skills"]


def test_block_all_core_sections():
    resume = (
        "Summary\nBackend engineer.\n\n"
        "Experience\nSoftware Engineer at Acme\n- Built systems\n\n"
        "Skills\nPython, Go, Docker\n\n"
        "Education\nB.S. CS, MIT, 2018\n"
    )
    sections = parse_resume_sections(resume)
    for sec in ("summary", "experience", "skills", "education"):
        assert sec in sections


# ── Decorated headers (dates, ampersands) ─────────────────────────────────────

def test_header_with_date_range():
    resume = "Experience (2019–2024)\nSoftware Engineer at Acme\nSkills\nPython"
    sections = parse_resume_sections(resume)
    assert "experience" in sections
    assert "Software Engineer at Acme" in sections["experience"]


def test_header_with_ampersand_suffix():
    resume = "Skills & Technologies\nPython, AWS\nExperience\nEng at Corp"
    sections = parse_resume_sections(resume)
    assert "skills" in sections
    assert "Python, AWS" in sections["skills"]


# ── Prose that must NOT be mistaken for a header ───────────────────────────────

def test_prose_starting_with_phone_is_not_a_header():
    resume = (
        "Experience\n"
        "Phone screening improvements were made for the hiring team\n"
        "Built the CI pipeline\n"
    )
    sections = parse_resume_sections(resume)
    assert "contact" not in sections, "prose 'Phone ...' must not create a contact section"
    assert "Phone screening improvements were made for the hiring team" in sections["experience"]


def test_prose_starting_with_languages_is_not_a_header():
    resume = (
        "Experience\n"
        "Languages such as Python and Go were used daily in production\n"
    )
    sections = parse_resume_sections(resume)
    # Must remain experience content, not switch to a languages section.
    assert "Languages such as Python and Go" in sections["experience"]


def test_prose_starting_with_degree_is_not_a_header():
    resume = (
        "Experience\n"
        "Degree of automation increased after the migration project\n"
    )
    sections = parse_resume_sections(resume)
    assert "education" not in sections
    assert "Degree of automation increased" in sections["experience"]


# ── Two-column collapsed text (common PDF artifact) ───────────────────────────

def test_two_column_collapsed_keeps_keywords_findable():
    """
    pdfplumber often merges a two-column résumé into one stream per line.
    Section labeling degrades, but the parser must not crash and the
    skill keywords must remain present in the parsed text.
    """
    resume = (
        "EXPERIENCE EDUCATION\n"
        "Acme Corp — Senior Engineer B.S. Computer Science\n"
        "2020 – 2024 State University, 2019\n"
        "Built data pipelines in Python\n"
        "SKILLS\n"
        "Python, AWS, Docker, Kubernetes\n"
    )
    sections = parse_resume_sections(resume)
    assert isinstance(sections, dict)
    joined = " ".join(sections.values())
    for kw in ("Python", "AWS", "Docker", "Kubernetes"):
        assert kw in joined, f"{kw} lost in collapsed two-column parse"


# ── Degenerate inputs ─────────────────────────────────────────────────────────

def test_empty_resume_returns_empty_dict():
    assert parse_resume_sections("") == {}


def test_whitespace_only_resume_returns_empty_dict():
    assert parse_resume_sections("   \n\n  \t\n") == {}


def test_no_recognizable_sections():
    resume = "Just some free-form notes\nwith no recognizable headers at all"
    sections = parse_resume_sections(resume)
    for sec in ("skills", "experience", "education", "summary"):
        assert sec not in sections
    # Content is preserved under the unparsed bucket.
    assert "_unparsed" in sections
    assert "free-form notes" in sections["_unparsed"]
