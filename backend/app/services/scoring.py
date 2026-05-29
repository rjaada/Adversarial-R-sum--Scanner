"""
Compute explainable scores from parsed résumé sections and JD requirements.
All weights are transparent and documented.
"""
from __future__ import annotations
import re
from dataclasses import dataclass, field
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

# Resume-side synonyms: if the JD keyword is the key, any synonym in the set counts.
_SYNONYMS: dict[str, set[str]] = {
    "go": {"go", "golang"},
    "postgresql": {"postgresql", "postgres"},
    "javascript": {"javascript", "js"},
    "typescript": {"typescript", "ts"},
}

# Adjacent/transferable skills map for heuristic semantic scoring.
# If a required keyword is missing but its adjacent terms appear, partial credit applies.
# Labeled as "adjacent skill inference" — not a claim of exact ATS behavior.
_ADJACENT: dict[str, set[str]] = {
    "kubernetes": {"docker", "helm", "k8s", "container", "devops", "cloud", "pod"},
    "aws":        {"ec2", "s3", "lambda", "cloudformation", "iam", "terraform", "cloud"},
    "gcp":        {"bigquery", "cloud", "terraform", "kubernetes", "firebase"},
    "azure":      {"cloud", "terraform", "devops", "kubernetes", "iac"},
    "terraform":  {"aws", "gcp", "azure", "iac", "pulumi", "cloud", "infrastructure"},
    "react":      {"typescript", "javascript", "nextjs", "next.js", "frontend", "jsx", "redux"},
    "fastapi":    {"python", "uvicorn", "pydantic", "asyncio", "rest", "api"},
    "django":     {"python", "rest", "api", "postgresql", "orm"},
    "postgresql": {"sql", "database", "orm", "asyncpg", "rds", "mysql"},
    "pytorch":    {"python", "tensorflow", "machine learning", "deep learning", "numpy"},
    "tensorflow": {"python", "pytorch", "machine learning", "deep learning", "keras"},
    "elasticsearch": {"search", "kibana", "logging", "observability", "opensearch"},
    "ci/cd":      {"github", "gitlab", "jenkins", "pipeline", "deploy", "automation"},
    "machine learning": {"python", "pytorch", "tensorflow", "sklearn", "data science"},
    "graphql":    {"api", "rest", "apollo", "typescript", "javascript"},
    "grpc":       {"protobuf", "api", "microservices", "golang", "python"},
}


@dataclass
class RawSignals:
    """All computed signals before profile weighting. Used by ats_profiles."""
    kw_exact: float          # matched required keywords / total required
    kw_must: float           # matched must-haves / total must-haves (1.0 if none)
    adjacent: float          # adjacent skill inference score (heuristic, 0–1)
    structure: float         # expected sections found / total expected
    parse_integrity: float   # from extract_resume
    impact: float            # evidence/quantification density (0–1)
    experience: float        # years match (0–1)
    # raw sets for explainability
    matched_kws: set[str] = field(default_factory=set)
    missing_kws: set[str] = field(default_factory=set)
    must_haves: set[str] = field(default_factory=set)
    missing_must_haves: set[str] = field(default_factory=set)
    sections_found: set[str] = field(default_factory=set)
    sections_missing: set[str] = field(default_factory=set)
    prose_only_kws: set[str] = field(default_factory=set)


def _match_keywords(required: set[str], resume_text: str) -> tuple[set[str], set[str]]:
    """Match required keywords against resume text, handling phrases and synonyms."""
    resume_words = set(re.findall(r"[\w\.+#/]+", resume_text))
    matched: set[str] = set()

    for kw in required:
        synonyms = _SYNONYMS.get(kw, {kw})
        if " " in kw or "/" in kw:
            if any(syn in resume_text for syn in synonyms):
                matched.add(kw)
        else:
            if synonyms & resume_words:
                matched.add(kw)

    return matched, required - matched


def _adjacent_skill_score(required: set[str], resume_text: str) -> float:
    """
    Heuristic adjacent skill inference: for each missing required keyword,
    check whether related terms appear in the résumé.
    Partial credit (0.5) per keyword covered by adjacency.
    Not a claim of exact ATS behavior — labeled as inference heuristic.
    """
    if not required:
        return 1.0
    resume_words = set(re.findall(r"\w+", resume_text.lower()))
    score = 0.0
    for kw in required:
        kw_words = set(re.findall(r"\w+", kw.lower()))
        if kw_words & resume_words:
            score += 1.0
        else:
            adjacent = _ADJACENT.get(kw, set())
            adjacent_words = set(w for a in adjacent for w in re.findall(r"\w+", a))
            if adjacent_words & resume_words:
                score += 0.5
    return min(1.0, score / len(required))


