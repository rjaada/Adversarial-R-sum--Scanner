"""
Optional local LLM adapter for rewrite variant generation.
Calls any OpenAI-compatible endpoint (Ollama, llama.cpp, LM Studio, etc.).
All functions degrade gracefully when LLM_ENDPOINT is not configured.
"""
from __future__ import annotations
import os
import re

_ENDPOINT = os.getenv("LLM_ENDPOINT", "").rstrip("/")
_MODEL = os.getenv("LLM_MODEL", "llama3")
_TIMEOUT = float(os.getenv("LLM_TIMEOUT", "30"))

_SUPPORTED_TYPES = frozenset({"weak_phrasing", "low_quantification"})


def is_llm_configured() -> bool:
    return bool(_ENDPOINT)


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


def parse_variants(content: str, count: int) -> list[str]:
    """Extract numbered rewrites from raw model output."""
    lines = [l.strip() for l in content.splitlines() if l.strip()]
    variants: list[str] = []
    for line in lines:
        cleaned = re.sub(r"^(\d+[.)]\s*|[-•*]\s*)", "", line).strip()
        if cleaned and len(cleaned) > 10:
            variants.append(cleaned)
        if len(variants) >= count:
            break
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
    if not is_llm_configured():
        return [], False, ""
    if issue_type not in _SUPPORTED_TYPES:
        return [], True, f"Rewrite generation not supported for issue type: {issue_type}"

    # Lazy import so asyncpg/httpx errors don't break startup when not installed
    try:
        import httpx
    except ImportError:
        return [], True, "httpx not installed — run: pip install httpx"

    prompt = build_rewrite_prompt(
        issue_type, original_text, evidence, fix_pattern, rewrite_starter, jd_keywords, count
    )
    payload = {
        "model": _MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.4,
        "max_tokens": 320,
    }

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.post(f"{_ENDPOINT}/v1/chat/completions", json=payload)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"].strip()
            variants = parse_variants(content, count)
            return variants, True, ""
    except Exception as exc:
        return [], True, str(exc)
