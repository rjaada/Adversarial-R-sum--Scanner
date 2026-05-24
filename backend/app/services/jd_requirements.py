"""
Extract requirements from a job description using keyword and pattern heuristics.
No external API required.
"""
from __future__ import annotations
import re

# Common tech and role keywords to track
TECH_KEYWORDS = {
    "python", "javascript", "typescript", "java", "go", "rust", "c++", "c#",
    "react", "next.js", "vue", "angular", "node.js", "fastapi", "django", "flask",
    "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
    "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "ci/cd",
    "machine learning", "ml", "deep learning", "nlp", "llm", "pytorch", "tensorflow",
    "sql", "nosql", "graphql", "rest api", "grpc",
    "git", "linux", "bash", "agile", "scrum",
    "data engineering", "data science", "analytics", "etl",
    "product management", "stakeholder", "cross-functional",
}

EXPERIENCE_PATTERN = re.compile(
    r"(\d+)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp\.?)",
    re.IGNORECASE,
)

REQUIREMENT_SIGNALS = [
    "required", "must have", "must-have", "you will", "you'll", "we need",
    "looking for", "ideal candidate", "requirements", "qualifications",
    "minimum", "preferred", "nice to have",
]


def extract_jd_requirements(jd_text: str) -> dict:
    text_lower = jd_text.lower()
    words = set(re.findall(r"[\w\.+#]+", text_lower))

    matched = sorted(TECH_KEYWORDS & words)

    years_matches = EXPERIENCE_PATTERN.findall(jd_text)
    min_years = max((int(y) for y in years_matches), default=None)

    requirement_lines = [
        line.strip()
        for line in jd_text.splitlines()
        if any(sig in line.lower() for sig in REQUIREMENT_SIGNALS) and line.strip()
    ]

    return {
        "required_keywords": matched,
        "min_years_experience": min_years,
        "requirement_lines": requirement_lines[:20],
        "raw_word_set": list(words),
        # These get filled in by scoring after resume parse
        "matched_keywords": [],
        "missing_from_resume": [],
    }
