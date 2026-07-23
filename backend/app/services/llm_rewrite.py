"""
Optional local LLM adapter for rewrite variant generation.
Calls any OpenAI-compatible endpoint (Ollama, llama.cpp, LM Studio, etc.).
All functions degrade gracefully when LLM_ENDPOINT is not configured.

Quality pipeline:
  1. build_rewrite_prompt  — role-aware, hard constraints
  2. parse_variants        — strip prefixes/preamble, min-length filter
  3. rank_variants         — deterministic scoring, dedup, fallback
"""
from __future__ import annotations
import re

from app.config import settings

_SUPPORTED_TYPES = frozenset({"weak_phrasing", "low_quantification"})

# Bare numeric metrics the model fabricated without brackets
_BARE_METRIC_RE = re.compile(
    r"(?<!\[)"
    r"(?:\$\d[\d,.]*|\d+(?:\.\d+)?%|\d+\s*ms\b|\d+[kKmMxX]\b)"
    r"(?!\])",
)

# Strong action verbs — used both for prompt seeding and quality scoring
_STRONG_VERBS: frozenset[str] = frozenset({
    "architected", "automated", "built", "championed", "consolidated",
    "coordinated", "created", "delivered", "deployed", "designed",
    "developed", "directed", "drove", "established", "executed",
    "grew", "implemented", "improved", "integrated", "launched",
    "led", "managed", "migrated", "monitored", "negotiated",
    "optimized", "partnered", "reduced", "refactored", "resolved",
    "scaled", "shipped", "streamlined", "transformed",
})

# Openings that signal passive/weak phrasing
_BANNED_FIRST_WORDS: frozenset[str] = frozenset({"i", "my", "the", "a", "an"})

# Domain keywords → role hint for prompt framing
_ROLE_HINTS: list[tuple[frozenset[str], str]] = [
    (frozenset({"pytorch", "tensorflow", "sklearn", "machine learning", "ml", "nlp", "llm"}), "machine learning / AI engineer"),
    (frozenset({"react", "nextjs", "next.js", "typescript", "javascript", "vue", "angular", "frontend"}), "frontend / full-stack engineer"),
    (frozenset({"kubernetes", "docker", "helm", "terraform", "ci/cd", "devops", "ansible", "infrastructure"}), "DevOps / platform engineer"),
    (frozenset({"aws", "gcp", "azure", "cloud", "lambda", "ec2", "s3"}), "cloud / infrastructure engineer"),
    (frozenset({"postgresql", "mysql", "sql", "database", "mongodb", "redis", "elasticsearch"}), "backend / data engineer"),
    (frozenset({"fastapi", "django", "flask", "golang", "python", "java", "rust", "backend"}), "backend software engineer"),
    (frozenset({"data", "analytics", "bi", "tableau", "spark", "hadoop", "pipeline"}), "data engineer / analyst"),
    (frozenset({"product", "roadmap", "stakeholders", "requirements", "agile", "scrum"}), "product / engineering manager"),
]
_DEFAULT_ROLE_HINT = "software engineer"


def _role_hint_from_keywords(keywords: list[str]) -> str:
    """Derive a short role label from JD keywords for prompt framing."""
    kw_set = {k.lower() for k in keywords}
    for domain_kws, hint in _ROLE_HINTS:
        if domain_kws & kw_set:
            return hint
    return _DEFAULT_ROLE_HINT


def is_llm_configured() -> bool:
    return bool(settings.llm_endpoint)


async def check_llm_health() -> bool | None:
    """
    Returns True if endpoint responds, False if configured but unreachable,
    None if not configured. Uses 3-second timeout so status loads fast.
    """
    if not is_llm_configured():
        return None
    try:
        import httpx
        headers = {"Authorization": f"Bearer {settings.llm_api_key}"} if settings.llm_api_key else {}
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{settings.llm_endpoint.rstrip('/')}/v1/models", headers=headers)
            return resp.status_code < 500
    except Exception:
        return False


