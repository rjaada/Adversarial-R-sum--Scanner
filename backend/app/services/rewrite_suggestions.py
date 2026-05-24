"""
Generate ranked fix suggestions from section analysis and JD gap detection.
Each suggestion is deterministic — no LLM required.
"""
from __future__ import annotations
import re
from app.schemas import Issue

SEVERITY_WEIGHTS = {"critical": 5, "high": 4, "medium": 2, "low": 1}

_CONFIDENCE = 0.8


def _impact(severity: str) -> float:
    return round(SEVERITY_WEIGHTS[severity] * _CONFIDENCE, 2)


WEAK_VERBS = [
    "responsible for", "helped", "assisted", "worked on", "involved in",
    "participated in", "contributed to", "did", "made",
]
_WEAK_RE = re.compile("|".join(re.escape(v) for v in WEAK_VERBS), re.IGNORECASE)

# Matches weak verb at the START of a stripped bullet line (for rewrite_starter)
_WEAK_PREFIX_RE = re.compile(
    r"^(?:responsible for|helped(?:\s+with)?|assisted(?:\s+with)?|worked on"
    r"|involved in|participated in|contributed to|did|made)\s+",
    re.IGNORECASE,
)

QUANTIFICATION_RE = re.compile(r"\d+%|\$[\d,]+|\d+[kKmM]\b|\d+ (users|customers|clients|engineers|teams?)")

_KEYWORD_NOISE = frozenset({"it", "do", "no", "io", "ui", "ux", "qa", "hr", "ml", "ai"})

# Priority-ordered: first match wins
_VERB_HINTS: list[tuple[frozenset[str], str]] = [
    (frozenset({"ci/cd", "cicd", "deploy", "pipeline", "automat", "workflow"}), "Automated"),
    (frozenset({"database", "db", "migration", "schema", "postgres", "mysql", "mongo", "sql", "redis"}), "Migrated"),
    (frozenset({"performance", "latency", "speed", "slow", "optimiz", "efficienc", "throughput"}), "Reduced"),
    (frozenset({"cost", "budget", "saving", "spend", "resource", "bill"}), "Reduced"),
    (frozenset({"test", "testing", "coverage", "qa", "quality", "unittest"}), "Increased"),
    (frozenset({"team", "engineers", "developers", "sprint", "roadmap", "agile", "scrum"}), "Led"),
    (frozenset({"marketing", "campaign", "content", "seo", "ads", "social", "brand", "email"}), "Improved"),
    (frozenset({"security", "vulnerabilit", "auth", "authentication", "penetration", "rbac"}), "Hardened"),
    (frozenset({"infrastructure", "infra", "cloud", "aws", "gcp", "azure", "kubernetes", "k8s", "terraform"}), "Architected"),
    (frozenset({"monitor", "alert", "observ", "log", "metric", "telemetry", "tracing"}), "Implemented"),
    (frozenset({"scale", "scaling", "traffic", "load", "growth", "capacity"}), "Scaled"),
    (frozenset({"api", "endpoint", "service", "microservice", "backend", "server", "rest", "grpc"}), "Built"),
    (frozenset({"feature", "product", "launch", "release", "ship", "deliver"}), "Delivered"),
    (frozenset({"design", "architect", "platform", "framework", "system"}), "Designed"),
    (frozenset({"integrat", "connect", "sync", "webhook", "etl", "data"}), "Built"),
]

_METRIC_HINTS: list[tuple[frozenset[str], str]] = [
    (frozenset({"latency", "speed", "response", "p99", "p95"}), "reducing latency by [X ms] and improving throughput by [Y%]"),
    (frozenset({"cost", "budget", "saving", "spend", "bill"}), "saving $[X] per month across [N] environments"),
    (frozenset({"user", "customer", "client", "traffic", "dau", "mau"}), "supporting [N users] with [X%] availability improvement"),
    (frozenset({"team", "engineer", "developer", "sprint", "velocity"}), "across a [N]-person team, reducing [cycle time / incidents] by [X%]"),
    (frozenset({"test", "coverage", "qa"}), "increasing test coverage from [X%] to [Y%] with [N] new test cases"),
    (frozenset({"deploy", "release", "ci/cd", "cicd", "pipeline"}), "cutting deployment time by [X%] and rollback time to [Y min]"),
    (frozenset({"security", "vulnerabilit", "auth", "rbac"}), "eliminating [N] vulnerabilities and reducing attack surface by [X%]"),
    (frozenset({"scale", "traffic", "load", "throughput", "capacity"}), "handling [N]× peak traffic with [X%] reduction in error rate"),
]

_METRIC_DEFAULT = "improving [key metric] by [X%] across [scope/scale]"


