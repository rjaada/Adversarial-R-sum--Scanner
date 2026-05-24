"""
Compute explainable scores from parsed résumé sections and JD requirements.
All weights are transparent and documented.
"""
from __future__ import annotations
import re
from app.schemas import Scores

WEIGHT_KEYWORD = 0.35
WEIGHT_EXPERIENCE = 0.25
WEIGHT_PARSE = 0.20
WEIGHT_STRUCTURE = 0.10
WEIGHT_IMPACT = 0.10

IMPACT_PATTERNS = [
    r"\d+%", r"\$[\d,]+", r"reduced", r"increased", r"improved",
    r"led\b", r"built\b", r"launched", r"delivered", r"managed\b",
    r"grew\b", r"scaled", r"saved", r"generated",
]
_IMPACT_RE = re.compile("|".join(IMPACT_PATTERNS), re.IGNORECASE)

EXPECTED_SECTIONS = {"summary", "experience", "education", "skills"}


def compute_scores(
    resume_sections: dict,
    jd_requirements: dict,
    parse_integrity: float,
) -> Scores:
    resume_text = " ".join(resume_sections.values()).lower()
    resume_words = set(re.findall(r"[\w\.+#]+", resume_text))

    required = set(jd_requirements.get("required_keywords", []))
    matched = required & resume_words
    missing = required - resume_words

    # Write back into jd_requirements for the route to pick up
    jd_requirements["matched_keywords"] = sorted(matched)
    jd_requirements["missing_from_resume"] = sorted(missing)

    keyword_score = len(matched) / len(required) if required else 1.0

    # Experience: look for year mentions and compare to JD minimum
    years_in_resume = [int(y) for y in re.findall(r"(\d+)\+?\s*(?:years?|yrs?)", resume_text)]
    max_resume_years = max(years_in_resume, default=0)
    min_jd_years = jd_requirements.get("min_years_experience") or 0
    if min_jd_years == 0:
        experience_score = 1.0
    else:
        experience_score = min(1.0, max_resume_years / min_jd_years)

    structure_score = len(EXPECTED_SECTIONS & set(resume_sections.keys())) / len(EXPECTED_SECTIONS)

    all_text = " ".join(resume_sections.values())
    impact_hits = len(_IMPACT_RE.findall(all_text))
    impact_score = min(1.0, impact_hits / 8)  # 8 hits = full score

    overall = (
        keyword_score * WEIGHT_KEYWORD
        + experience_score * WEIGHT_EXPERIENCE
        + parse_integrity * WEIGHT_PARSE
        + structure_score * WEIGHT_STRUCTURE
        + impact_score * WEIGHT_IMPACT
    )

    return Scores(
        overall=round(overall, 3),
        keyword_match=round(keyword_score, 3),
        experience_alignment=round(experience_score, 3),
        parse_integrity=round(parse_integrity, 3),
        structure=round(structure_score, 3),
        quantified_impact=round(impact_score, 3),
    )