def _sanitize_variant(text: str) -> str:
    """Wrap bare numeric metrics in [brackets]."""
    return _BARE_METRIC_RE.sub(lambda m: f"[{m.group(0)}]", text)


def build_rewrite_prompt(
    issue_type: str,
    original_text: str,
    evidence: str,
    fix_pattern: str,
    rewrite_starter: str,
    jd_keywords: list[str],
    count: int,
) -> str:
    role = _role_hint_from_keywords(jd_keywords)
    kw_hint = ", ".join(jd_keywords[:8]) if jd_keywords else "none specified"

    # rewrite_starter is a hard directional constraint, not a soft hint
    starter_block = (
        f"\nDirection to follow (use this as your starting point, do not ignore it):\n{rewrite_starter}"
        if rewrite_starter else ""
    )

    verb_examples = "Built, Led, Reduced, Delivered, Scaled, Designed, Migrated, Automated, Optimized, Shipped"

    return (
        f"You are writing résumé bullets for a {role} role.\n\n"
        f"Task: rewrite the bullet below to be stronger, more ATS-relevant, and clearly impactful.\n\n"
        f"Original: {original_text}\n"
        f"Issue: {evidence}\n"
        f"Fix pattern: {fix_pattern}"
        f"{starter_block}\n"
        f"JD keywords to work in where natural: {kw_hint}\n\n"
        f"Rules (follow exactly):\n"
        f"- Start with a strong action verb. Examples: {verb_examples}.\n"
        f"- Do NOT start with: I, My, The, A, An.\n"
        f"- Do not invent specific numbers, dates, company names, or technologies not in the original.\n"
        f"- Use placeholders [X%], [N users], [Y ms], [scope] when exact values are unknown.\n"
        f"- Each rewrite must be under 25 words.\n"
        f"- Output exactly {count} rewrites, one per line, numbered 1. 2. 3.\n"
        f"- No commentary, no preamble, no explanations.\n\n"
        f"Rewrites:"
    )


# ---------------------------------------------------------------------------
# Output parsing
# ---------------------------------------------------------------------------

_PREAMBLE_RE = re.compile(
    r"^(here\b|sure\b|certainly\b|below\b|rewrites?\b|rewritten\b|version\b|"
    r"i'?ve|here's|here are|the following|as requested|these are|of course)",
    re.IGNORECASE,
)


def parse_variants(content: str, count: int) -> list[str]:
    """Extract numbered rewrites from raw model output, sanitizing bare metrics."""
    import logging
    log = logging.getLogger(__name__)
    log.debug("parse_variants raw content (%d chars): %r", len(content), content[:400])

    lines = [l.strip() for l in content.splitlines() if l.strip()]
    variants: list[str] = []
    for line in lines:
        cleaned = re.sub(r"^(\d+[.)]\s*|[-•*+]\s*)", "", line).strip()
        if _PREAMBLE_RE.match(cleaned):
            log.debug("parse_variants skipping preamble: %r", cleaned)
            continue
        if cleaned.endswith(":") and len(cleaned) < 60:
            log.debug("parse_variants skipping header: %r", cleaned)
            continue
        if cleaned and len(cleaned) > 8:
            variants.append(_sanitize_variant(cleaned))
        if len(variants) >= count * 2:  # collect extras for ranking
            break

    if not variants and content.strip():
        log.warning("parse_variants produced empty output; falling back to raw lines")
        for line in lines[:count]:
            cleaned = re.sub(r"^(\d+[.)]\s*|[-•*+]\s*)", "", line).strip()
            if len(cleaned) > 4:
                variants.append(_sanitize_variant(cleaned))
                if len(variants) >= count:
                    break

    log.debug("parse_variants result: %r", variants)
    return variants


# ---------------------------------------------------------------------------
# Quality ranking
# ---------------------------------------------------------------------------

