"""
Optional local LLM adapter for rewrite variant generation.
Calls any OpenAI-compatible endpoint (Ollama, llama.cpp, LM Studio, etc.).
All functions degrade gracefully when LLM_ENDPOINT is not configured.
"""
from __future__ import annotations
import re

from app.config import settings

_SUPPORTED_TYPES = frozenset({"weak_phrasing", "low_quantification"})

# Bare numeric metric patterns that were not bracketed by the model
_BARE_METRIC_RE = re.compile(
    r"(?<!\[)"           # not preceded by [
    r"(?:"
    r"\$\d[\d,.]*"       # $150,000
    r"|\d+(?:\.\d+)?%"  # 35%, 3.5%
    r"|\d+\s*ms\b"       # 200ms, 200 ms
    r"|\d+[kKmMxX]\b"   # 50k, 3M, 4x
    r")"
    r"(?!\])",           # not followed by ]
)


def is_llm_configured() -> bool:
    return bool(settings.llm_endpoint)


async def check_llm_health() -> bool | None:
    """
    Returns True if endpoint responds, False if configured but unreachable,
    None if not configured. Uses a 3-second timeout so status loads fast.
    """
    if not is_llm_configured():
        return None
    try:
        import httpx
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{settings.llm_endpoint.rstrip('/')}/v1/models")
            return resp.status_code < 500
    except Exception:
        return False


def _sanitize_variant(text: str) -> str:
    """Wrap bare numeric metrics in [brackets] — catches model fabrications the prompt missed."""
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
    kw_hint = ", ".join(jd_keywords[:8]) if jd_keywords else "none specified"
    starter_hint = f"\nSuggested direction: {rewrite_starter}" if rewrite_starter else ""
    return (
        f"You are a professional resume writer. Rewrite the résumé bullet below to be "
        f"stronger, more specific, and ATS-friendly.\n\n"
        f"Original: {original_text}\n"
        f"Issue: {evidence}\n"
        f"Fix approach: {fix_pattern}{starter_hint}\n"
        f"Relevant JD keywords: {kw_hint}\n\n"
        f"Rules:\n"
        f"- Do not invent specific metrics, numbers, dates, company names, or technologies "
        f"not present in the original text.\n"
        f"- Use placeholders [X%], [N users], [Y ms], [tool], [scope] when exact values are unknown.\n"
        f"- Start each rewrite with a strong action verb.\n"
        f"- Keep each rewrite under 25 words.\n"
        f"- Output exactly {count} numbered rewrites, one per line. No commentary.\n\n"
        f"Rewrites:"
    )


_PREAMBLE_RE = re.compile(
    r"^(here\b|sure\b|certainly\b|below\b|rewrites?\b|rewritten\b|version\b|"
    r"i'?ve|here's|here are|the following|as requested|these are)",
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
        # strip numbered prefix, bullets including + used by llama3 tab-sub-bullets
        cleaned = re.sub(r"^(\d+[.)]\s*|[-•*+]\s*)", "", line).strip()
        # skip preamble/intro sentences
        if _PREAMBLE_RE.match(cleaned):
            log.debug("parse_variants skipping preamble: %r", cleaned)
            continue
        # skip lines that end with colon — they're headers ("Rewrites:", "Result:")
        if cleaned.endswith(":") and len(cleaned) < 60:
            log.debug("parse_variants skipping header: %r", cleaned)
            continue
        if cleaned and len(cleaned) > 8:
            variants.append(_sanitize_variant(cleaned))
        if len(variants) >= count:
            break

    if not variants and content.strip():
        # fallback: model returned something but nothing passed filters
        # return first non-empty line so frontend shows content instead of silence
        log.warning("parse_variants produced empty output; falling back to raw lines")
        for line in lines[:count]:
            cleaned = re.sub(r"^(\d+[.)]\s*|[-•*+]\s*)", "", line).strip()
            if len(cleaned) > 4:
                variants.append(_sanitize_variant(cleaned))
                if len(variants) >= count:
                    break

    log.debug("parse_variants result: %r", variants)
    return variants[:count]


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
    available=False when no LLM is configured — callers should surface setup guidance.
    available=True with empty variants means LLM is configured but call failed.
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

    log.debug("rewrite request | issue_type=%s original_text=%r", issue_type, original_text[:80])
    log.debug("rewrite prompt:\n%s", prompt)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(f"{endpoint}/v1/chat/completions", json=payload)
            log.debug("provider HTTP status: %d", resp.status_code)
            resp.raise_for_status()
            data = resp.json()
            log.debug("provider raw JSON: %r", str(data)[:600])
            content = data["choices"][0]["message"]["content"].strip()
            log.debug("extracted content (%d chars): %r", len(content), content[:400])
            variants = parse_variants(content, count)
            log.debug("final variants (%d): %r", len(variants), variants)
            if not variants:
                preview = content[:120].replace("\n", " ")
                return [], True, f"Parser produced no output. Raw preview: {preview}"
            return variants, True, ""
    except Exception as exc:
        log.error("rewrite generation failed: %s", exc)
        return [], True, str(exc)