def _suggest_verb(text: str) -> str:
    tl = text.lower()
    for keywords, verb in _VERB_HINTS:
        if any(kw in tl for kw in keywords):
            return verb
    return "Led"


def _suggest_metric(text: str) -> str:
    tl = text.lower()
    for keywords, metric in _METRIC_HINTS:
        if any(kw in tl for kw in keywords):
            return metric
    return _METRIC_DEFAULT


def _build_rewrite_weak(full_line: str, weak_phrase: str) -> str:
    """Rewrite starter for a weak-phrasing bullet: replace verb, add metric placeholders."""
    stripped = full_line.strip().lstrip("-•*· ").rstrip(".").strip()
    if not stripped:
        return ""
    # Remove the weak verb prefix to extract the payload
    payload = _WEAK_PREFIX_RE.sub("", stripped).strip().lstrip(",: ").strip()
    if not payload or payload.lower() == stripped.lower():
        # Phrase is mid-line — fall back to stripping just the matched phrase
        payload = re.sub(re.escape(weak_phrase), "", stripped, flags=re.IGNORECASE, count=1).strip().lstrip(",: ").strip()
    if not payload:
        return ""
    verb = _suggest_verb(payload)
    metric = _suggest_metric(payload)
    return f"{verb} {payload}, {metric}."


def _build_rewrite_quantify(bullet: str) -> str:
    """Rewrite starter for an unquantified bullet: preserve or improve verb, add metric placeholders."""
    line = bullet.strip().lstrip("-•*· ").rstrip(".").strip()
    if not line:
        return ""
    # If line starts with a weak verb, replace it first
    m = _WEAK_PREFIX_RE.match(line)
    if m:
        payload = line[m.end():].strip()
        verb = _suggest_verb(payload)
        metric = _suggest_metric(payload)
        return f"{verb} {payload}, {metric}."
    # Good verb already — preserve it, append metric placeholder
    metric = _suggest_metric(line)
    return f"{line}, {metric}."


def generate_fix_suggestions(
    resume_sections: dict,
    jd_requirements: dict,
) -> list[Issue]:
    issues: list[Issue] = []
    issues += _check_missing_keywords(jd_requirements)
    issues += _check_weak_phrasing(resume_sections)
    issues += _check_missing_sections(resume_sections)
    issues += _check_quantification(resume_sections)
    issues += _check_summary_relevance(resume_sections, jd_requirements)
    return issues


def _check_missing_keywords(jd_requirements: dict) -> list[Issue]:
    missing = jd_requirements.get("missing_from_resume", [])
    issues = []
    for kw in missing[:10]:
        if len(kw) < 2 or kw in _KEYWORD_NOISE:
            continue
        issues.append(Issue(
            issue_type="keyword_gap",
            severity="high",
            title=f"Missing keyword: {kw}",
            description=f'The JD requires "{kw}" but your résumé does not mention it. ATS keyword filters will penalize this.',
            evidence=f'"{kw}" does not appear anywhere in your résumé text.',
            fix_pattern=f'Add "{kw}" explicitly in your Skills section or work it into a relevant experience bullet.',
            source_excerpt="",
            suggested_fix=f'Add "{kw}" in your Skills section or weave it into relevant experience descriptions.',
            impact_score=_impact("high"),
        ))
    return issues


def _check_weak_phrasing(resume_sections: dict) -> list[Issue]:
    issues = []
    exp_text = resume_sections.get("experience", "")
    for match in _WEAK_RE.finditer(exp_text):
        phrase = match.group(0)
        # Extract full source line for the rewrite starter
        line_start = exp_text.rfind("\n", 0, match.start()) + 1
        line_end = exp_text.find("\n", match.end())
        if line_end == -1:
            line_end = len(exp_text)
        full_line = exp_text[line_start:line_end].strip()

        start = max(0, match.start() - 40)
        end = min(len(exp_text), match.end() + 40)
        excerpt = exp_text[start:end].replace("\n", " ").strip()

        starter = _build_rewrite_weak(full_line, phrase)
        issues.append(Issue(
            issue_type="weak_phrasing",
            severity="medium",
            title=f'Weak verb: "{phrase}"',
            description="Passive or weak phrasing reduces impact score in LLM screeners and human review.",
            evidence=f'Phrase "{phrase}" signals passive ownership. Screeners weight active verbs more heavily.',
            fix_pattern="Start the bullet with: Built / Led / Reduced / Delivered / Scaled + [what] + [measurable result].",
            rewrite_starter=starter,
            source_excerpt=f"...{excerpt}...",
            suggested_fix=f'Replace "{phrase}" with an active verb like "Built", "Led", "Delivered", "Reduced", or "Scaled".',
            impact_score=_impact("medium"),
        ))
        if len(issues) >= 5:
            break
    return issues