def _variant_score(text: str, jd_keywords: list[str]) -> float:
    """
    Deterministic quality score for a single variant. Higher = better.
    Used to rank and filter candidates post-generation.
    """
    score = 0.0
    words = text.split()
    if not words:
        return -999.0

    first_word = words[0].rstrip(".,;:").lower()

    # Hard penalty: banned opening
    if first_word in _BANNED_FIRST_WORDS:
        score -= 5.0

    # Reward: strong action verb opening
    if first_word in _STRONG_VERBS:
        score += 3.0

    # Penalty: too short or too long
    if len(text) < 15:
        score -= 3.0
    elif len(text) > 180:
        score -= 2.0

    # Penalty: too many unresolved placeholders (junk output)
    placeholder_count = len(re.findall(r"\[.*?\]", text))
    if placeholder_count > 3:
        score -= 1.5 * (placeholder_count - 3)

    # Penalty: ends with colon or ellipsis (incomplete output)
    if text.rstrip().endswith((":", "…", "...")):
        score -= 2.0

    # Reward: contains at least one JD keyword (case-insensitive)
    text_lower = text.lower()
    kw_hits = sum(1 for kw in jd_keywords[:8] if kw.lower() in text_lower)
    score += min(kw_hits * 0.5, 2.0)

    return score


def rank_variants(
    variants: list[str],
    jd_keywords: list[str],
    count: int,
) -> list[str]:
    """
    Score, deduplicate, and select the top `count` variants.
    Deduplication: drop variants whose first 4 words match an already-selected variant.
    Fallback: if fewer than count/2 pass quality threshold, return original order slice.
    """
    if not variants:
        return []

    scored = sorted(
        enumerate(variants),
        key=lambda t: _variant_score(t[1], jd_keywords),
        reverse=True,
    )

    seen_prefixes: set[str] = set()
    selected: list[str] = []
    for _orig_idx, text in scored:
        prefix = " ".join(text.lower().split()[:4])
        if prefix in seen_prefixes:
            continue
        seen_prefixes.add(prefix)
        selected.append(text)
        if len(selected) >= count:
            break

    # Fallback: quality filter was too aggressive
    if len(selected) < max(1, count // 2):
        return variants[:count]

    return selected


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

async def generate_rewrite_variants(
    issue_type: str,
    original_text: str,
    evidence: str,
    fix_pattern: str,
    rewrite_starter: str,
    jd_keywords: list[str],
    count: int = 3,
) -> tuple[list[str], bool, str]:
    """
    Returns (variants, available, error_msg).
    available=False  — LLM not configured.
    available=True, empty variants — LLM configured but call/parse failed.
    """
    import logging
    log = logging.getLogger(__name__)

    if not is_llm_configured():
        return [], False, ""
    if issue_type not in _SUPPORTED_TYPES:
        return [], True, f"Rewrite generation not supported for issue type: {issue_type}"

    try:
        import httpx
    except ImportError:
        return [], True, "httpx not installed — run: pip install httpx"

    endpoint = settings.llm_endpoint.rstrip("/")
    model = settings.llm_model
    timeout = float(settings.llm_timeout)

    prompt = build_rewrite_prompt(
        issue_type, original_text, evidence, fix_pattern, rewrite_starter, jd_keywords, count
    )
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.4,
        "max_tokens": 400,
    }

    log.debug("rewrite request | issue_type=%s original_len=%d", issue_type, len(original_text))

    headers = {"Authorization": f"Bearer {settings.llm_api_key}"} if settings.llm_api_key else {}

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(f"{endpoint}/v1/chat/completions", json=payload, headers=headers)
            log.debug("provider HTTP status: %d", resp.status_code)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"].strip()
            log.debug("extracted content (%d chars): %r", len(content), content[:400])

            raw_variants = parse_variants(content, count * 2)
            variants = rank_variants(raw_variants, jd_keywords, count)

            log.debug("final variants (%d): %r", len(variants), variants)
            if not variants:
                preview = content[:120].replace("\n", " ")
                return [], True, f"Parser produced no output. Raw preview: {preview}"
            return variants, True, ""
    except Exception as exc:
        log.error("rewrite generation failed: %s", exc)
        return [], True, str(exc)
