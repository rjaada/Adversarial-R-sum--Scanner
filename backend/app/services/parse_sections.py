"""
Parse plain résumé text into labeled sections using header heuristics.
Returns a dict of section_name -> str (joined text per section).

Two header forms are recognized:

  1. Block header   — the header sits alone on its line and the content
                      follows on subsequent lines:
                          Skills
                          Python, AWS, Docker

  2. Inline label   — the header and its content share one line, separated
                      by a colon:
                          Skills: Python, AWS, Docker

For the inline form the text after the colon is captured and appended to
the section. Previously it was discarded, which silently destroyed the
content of any "Label: value" résumé and produced false "missing section"
findings (audit P0). Inline labels are one of the most common résumé
formats, so getting this right is core to honest scoring.

A second guard prevents ordinary prose from being mistaken for a header.
Short keyword words ("phone", "email", "education", …) only match as a
header when the line is a standalone, header-styled line — not when the
keyword merely happens to start a sentence ("Phone screening improvements
were made" is body text, not a Contact header).
"""
from __future__ import annotations

import re

SECTION_HEADERS: dict[str, list[str]] = {
    "contact": [
        "contact", "contact information", "contact info",
        "email", "phone", "linkedin", "location", "address",
    ],
    "summary": [
        "summary", "professional summary", "career summary",
        "objective", "career objective", "profile", "professional profile",
        "about", "about me", "overview",
    ],
    "experience": [
        "experience", "work experience", "professional experience",
        "work history", "employment", "employment history", "career",
        "relevant experience", "professional background", "career history",
    ],
    "education": [
        "education", "academic background", "academic history",
        "academic", "degree", "university", "college",
        "educational", "educational background", "schooling",
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

# Short keyword words that frequently begin ordinary sentences. These only
# match as a header via an exact whole-line match or an explicit "Label:"
# colon — never via the loose "starts-with keyword" path. This stops prose
# like "Phone screening improvements were made" or "Degree in CS from MIT"
# from hijacking a section.
_WEAK_HEADER_KEYWORDS: frozenset[str] = frozenset({
    "phone", "email", "linkedin", "location", "address",
    "degree", "university", "college", "academic", "about",
    "career", "tools", "research", "papers", "community",
})

# Lowercase connector words allowed inside a title-cased header
# ("Areas of Expertise", "Tools and Technologies").
_HEADER_CONNECTORS: frozenset[str] = frozenset({
    "of", "and", "the", "&", "for", "to", "with", "in",
})

# Continuation characters that may follow a header keyword.
_CONTINUATION_CHARS = " &/|-("


def parse_resume_sections(text: str) -> dict:
    lines = [l.rstrip() for l in text.splitlines()]
    sections: dict[str, list[str]] = {"_unparsed": []}
    current = "_unparsed"

    for line in lines:
        section, remainder = _match_header(line)
        if section:
            current = section
            sections.setdefault(current, [])
            # Capture inline content from a "Label: value" header so it is
            # not lost (audit P0). Block headers carry an empty remainder.
            if remainder:
                sections[current].append(remainder)
        elif line.strip():
            sections.setdefault(current, []).append(line)

    return {k: "\n".join(v).strip() for k, v in sections.items() if "\n".join(v).strip()}


def _match_header(line: str) -> tuple[str | None, str]:
    """
    Classify a line.

    Returns (section_key, inline_remainder):
      - section_key is None when the line is not a header (it is content).
      - inline_remainder is the text after a "Label:" delimiter (possibly
        empty). The caller appends it to the section so inline résumé
        content is preserved rather than discarded.
    """
    stripped = line.strip()
    # Headers are short. Long lines are body text.
    if not stripped or len(stripped) > 60:
        return None, ""

    # ── Form 2: "Label: value" inline header ────────────────────────────
    colon_idx = stripped.find(":")
    if colon_idx != -1:
        label = stripped[:colon_idx].strip().lower()
        remainder = stripped[colon_idx + 1:].strip()
        section = _section_for_label(label, styled_line=None)
        if section:
            return section, remainder
        # A colon is present but the label is not a known header — treat the
        # whole line as content (e.g. "Achievements: increased revenue 20%").
        return None, ""

    # ── Form 1: standalone block header ─────────────────────────────────
    normalized = stripped.lower().rstrip(" .-–—")
    section = _section_for_label(normalized, styled_line=stripped)
    return section, ""


def _section_for_label(normalized: str, styled_line: str | None) -> str | None:
    """
    Resolve a normalized (lowercased) label to a canonical section key.

    `styled_line` is the original-case line for the standalone-header path;
    it is None for the colon-label path (where the colon is itself strong
    evidence of a header). When provided, the loose "starts-with keyword"
    match additionally requires the line to look like a header.
    """
    for section, keywords in SECTION_HEADERS.items():
        for kw in keywords:
            # Exact whole-line match always wins ("Skills", "SKILLS",
            # "Technical Skills", "Skills:" → label "skills").
            if normalized == kw:
                return section

            # Weak prose words only ever match exactly — never via the
            # loose starts-with path.
            if kw in _WEAK_HEADER_KEYWORDS:
                continue

            if normalized.startswith(kw) and len(normalized) > len(kw):
                next_char = normalized[len(kw)]
                if next_char not in _CONTINUATION_CHARS:
                    continue
                rest = normalized[len(kw):].lstrip(" ")
                # Decoration suffix (dates, parens, &, |, /, digits) →
                # unambiguously a header: "Experience (2019–2024)",
                # "Skills & Technologies", "Skills 2024".
                if rest and not rest[0].isalpha():
                    return section
                # Otherwise the line must look like a header (title-cased
                # or ALL-CAPS, short, no sentence punctuation). This admits
                # "About Me", "Educational Background" while rejecting
                # "Phone screening improvements were made".
                if styled_line is not None and _is_header_styled(styled_line):
                    return section
    return None


def _is_header_styled(stripped: str) -> bool:
    """
    True when a line reads like a display header rather than prose:
      - short (<= 40 chars),
      - does not end in sentence punctuation,
      - every alphabetic word is Title-cased or ALL-CAPS (lowercase
        connector words like "of"/"and" are allowed).
    """
    if len(stripped) > 40:
        return False
    if stripped[-1] in ".,;!?":
        return False

    words = [w for w in re.split(r"\s+", stripped) if any(c.isalpha() for c in w)]
    if not words:
        return False

    for word in words:
        token = word.strip("()[]{}:.,&/|-–—")
        if not token or not any(c.isalpha() for c in token):
            continue
        if token.lower() in _HEADER_CONNECTORS:
            continue
        first_alpha = next((c for c in token if c.isalpha()), "")
        # Title-case or ALL-CAPS both start with an uppercase letter.
        if not first_alpha.isupper():
            return False
    return True