def _prose_only_keywords(matched_kws: set[str], resume_sections: dict) -> set[str]:
    """
    Keywords found in prose (experience/summary) but NOT in the skills section.
    Structure-sensitive parsers often skip prose and only extract the skills block.
    """
    skills_text = " ".join(v for k, v in resume_sections.items() if "skill" in k.lower()).lower()
    if not skills_text:
        return set()
    prose_text = " ".join(
        v for k, v in resume_sections.items() if "skill" not in k.lower()
    ).lower()
    prose_only: set[str] = set()
    for kw in matched_kws:
        synonyms = _SYNONYMS.get(kw, {kw})
        in_skills = any(
            (syn in skills_text if (" " in syn or "/" in syn)
             else bool(set(re.findall(r"\w+", syn)) & set(re.findall(r"\w+", skills_text))))
            for syn in synonyms
        )
        in_prose = any(
            (syn in prose_text if (" " in syn or "/" in syn)
             else bool(set(re.findall(r"\w+", syn)) & set(re.findall(r"\w+", prose_text))))
            for syn in synonyms
        )
        if in_prose and not in_skills:
            prose_only.add(kw)
    return prose_only


def extract_raw_signals(
    resume_sections: dict,
    jd_requirements: dict,
    parse_integrity: float,
) -> RawSignals:
    """
    Compute all raw scoring signals once. Each profile applies its own weights.
    Mutates jd_requirements with matched/missing keyword lists (preserves existing behavior).
    """
    resume_text = " ".join(resume_sections.values()).lower()

    required = set(jd_requirements.get("required_keywords", []))
    matched, missing = _match_keywords(required, resume_text)

    jd_requirements["matched_keywords"] = sorted(matched)
    jd_requirements["missing_from_resume"] = sorted(missing)

    # Must-haves: treat first-quartile impact keywords as must-haves (heuristic)
    # In practice callers can set jd_requirements["must_have_keywords"] directly.
    must_haves = set(jd_requirements.get("must_have_keywords", []))
    if not must_haves:
        # fallback: any required keyword that appears in a "required/must" line
        req_lines_text = " ".join(jd_requirements.get("requirement_lines", [])).lower()
        must_haves = {kw for kw in required if kw in req_lines_text}
    matched_must = must_haves & matched
    kw_must = len(matched_must) / len(must_haves) if must_haves else 1.0

    adjacent = _adjacent_skill_score(required, resume_text)

    sections_found = set(resume_sections.keys()) & EXPECTED_SECTIONS
    sections_missing = EXPECTED_SECTIONS - sections_found
    structure = len(sections_found) / len(EXPECTED_SECTIONS)

    all_text = " ".join(resume_sections.values())
    impact_hits = len(_IMPACT_RE.findall(all_text))
    impact = min(1.0, impact_hits / 8)

    years_in_resume = [int(y) for y in re.findall(r"(\d+)\+?\s*(?:years?|yrs?)", resume_text)]
    max_resume_years = max(years_in_resume, default=0)
    min_jd_years = jd_requirements.get("min_years_experience") or 0
    experience = 0.5 if min_jd_years == 0 else min(1.0, max_resume_years / min_jd_years)

    prose_only = _prose_only_keywords(matched, resume_sections)

    return RawSignals(
        kw_exact=len(matched) / len(required) if required else 0.5,
        kw_must=kw_must,
        adjacent=adjacent,
        structure=structure,
        parse_integrity=parse_integrity,
        impact=impact,
        experience=experience,
        matched_kws=matched,
        missing_kws=missing,
        must_haves=must_haves,
        missing_must_haves=must_haves - matched_must,
        sections_found=sections_found,
        sections_missing=sections_missing,
        prose_only_kws=prose_only,
    )


def scores_from_raw(sig: RawSignals) -> Scores:
    """Build Scores from pre-computed RawSignals."""
    overall = (
        sig.kw_exact          * WEIGHT_KEYWORD
        + sig.experience      * WEIGHT_EXPERIENCE
        + sig.parse_integrity * WEIGHT_PARSE
        + sig.structure       * WEIGHT_STRUCTURE
        + sig.impact          * WEIGHT_IMPACT
    )
    return Scores(
        overall=round(overall, 3),
        keyword_match=round(sig.kw_exact, 3),
        experience_alignment=round(sig.experience, 3),
        parse_integrity=round(sig.parse_integrity, 3),
        structure=round(sig.structure, 3),
        quantified_impact=round(sig.impact, 3),
    )


def compute_scores(
    resume_sections: dict,
    jd_requirements: dict,
    parse_integrity: float,
) -> Scores:
    """Compute global scores using default weights. Wrapper around extract_raw_signals."""
    sig = extract_raw_signals(resume_sections, jd_requirements, parse_integrity)
    return scores_from_raw(sig)
