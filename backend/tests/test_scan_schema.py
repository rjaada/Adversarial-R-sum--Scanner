"""
Schema-contract guard. FastAPI's response_model silently DROPS any field not
declared on the model (pydantic ignores unknown constructor kwargs), so a
field accidentally displaced out of ScanResult vanishes from every API
response without any test failing — this happened with top_fixes/simulation/
gated/total_issues and crashed the signed-in frontend. Pin the contract.
"""
from app.schemas import ScanResult, RescanResult


def test_scan_result_declares_full_contract():
    expected = {
        "scan_id", "source_id", "ats_text_preview", "resume_sections",
        "jd_requirements", "scores", "issues", "missing_keywords",
        "matched_keywords", "keyword_categories", "keyword_frequencies",
        "formatting_audit", "matched_via", "top_fixes", "simulation",
        "gated", "total_issues",
    }
    assert expected <= set(ScanResult.model_fields), (
        f"ScanResult lost fields: {expected - set(ScanResult.model_fields)}"
    )


def test_rescan_result_declares_full_contract():
    expected = {
        "scores", "issues", "total_issues", "missing_keywords",
        "matched_keywords", "keyword_categories", "keyword_frequencies",
        "matched_via",
    }
    assert expected <= set(RescanResult.model_fields), (
        f"RescanResult lost fields: {expected - set(RescanResult.model_fields)}"
    )