_MISSING_SECTION_EVIDENCE: dict[str, tuple[str, str]] = {
    "summary": (
        'No Summary, Profile, Objective, or About section was found in the résumé.',
        'Add 2–3 lines: [Title] with [X] years in [domain], known for [strength], targeting [area].',
    ),
    "skills": (
        'No Skills, Technical Skills, Tech Stack, or Competencies section was detected.',
        'Add a Technical Skills section grouping: Languages | Frameworks | Cloud & Infra | Tools.',
    ),
    "experience": (
        'No Experience, Work History, or Employment section was found.',
        'Add: Company · Title · Dates, then 3–5 bullets starting with action verbs.',
    ),
    "education": (
        'No Education or Academic section was found. Some ATS systems require degree detection.',
        'Add: Degree · Institution · Graduation year. One line is sufficient.',
    ),
}

_MISSING_SECTION_META: dict[str, tuple[str, str, str]] = {
    "summary": ("Missing Summary section", "critical", "Add a 2-3 sentence summary at the top. Most ATS systems weight the summary for role-fit classification."),
    "skills": ("Missing Skills section", "high", "Add a dedicated Skills section. ATS keyword filters scan this section first."),
    "experience": ("Missing Experience section", "critical", "No Experience section detected. This will cause ATS to reject or low-rank the résumé."),
    "education": ("Missing Education section", "medium", "Add an Education section. Many ATS systems require degree detection for role classification."),
}


def _check_missing_sections(resume_sections: dict) -> list[Issue]:
    issues = []
    for section, (title, severity, desc) in _MISSING_SECTION_META.items():
        if section not in resume_sections:
            ev, fp = _MISSING_SECTION_EVIDENCE[section]
            issues.append(Issue(
                issue_type="missing_section",
                severity=severity,  # type: ignore[arg-type]
                title=title,
                description=desc,
                evidence=ev,
                fix_pattern=fp,
                source_excerpt="",
                suggested_fix=f"Add a clear '{section.capitalize()}' header followed by your content.",
                impact_score=_impact(severity),
            ))
    return issues


def _check_quantification(resume_sections: dict) -> list[Issue]:
    exp_text = resume_sections.get("experience", "")
    bullet_lines = [l for l in exp_text.splitlines() if l.strip().startswith(("-", "•", "*", "·"))]
    unquantified = [l for l in bullet_lines if not QUANTIFICATION_RE.search(l)]

    if len(bullet_lines) > 3 and len(unquantified) / max(len(bullet_lines), 1) > 0.6:
        n_unq = len(unquantified)
        n_total = len(bullet_lines)
        starter = _build_rewrite_quantify(unquantified[0]) if unquantified else ""
        return [Issue(
            issue_type="low_quantification",
            severity="high",
            title="Most bullet points lack measurable impact",
            description=f"{n_unq} of {n_total} experience bullets have no numbers, percentages, or dollar figures.",
            evidence=f"{n_unq} of {n_total} experience bullets contain no numbers, percentages, currency, or scale indicators.",
            fix_pattern="Rewrite 2–3 bullets: add %, $, users, team size, latency ms, requests/s, cost saved, or delivery time.",
            rewrite_starter=starter,
            source_excerpt=unquantified[0][:120] if unquantified else "",
            suggested_fix='Add metrics to at least 50% of bullets. Example: "Reduced API latency by 40%" instead of "Improved API performance".',
            impact_score=_impact("high"),
        )]
    return []


def _check_summary_relevance(resume_sections: dict, jd_requirements: dict) -> list[Issue]:
    summary = resume_sections.get("summary", "")
    if not summary:
        return []
    required = set(jd_requirements.get("required_keywords", []))
    summary_words = set(re.findall(r"[\w\.+#]+", summary.lower()))
    overlap = required & summary_words
    if required and len(overlap) / len(required) < 0.2:
        pct = round(len(overlap) / len(required) * 100)
        return [Issue(
            issue_type="summary_keyword_mismatch",
            severity="high",
            title="Summary does not reflect JD keywords",
            description="Your summary mentions fewer than 20% of the role's required keywords. LLM screeners read the summary first.",
            evidence=f"Summary overlaps {len(overlap)} of {len(required)} JD keywords ({pct}%). LLM screeners prioritize summary relevance.",
            fix_pattern="Open with your target title, then include 2–3 JD terms naturally within 2 sentences.",
            source_excerpt=summary[:200],
            suggested_fix="Rewrite your summary to mirror 3-5 key terms from the job description naturally.",
            impact_score=_impact("high"),
        )]
    return []
