"""
Extract requirements from a job description using keyword and pattern heuristics.
No external API required.
"""
from __future__ import annotations
import re

# Unambiguous single-token tech keywords — all lowercase, no spaces.
# Organized by category for maintainability. Add only unambiguous tool/language names.
_SINGLE_KEYWORDS: frozenset[str] = frozenset({
    # Languages
    "python", "javascript", "typescript", "java", "rust", "ruby", "scala", "php",
    "swift", "kotlin",
    "c#", ".net",
    # Web frameworks
    "react", "vue", "angular", "fastapi", "django", "flask",
    # Databases / storage
    "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
    "snowflake", "databricks", "dynamodb",
    # Cloud / infra / DevOps
    "aws", "gcp", "azure", "docker", "kubernetes", "terraform",
    "serverless", "microservices",
    # Data / ML / analytics
    "pytorch", "tensorflow", "spark", "kafka", "airflow", "dbt",
    "pandas", "sklearn", "tableau", "looker",
    # Observability / monitoring
    "datadog", "grafana", "prometheus", "splunk",
    # Dev tooling
    "jira", "jenkins", "gitlab", "github",
    "webpack", "vite", "jest", "cypress", "storybook",
    # Design
    "figma",
    # Styling
    "sass",
    # Mobile / cross-platform
    "flutter", "android", "ios",
    # General
    "sql", "nosql", "graphql", "grpc",
    "git", "linux", "bash", "agile", "scrum",
    "analytics", "etl",
})

# Multi-word phrases matched as substrings in lowercased text.
_PHRASE_KEYWORDS: frozenset[str] = frozenset({
    "machine learning", "deep learning", "data engineering",
    "data science", "rest api", "ci/cd", "next.js", "node.js",
    "product management", "cross-functional", "natural language processing",
    "computer vision", "data warehouse", "business intelligence",
    "react native", "ruby on rails",
    "github actions", "test driven development",
})

# Soft skills — phrases matched as substrings in lowercased text. Kept separate
# from required_keywords so scoring (hard-skill based) is unchanged.
_SOFT_SKILLS: frozenset[str] = frozenset({
    "communication", "leadership", "mentoring", "mentorship", "collaboration",
    "stakeholder management", "problem solving", "problem-solving",
    "time management", "attention to detail", "critical thinking",
    "teamwork", "adaptability", "ownership", "presentation",
    "negotiation", "decision making", "decision-making", "prioritization",
    "conflict resolution", "empathy", "coaching",
})

# Buzzwords/filler — detected so the UI can tell users these are noise,
# not keywords to chase. Never counted as requirements.
_BUZZWORDS: frozenset[str] = frozenset({
    "fast-paced", "self-starter", "team player", "rockstar", "ninja",
    "dynamic", "passionate", "results-driven", "detail-oriented",
    "go-getter", "wear many hats", "hit the ground running", "synergy",
    "proactive", "motivated", "hard-working", "hardworking",
})

# "go" the language — only treat as a keyword when JD uses it in a technical sense.
_GO_TECH_RE = re.compile(
    r"\bgolang\b"
    r"|\bgo\s+(?:developer|engineer|programming|lang|language|backend|services?|microservices?)\b"
    r"|\b(?:proficient|experienced?|skilled|expert)\s+in\s+go\b"
    r"|\bgo\s+(?:and|or)\s+(?:python|java|rust|typescript|javascript|kotlin|scala)\b"
    r"|\b(?:python|java|rust|typescript|javascript)\s+(?:and|or)\s+go\b",
    re.IGNORECASE,
)

# Exported for backward-compat (scoring.py imports this)
TECH_KEYWORDS = _SINGLE_KEYWORDS | _PHRASE_KEYWORDS | {"go"}

EXPERIENCE_PATTERN = re.compile(
    r"(\d+)(?:\+|\s+plus)?\s*(?:years?|yrs?)(?:\s+of)?(?:\s+(?!experience\b)\S+){0,6}\s+(?:experience|exp\.?)",
    re.IGNORECASE,
)

REQUIREMENT_SIGNALS = [
    "required", "must have", "must-have", "you will", "you'll", "we need",
    "looking for", "ideal candidate", "requirements", "qualifications",
    "minimum", "preferred", "nice to have",
]


def extract_jd_requirements(jd_text: str) -> dict:
    text_lower = jd_text.lower()
    # Include '/' so "ci/cd" tokenizes as one unit when needed
    words = set(re.findall(r"[\w\.+#/]+", text_lower))

    matched: set[str] = set()

    # Unambiguous single-token keywords
    matched |= _SINGLE_KEYWORDS & words

    # Multi-word phrase keywords — substring search in lowered text
    for phrase in _PHRASE_KEYWORDS:
        if phrase in text_lower:
            matched.add(phrase)

    # "go" only when clearly used as a programming language
    if _GO_TECH_RE.search(jd_text):
        matched.add("go")

    # Soft skills + buzzwords — categorized separately; not requirements.
    soft = {s for s in _SOFT_SKILLS if s in text_lower}
    buzz = {b for b in _BUZZWORDS if b in text_lower}
    categories: dict[str, str] = {kw: "hard" for kw in matched}
    categories.update({s: "soft" for s in soft})
    categories.update({b: "buzzword" for b in buzz})

    years_matches = EXPERIENCE_PATTERN.findall(jd_text)
    min_years = max((int(y) for y in years_matches), default=None)

    requirement_lines = [
        line.strip()
        for line in jd_text.splitlines()
        if any(sig in line.lower() for sig in REQUIREMENT_SIGNALS) and line.strip()
    ]

    return {
        "required_keywords": sorted(matched),
        "soft_skills": sorted(soft),
        "keyword_categories": categories,
        "min_years_experience": min_years,
        "requirement_lines": requirement_lines[:20],
        "raw_word_set": list(words),
        "matched_keywords": [],
        "missing_from_resume": [],
    }
