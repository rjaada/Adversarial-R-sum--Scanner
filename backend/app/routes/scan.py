import logging
import traceback
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.config import settings
from app.db import get_pool
from app.schemas import ScanResult, ScanSummary
from app.services.extract_resume import extract_resume_text
from app.services.fix_ranker import rank_fixes
from app.services.jd_requirements import extract_jd_requirements
from app.services.parse_sections import parse_resume_sections
from app.services.persistence import get_recent_scans, get_scan_by_id, save_scan
from app.services.rewrite_suggestions import generate_fix_suggestions
from app.services.scoring import extract_raw_signals, scores_from_raw

log = logging.getLogger(__name__)
router = APIRouter()


@router.post("/scan", response_model=ScanResult)
async def scan_resume(
    file: UploadFile = File(...),
    jd_text: str = Form(...),
):
    try:
        if not file.filename:
            raise HTTPException(400, "No file provided")
        filename = file.filename.lower()
        if not (filename.endswith(".pdf") or filename.endswith(".docx")):
            raise HTTPException(400, "Only PDF and DOCX files are supported")

        scan_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        file_bytes = await file.read()
        extracted = extract_resume_text(file_bytes, file.filename)
        sections = parse_resume_sections(extracted["text"])
        jd_reqs = extract_jd_requirements(jd_text)
        raw = extract_raw_signals(sections, jd_reqs, extracted["parse_integrity"])
        scores = scores_from_raw(raw)
        issues = generate_fix_suggestions(sections, jd_reqs)

        simulation = None
        if settings.ats_simulation_enabled:
            from app.services.ats_profiles import simulate_profiles
            simulation = simulate_profiles(sections, jd_reqs, extracted["parse_integrity"], issues)

        sorted_issues = sorted(issues, key=lambda x: x.impact_score, reverse=True)
        top_fixes = rank_fixes(sorted_issues, raw)

        matched_kw = [k for k in jd_reqs.get("keywords", []) if k.lower() in extracted["text"].lower()]
        missing_kw = [k for k in jd_reqs.get("keywords", []) if k.lower() not in extracted["text"].lower()]

        summary = ScanSummary(
            scan_id=scan_id,
            source_id=file.filename,
            scanned_at=now,
            overall_score=scores.overall,
            total_issues=len(sorted_issues),
            critical_count=sum(1 for i in sorted_issues if i.severity == "critical"),
            high_count=sum(1 for i in sorted_issues if i.severity == "high"),
            medium_count=sum(1 for i in sorted_issues if i.severity == "medium"),
            low_count=sum(1 for i in sorted_issues if i.severity == "low"),
        )

        result = ScanResult(
            scan_id=scan_id,
            source_id=file.filename,
            ats_text_preview=extracted.get("ats_preview", ""),
            resume_sections=sections if isinstance(sections, dict) else {},
            jd_requirements=jd_reqs if isinstance(jd_reqs, dict) else {},
            scores=scores,
            issues=sorted_issues,
            missing_keywords=missing_kw,
            matched_keywords=matched_kw,
            top_fixes=top_fixes,
            simulation=simulation,
        )

        pool = get_pool()
        if pool is not None:
            try:
                await save_scan(pool, result)
            except Exception as db_err:
                log.warning("save_scan failed (non-fatal): %s", db_err)

        return result

    except HTTPException:
        raise
    except Exception as exc:
        tb = traceback.format_exc()
        log.error("scan_resume unhandled error: %s\n%s", exc, tb)
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}")


@router.get("/scans")
async def list_scans():
    pool = get_pool()
    if pool is None:
        return []
    try:
        return await get_recent_scans(pool)
    except Exception as exc:
        log.error("list_scans error: %s", exc)
        return []


@router.get("/scans/{scan_id}")
async def get_scan(scan_id: str):
    pool = get_pool()
    if pool is None:
        raise HTTPException(404, "Database not configured")
    try:
        result = await get_scan_by_id(pool, scan_id)
        if result is None:
            raise HTTPException(404, "Scan not found")
        return result
    except HTTPException:
        raise
    except Exception as exc:
        log.error("get_scan error: %s", exc)
        raise HTTPException(500, detail=f"{type(exc).__name__}: {exc}")
