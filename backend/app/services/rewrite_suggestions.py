"""
Generate ranked fix suggestions from section analysis and JD gap detection.
Each suggestion is deterministic — no LLM required.
"""
from __future__ import annotations
import re
from app.schemas import Issue

SEVERITY_WEIGHTS = {"critical": 5, "high": 4, "medium": 2, "low": 1}

WEAK_VERBS = [
    "responsible for", "helped", "assisted", "worked on", "involved in",
    "participated in", "contributed to", "did", "made",
]
_WEAK_RE = re.compile("|".join(re.escape(v) for v in WEAK_VERBS), re.IGNORECASE)

QUANTIFICATION_RE = re.compile(r"\d+%|\$[\d,]+|\d+[kKmM]\b|\d+ (users|customers|clients|engineers|teams?)")


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

    for issue in issues:
        sw = SEVERITY_WEIGHTS[issue.severity]
        object.__setattr__(issue, "impact_score", round(sw * 0.8, 2))  # uniform confidence=0.8 for heuristics

    return issues


def _check_missing_keywords(jd_requirements: dict) -> list[Issue]:
    missing = jd_requirements.get("missing_from_resume", [])
    issues = []
    for kw in missing[:10]:
        issues.append(Issue(
            issue_type="keyword_gap",
            severity="high",
            title=f'Missing keyword: "{kw}"',
            description=f'The JD requires "{kw}" but your résumé does not mention it. ATS keyword filters will penalize this.',
            source_excerpt="",
            suggested_fix=f'Add "{kw}" in your Skills section or weave it into relevant experience descriptions.',
            impact_score=0.0,
        ))
    return issues


def _check_weak_phrasing(resume_sections: dict) -> list[Issue]:
    issues = []
    exp_text = resume_sections.get("experience", "")
    for match in _WEAK_RE.finditer(exp_text):
        phrase = match.group(0)
        start = max(0, match.start() - 40)
        end = min(len(exp_text), match.end() + 40)
        excerpt = exp_text[start:end].replace("\n", " ").strip()
        issues.append(Issue(
            issue_type="weak_phrasing",
            severity="medium",
            title=f'Weak verb: "{phrase}"',
            description="Passive or weak phrasing reduces impact score in LLM screeners and human review.",
            source_excerpt=f"...{excerpt}...",
            suggested_fix=f'Replace "{phrase}" with an active verb like "Built", "Led", "Delivered", "Reduced", or "Scaled".',
            impact_score=0.0,
        ))
        if len(issues) >= 5:
            break
    return issues


def _check_missing_sections(resume_sections: dict) -> list[Issue]:
    issues = []
    expected = {
        "summary": ("Missing Summary section", "critical", "Add a 2-3 sentence summary at the top. Most ATS systems weight the summary for role-fit classification."),
        "skills": ("Missing Skills section", "high", "Add a dedicated Skills section. ATS keyword filters scan this section first."),
        "experience": ("Missing Experience section", "critical", "No Experience section detected. This will cause ATS to reject or low-rank the résumé."),
        "education": ("Missing Education section", "medium", "Add an Education section. Many ATS systems require degree detection for role classification."),
    }
    for section, (title, severity, desc) in expected.items():
        if section not in resume_sections:
            issues.append(Issue(
                issue_type="missing_section",
                severity=severity,  # type: ignore[arg-type]
                title=title,
                description=desc,
                source_excerpt="",
                suggested_fix=f"Add a clear '{section.capitalize()}' header followed by your content.",
                impact_score=0.0,
            ))
    return issues


def _check_quantification(resume_sections: dict) -> list[Issue]:
    exp_text = resume_sections.get("experience", "")
    bullet_lines = [l for l in exp_text.splitlines() if l.strip().startswith(("-", "•", "*", "·"))]
    unquantified = [l for l in bullet_lines if not QUANTIFICATION_RE.search(l)]

    if len(bullet_lines) > 3 and len(unquantified) / max(len(bullet_lines), 1) > 0.6:
        return [Issue(
            issue_type="low_quantification",
            severity="high",
            title="Most bullet points lack measurable impact",
            description=f"{len(unquantified)} of {len(bullet_lines)} experience bullets have no numbers, percentages, or dollar figures.",
            source_excerpt=unquantified[0][:120] if unquantified else "",
            suggested_fix='Add metrics to at least 50% of bullets. Example: "Reduced API latency by 40%" instead of "Improved API performance".',
            impact_score=0.0,
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
        return [Issue(
            issue_type="summary_keyword_mismatch",
            severity="high",
            title="Summary does not reflect JD keywords",
            description="Your summary mentions fewer than 20% of the role's required keywords. LLM screeners read the summary first.",
            source_excerpt=summary[:200],
            suggested_fix="Rewrite your summary to mirror 3-5 key terms from the job description naturally.",
            impact_score=0.0,
        )]
    return []
