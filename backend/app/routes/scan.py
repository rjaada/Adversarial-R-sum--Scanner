import uuid

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.config import settings
from app.db import get_pool
from app.schemas import ScanResult, ScanSummary
from app.services.extract_resume import extract_resume_text
from app.services.jd_requirements import extract_jd_requirements
from app.services.parse_sections import parse_resume_sections
from app.services.persistence import get_recent_scans, get_scan_by_id, save_scan
from app.services.rewrite_suggestions import generate_fix_suggestions
from app.services.scoring import compute_scores

router = APIRouter()


@router.post("/scan", response_model=ScanResult)
async def scan_resume(
    file: UploadFile = File(...),
    jd_text: str = Form(...),
):
    if not file.filename:
        raise HTTPException(400, "No file provided")
    filename = file.filename.lower()
    if not (filename.endswith(".pdf") or filename.endswith(".docx")):
        raise HTTPException(400, "Only PDF and DOCX files are supported")

    file_bytes = await file.read()
    extracted = extract_resume_text(file_bytes, file.filename)
    sections = parse_resume_sections(extracted["text"])
    jd_reqs = extract_jd_requirements(jd_text)
    scores = compute_scores(sections, jd_reqs, extracted["parse_integrity"])
    issues = generate_fix_suggestions(sections, jd_reqs)

    simulation = None
    if settings.ats_simulation_enabled:
        from app.services.ats_profiles import simulate_profiles
        simulation = simulate_profiles(sections, jd_reqs, extracted["parse_integrity"], issues)

    result = ScanResult(
        scan_id=str(uuid.uuid4()),
        source_id=file.filename,
        ats_text_preview=extracted["ats_preview"],
        resume_sections=sections,
        jd_requirements=jd_reqs,
        scores=scores,
        issues=sorted(issues, key=lambda x: x.impact_score, reverse=True),
        missing_keywords=jd_reqs.get("missing_from_resume", []),
        matched_keywords=jd_reqs.get("matched_keywords", []),
        simulation=simulation,
    )

    pool = get_pool()
    if pool is not None:
        await save_scan(pool, result)

    return result


@router.get("/scans", response_model=list[ScanSummary])
async def list_scans():
    pool = get_pool()
    if pool is None:
        return []
    return await get_recent_scans(pool)


@router.get("/scans/{scan_id}", response_model=ScanResult)
async def fetch_scan(scan_id: str):
    pool = get_pool()
    if pool is None:
        raise HTTPException(503, "Database not configured")
    result = await get_scan_by_id(pool, scan_id)
    if result is None:
        raise HTTPException(404, "Scan not found")
    return result
