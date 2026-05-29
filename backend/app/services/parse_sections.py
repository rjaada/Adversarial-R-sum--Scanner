"""
Parse plain résumé text into labeled sections using header heuristics.
Returns a dict of section_name -> str (joined text per section).
"""
from __future__ import annotations

SECTION_HEADERS: dict[str, list[str]] = {
    "contact": [
        "contact", "contact information", "contact info",
        "email", "phone", "linkedin", "location", "address",
    ],
    "summary": [
        "summary", "professional summary", "career summary",
        "objective", "career objective", "profile", "professional profile",
        "about", "overview",
    ],
    "experience": [
        "experience", "work experience", "professional experience",
        "work history", "employment", "employment history", "career",
        "relevant experience", "professional background", "career history",
    ],
    "education": [
        "education", "academic background", "academic history",
        "academic", "degree", "university", "college",
        "educational", "schooling",
    ],
    "skills": [
        "skills", "technical skills", "key skills", "core skills",
        "core competencies", "competencies", "areas of expertise",
        "technical expertise", "technical background", "technologies", "technology stack",
        "tech stack", "tools", "tools & technologies",
        "programming languages", "languages & frameworks",
        "proficiencies",
    ],
    "projects": [
        "projects", "personal projects", "side projects",
        "portfolio", "open source", "open-source contributions",
    ],
    "certifications": [
        "certifications", "certificates", "credentials",
        "licenses", "accreditations",
    ],
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

    return {k: "\n".join(v).strip() for k, v in sections.items() if v}


def _match_header(line: str) -> str | None:
    stripped = line.strip()
    # Headers are short — skip long lines to avoid false positives
    if not stripped or len(stripped) > 60:
        return None
    normalized = stripped.lower().rstrip(":- ")

    for section, keywords in SECTION_HEADERS.items():
        for kw in keywords:
            if normalized == kw:
                return section
            # Accept "Skills & Technologies", "Tech Stack:", "Skills (2024)", etc.
            if normalized.startswith(kw) and len(normalized) > len(kw):
                next_char = normalized[len(kw)]
                if next_char in " :&/|-(":
                    return section
    return None
