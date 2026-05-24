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

QUANTIFICATION_RE = re.compile(r"\d+%|\$[\d,]+|\d+[kKmM]\b|\d+ (users|customers|clients|engineers|teams?)")

_KEYWORD_NOISE = frozenset({"it", "do", "no", "io", "ui", "ux", "qa", "hr", "ml", "ai"})


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
        start = max(0, match.start() - 40)
        end = min(len(exp_text), match.end() + 40)
        excerpt = exp_text[start:end].replace("\n", " ").strip()
        issues.append(Issue(
            issue_type="weak_phrasing",
            severity="medium",
            title=f'Weak verb: "{phrase}"',
            description="Passive or weak phrasing reduces impact score in LLM screeners and human review.",
            evidence=f'Phrase "{phrase}" signals passive ownership. Screeners weight active verbs more heavily.',
            fix_pattern="Start the bullet with: Built / Led / Reduced / Delivered / Scaled + [what] + [measurable result].",
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
        return [Issue(
            issue_type="low_quantification",
            severity="high",
            title="Most bullet points lack measurable impact",
            description=f"{n_unq} of {n_total} experience bullets have no numbers, percentages, or dollar figures.",
            evidence=f"{n_unq} of {n_total} experience bullets contain no numbers, percentages, currency, or scale indicators.",
            fix_pattern="Rewrite 2–3 bullets: add %, $, users, team size, latency ms, requests/s, cost saved, or delivery time.",
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
