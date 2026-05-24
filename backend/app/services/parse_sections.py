"""
Parse plain résumé text into labeled sections using header heuristics.
Returns a dict of section_name -> str (joined text per section).
"""
from __future__ import annotations

SECTION_HEADERS = {
    "contact": ["contact", "email", "phone", "linkedin", "location", "address"],
    "summary": ["summary", "objective", "profile", "about", "overview"],
    "experience": ["experience", "work history", "employment", "career", "professional experience"],
    "education": ["education", "academic", "degree", "university", "college"],
    "skills": ["skills", "technical skills", "core competencies", "technologies", "tools"],
    "projects": ["projects", "personal projects", "portfolio", "open source"],
    "certifications": ["certifications", "certificates", "credentials", "licenses"],
    "awards": ["awards", "honors", "achievements", "recognition"],
    "publications": ["publications", "research", "papers"],
    "languages": ["languages", "spoken languages"],
    "volunteer": ["volunteer", "community", "nonprofit"],
}


def parse_resume_sections(text: str) -> dict:
    lines = [l.rstrip() for l in text.splitlines()]
    sections: dict[str, list[str]] = {"_unparsed": []}
    current = "_unparsed"

    for line in lines:
        matched_section = _match_header(line)
        if matched_section:
            current = matched_section
            if current not in sections:
                sections[current] = []
        else:
            if line.strip():
                sections.setdefault(current, []).append(line)

    # Collapse to text per section
    return {k: "\n".join(v).strip() for k, v in sections.items() if v}


def _match_header(line: str) -> str | None:
    stripped = line.strip().lower().rstrip(":- ")
    for section, keywords in SECTION_HEADERS.items():
        if stripped in keywords:
            return section
    return None
