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
# Only industry-standard exact-equivalents — not broad semantic cousins.
_SYNONYMS: dict[str, set[str]] = {
    "go":                            {"go", "golang"},
    "postgresql":                    {"postgresql", "postgres", "psql"},
    "aws":                           {"aws", "amazon web services"},
    "gcp":                           {"gcp", "google cloud", "google cloud platform"},
    "azure":                         {"azure", "microsoft azure"},
    "rest api":                      {"rest api", "restful api", "restful"},
    "elasticsearch":                 {"elasticsearch", "elastic search"},
    "scikit-learn":                  {"scikit-learn", "sklearn"},
    "javascript":                    {"javascript", "js"},
    "typescript":                    {"typescript", "ts"},
    "kubernetes":                    {"kubernetes", "k8s"},
    "node.js":                       {"node.js", "nodejs", "node"},
    "vue":                           {"vue", "vue.js"},
    ".net":                          {".net", "dotnet"},
    "c#":                            {"c#", "csharp"},
    "ruby on rails":                 {"ruby on rails", "rails"},
    "ci/cd":                         {"ci/cd", "continuous integration", "continuous deployment"},
    "machine learning":              {"machine learning", "ml"},
    "natural language processing":   {"natural language processing", "nlp"},
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


def _match_one(kw: str, resume_text: str, resume_words: set[str]) -> str | None:
    """Return the synonym that matched (possibly the keyword itself), or None."""
    synonyms = _SYNONYMS.get(kw, {kw})
    if " " in kw or "/" in kw:
        # Phrase keywords: long synonyms use substring match; short abbreviations
        # (≤4 stripped chars, e.g. "ml", "nlp") use word-set to avoid false substring hits.
        for syn in sorted(synonyms, key=lambda s: s != kw):  # prefer exact term first
            stripped = syn.replace(" ", "").replace("/", "")
            if len(stripped) > 4:
                if syn in resume_text:
                    return syn
            elif syn in resume_words:
                return syn
        return None
    hit = synonyms & resume_words
    if not hit:
        return None
    return kw if kw in hit else sorted(hit)[0]


def _tokenize(text: str) -> set[str]:
    """Word set for matching. Trailing sentence punctuation is stripped so
    'k8s.' or 'communication,' still match (c#/.net/node.js keep their chars)."""
    words = set(re.findall(r"[\w\.+#/]+", text))
    words |= {w.rstrip(".,;:") for w in words}
    return words


def _match_keywords(required: set[str], resume_text: str) -> tuple[set[str], set[str]]:
    """Match required keywords against resume text, handling phrases and synonyms."""
    resume_words = _tokenize(resume_text)
    matched = {kw for kw in required if _match_one(kw, resume_text, resume_words) is not None}
    return matched, required - matched


def match_keywords_display(
    keywords: list[str], resume_text: str,
) -> tuple[list[str], list[str], dict[str, str]]:
    """
    Word-boundary + synonym-aware matching for DISPLAY lists (gap #6 — the
    previous naive substring check missed aliases like 'postgres' and
    false-matched 'java' inside 'javascript'). Returns (matched, missing,
    matched_via) where matched_via maps keyword -> the alias that hit, only
    when it differs from the keyword itself.
    """
    text = resume_text.lower()
    words = _tokenize(text)
    matched: list[str] = []
    missing: list[str] = []
    via: dict[str, str] = {}
    for kw in keywords:
        hit = _match_one(kw.lower(), text, words)
        if hit is None:
            missing.append(kw)
        else:
            matched.append(kw)
            if hit != kw.lower():
                via[kw] = hit
    return matched, missing, via


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


_CURRENT_YEAR = 2026  # Treat "Present"/"Current" as this year; update annually.

# Matches "2019 – 2023", "2019-2021", "Jan 2020 – Dec 2022", etc.
_YEAR_TO_YEAR_RE = re.compile(
    r"(20\d{2})\s*[–\-—―]+\s*(?:[A-Za-z]{3,9}\s+)?(20\d{2})"
)
# Matches "2020 – Present", "2018 - Current", "2019–now"
_YEAR_TO_PRESENT_RE = re.compile(
    r"(20\d{2})\s*[–\-—―]+\s*(?:[A-Za-z]{3,9}\s+)?(?:present|current|now)",
    re.IGNORECASE,
)


def _infer_years_from_dates(resume_text: str) -> int:
    """
    Heuristic: parse date ranges in résumé text to estimate total career span.
    Merges overlapping spans to avoid double-counting concurrent roles.
    Year-granularity only; "Present"/"Current" resolves to _CURRENT_YEAR.
    """
    spans: list[list[int]] = []
    for m in _YEAR_TO_YEAR_RE.finditer(resume_text):
        start, end = int(m.group(1)), int(m.group(2))
        if 1990 <= start < end <= _CURRENT_YEAR:
            spans.append([start, end])
    for m in _YEAR_TO_PRESENT_RE.finditer(resume_text):
        start = int(m.group(1))
        if 1990 <= start < _CURRENT_YEAR:
            spans.append([start, _CURRENT_YEAR])
    if not spans:
        return 0
    spans.sort(key=lambda x: x[0])
    merged: list[list[int]] = [spans[0][:]]
    for s, e in spans[1:]:
        if s <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s, e])
    return sum(e - s for s, e in merged)


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
    explicit_years = max(years_in_resume, default=0)
    # Heuristic: also infer from date ranges; use the larger of both signals
    inferred_years = _infer_years_from_dates(resume_text)
    max_resume_years = max(explicit_years, inferred_years)
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
