"""
Rewrite eval: deterministic pipeline compliance tests using golden-set fixtures.
No live model required — runs parse_variants + rank_variants on mock LLM output
and checks structural quality properties.

Run after prompt changes to catch regressions:
  pytest tests/test_rewrite_eval.py -v
"""
import re
import pytest
from app.services.llm_rewrite import parse_variants, rank_variants, _STRONG_VERBS, _BANNED_FIRST_WORDS
from app.services.llm_rewrite import _BARE_METRIC_RE
from tests.fixtures.rewrite_eval import REWRITE_CASES


def _run_pipeline(case: dict) -> list[str]:
    """Parse mock LLM output then rank to simulate the full post-generation pipeline."""
    count: int = case["count"]
    raw = parse_variants(case["mock_llm_output"], count * 2)
    return rank_variants(raw, case["jd_keywords"], count)


def _first_word(text: str) -> str:
    return text.split()[0].rstrip(".,;:").lower() if text.split() else ""


def _check_no_bare_metrics(text: str) -> bool:
    return not bool(_BARE_METRIC_RE.search(text))


def _word_count(text: str) -> int:
    return len(text.split())


# ---------------------------------------------------------------------------
# Parametrized pipeline compliance
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("case", REWRITE_CASES, ids=[c["id"] for c in REWRITE_CASES])
def test_pipeline_compliance(case: dict):
    variants = _run_pipeline(case)
    checks = case["quality_checks"]

    # min_count
    min_count = checks.get("min_count", 1)
    assert len(variants) >= min_count, (
        f"[{case['id']}] expected ≥{min_count} variants, got {len(variants)}: {variants}"
    )

    # max_variants
    if "max_variants" in checks:
        assert len(variants) <= checks["max_variants"], (
            f"[{case['id']}] expected ≤{checks['max_variants']} variants, got {len(variants)}"
        )

    # per-variant checks
    for v in variants:
        fw = _first_word(v)

        if checks.get("no_banned_opening"):
            assert fw not in _BANNED_FIRST_WORDS, (
                f"[{case['id']}] banned opening '{fw}' in variant: {v!r}"
            )

        if checks.get("all_start_with_verb"):
            assert fw in _STRONG_VERBS, (
                f"[{case['id']}] first word '{fw}' not a strong verb in variant: {v!r}"
            )

        if "max_words" in checks:
            wc = _word_count(v)
            assert wc <= checks["max_words"], (
                f"[{case['id']}] variant has {wc} words (max {checks['max_words']}): {v!r}"
            )

        if checks.get("no_bare_metrics"):
            assert _check_no_bare_metrics(v), (
                f"[{case['id']}] bare metric found in variant: {v!r}"
            )

    # no_duplicate_prefix
    if checks.get("no_duplicate_prefix") and len(variants) > 1:
        prefixes = [" ".join(v.lower().split()[:4]) for v in variants]
        assert len(prefixes) == len(set(prefixes)), (
            f"[{case['id']}] duplicate 4-word prefix in: {variants}"
        )

    # any_kw_in_any
    if kws := checks.get("any_kw_in_any"):
        all_text = " ".join(v.lower() for v in variants)
        assert any(kw.lower() in all_text for kw in kws), (
            f"[{case['id']}] none of {kws} found in any variant: {variants}"
        )


# ---------------------------------------------------------------------------
# Regression guard: fixture count
# ---------------------------------------------------------------------------

def test_fixture_count():
    """Catch accidental fixture deletions."""
    assert len(REWRITE_CASES) >= 15, f"Expected ≥15 eval cases, got {len(REWRITE_CASES)}"


def test_all_fixture_ids_unique():
    ids = [c["id"] for c in REWRITE_CASES]
    assert len(ids) == len(set(ids)), f"Duplicate fixture IDs: {ids}"


def test_all_fixtures_have_required_keys():
    required = {"id", "issue_type", "original_text", "evidence", "fix_pattern",
                "rewrite_starter", "jd_keywords", "count", "mock_llm_output", "quality_checks"}
    for case in REWRITE_CASES:
        missing = required - case.keys()
        assert not missing, f"Case '{case.get('id', '?')}' missing keys: {missing}"
