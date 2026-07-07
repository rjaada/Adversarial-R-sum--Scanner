import logging
import traceback
import uuid

from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, Depends

from app.auth import get_current_user_id, optional_user_id
from app.config import settings
from app.db import get_pool
from app.schemas import ScanResult, ScanSummary, ClaimScanRequest, Scores
from app.services.extract_resume import extract_resume_text
from app.services.fix_ranker import rank_fixes
from app.services.jd_requirements import extract_jd_requirements
from app.services.parse_sections import parse_resume_sections
from app.services.persistence import (
    get_recent_scans,
    get_scan_by_id,
    get_user_plan,
    save_scan,
    delete_scan,
    upsert_user,
)
from app.services.rewrite_suggestions import generate_fix_suggestions
from app.services.scoring import extract_raw_signals, scores_from_raw

log = logging.getLogger(__name__)
router = APIRouter()

# Upload guardrails
MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB
_READ_CHUNK = 1024 * 1024           # 1 MB

# Magic-byte signatures so a renamed file can't slip past extension checks.
_PDF_MAGIC = b"%PDF"
_DOCX_MAGIC = b"PK\x03\x04"  # DOCX is a ZIP container

# How many issues an unauthenticated caller may see before the gate.
_ANON_ISSUE_LIMIT = 3


async def _read_capped(file: UploadFile) -> bytes:
    """
    Stream the upload in chunks, aborting as soon as it exceeds the cap so a
    huge file never gets fully loaded into memory (audit P1 — DoS vector).
    """
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(_READ_CHUNK)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_UPLOAD_BYTES:
            raise HTTPException(413, "File too large. Maximum size is 5 MB.")
        chunks.append(chunk)
    return b"".join(chunks)


def _validate_magic(file_bytes: bytes, filename_lower: str) -> None:
    """Reject content that doesn't match its claimed extension."""
    if filename_lower.endswith(".pdf") and not file_bytes.startswith(_PDF_MAGIC):
        raise HTTPException(400, "This file is not a valid PDF.")
    if filename_lower.endswith(".docx") and not file_bytes.startswith(_DOCX_MAGIC):
        raise HTTPException(400, "This file is not a valid DOCX.")


def _gate_for_anonymous(result: ScanResult) -> ScanResult:
    """
    Reduce a full ScanResult to the unauthenticated teaser. Everything that
    is résumé-derived content (full issue list, ATS text preview, keyword
    gap lists, fix rankings, profile simulation) is stripped server-side so
    it never reaches the client — the previous client-only gate was
    trivially bypassable in DevTools (audit P1). Only the overall score, the
    keyword-match score, and the first few issues survive, plus a `gated`
    flag and the true `total_issues` count for an honest upgrade nudge.
    """
    jd = result.jd_requirements or {}
    return result.model_copy(update={
        "scores": result.scores.model_copy(update={
            "experience_alignment": 0.0,
            "parse_integrity": 0.0,
            "structure": 0.0,
            "quantified_impact": 0.0,
        }),
        "issues": result.issues[:_ANON_ISSUE_LIMIT],
        "ats_text_preview": "",
        "resume_sections": {},
        # Keep only JD-derived fields the score UI needs; drop résumé correlation.
        "jd_requirements": {
            "required_keywords": jd.get("required_keywords", []),
            "min_years_experience": jd.get("min_years_experience"),
        },
        "missing_keywords": [],
        "matched_keywords": [],
        "top_fixes": [],
        "simulation": None,
        "gated": True,
        "total_issues": len(result.issues),
    })


@router.post("/scan", response_model=ScanResult)
async def scan_resume(
    file: UploadFile = File(...),
    jd_text: str = Form(...),
    user_id: Optional[str] = Depends(optional_user_id),
):
    try:
        if not file.filename:
            raise HTTPException(400, "No file provided")
        filename = file.filename.lower()
        if not (filename.endswith(".pdf") or filename.endswith(".docx")):
            raise HTTPException(400, "Only PDF and DOCX files are supported")

        scan_id = str(uuid.uuid4())

        # Size cap (streamed) + content-signature validation before parsing.
        file_bytes = await _read_capped(file)
        _validate_magic(file_bytes, filename)

        try:
            extracted = extract_resume_text(file_bytes, file.filename)
        except HTTPException:
            raise
        except Exception as extract_err:
            log.warning("extract_resume_text failed for %r: %s", file.filename, extract_err)
            raise HTTPException(
                400,
                "Could not parse this file. Please check it is a valid, unencrypted PDF or DOCX.",
            )

        sections = parse_resume_sections(extracted["text"])
        jd_reqs = extract_jd_requirements(jd_text)
        raw = extract_raw_signals(sections, jd_reqs, extracted["parse_integrity"])
        scores = scores_from_raw(raw)
        # Surface structural parse warnings as a real issue (audit P2 / Fix 3).
        issues = generate_fix_suggestions(sections, jd_reqs, warnings=extracted.get("warnings", []))

        simulation = None
        if settings.ats_simulation_enabled:
            from app.services.ats_profiles import simulate_profiles
            simulation = simulate_profiles(sections, jd_reqs, extracted["parse_integrity"], issues)

        sorted_issues = sorted(issues, key=lambda x: x.impact_score, reverse=True)
        top_fixes = rank_fixes(sorted_issues, raw)

        matched_kw = [k for k in jd_reqs.get("required_keywords", []) if k.lower() in extracted["text"].lower()]
        missing_kw = [k for k in jd_reqs.get("required_keywords", []) if k.lower() not in extracted["text"].lower()]

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
            gated=False,
            total_issues=len(sorted_issues),
        )

        # Persist the FULL result (gating only affects what is returned).
        pool = get_pool()
        if pool is not None:
            plan = "free"
            if user_id:
                try:
                    await upsert_user(pool, user_id)
                    plan = await get_user_plan(pool, user_id)
                except Exception as db_err:
                    # Don't let a users-table failure take the scan save with it.
                    log.warning("user upsert/plan lookup failed (non-fatal): %s", db_err)
            try:
                await save_scan(pool, result, user_id=user_id, jd_text=jd_text, plan=plan)
            except Exception as db_err:
                log.warning("save_scan failed (non-fatal): %s", db_err)

        # Authenticated callers get the full report; anonymous get the teaser.
        if user_id:
            return result
        return _gate_for_anonymous(result)

    except HTTPException:
        raise
    except Exception as exc:
        # Log the detail server-side; never leak internals to the client.
        log.error("scan_resume unhandled error: %s\n%s", exc, traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while analyzing the résumé. Please try again.",
        )


@router.post("/scans/claim", response_model=ScanSummary)
async def claim_scan(
    payload: ClaimScanRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Attach a guest scan (stored in browser) to an authenticated account."""
    pool = get_pool()
    if pool is None:
        raise HTTPException(503, "Database not configured")

    try:
        result = ScanResult.model_validate(payload.result)
    except Exception:
        raise HTTPException(422, "Invalid scan result payload")

    try:
        await upsert_user(pool, user_id)
        plan = await get_user_plan(pool, user_id)
        # The jd_text is not available here — pass empty string, hash will be null
        await save_scan(pool, result, user_id=user_id, jd_text="", plan=plan)
    except Exception as exc:
        log.error("claim_scan failed: %s", exc)
        raise HTTPException(500, "Failed to claim scan")

    return ScanSummary(
        scan_id=result.scan_id,
        source_id=result.source_id,
        scanned_at=payload.scanned_at,
        overall_score=result.scores.overall,
    )


@router.get("/scans", response_model=list[ScanSummary])
async def list_scans(user_id: str = Depends(get_current_user_id)):
    pool = get_pool()
    if pool is None:
        return []
    try:
        return await get_recent_scans(pool, user_id)
    except Exception as exc:
        log.error("list_scans error: %s", exc)
        return []


@router.get("/scans/{scan_id}", response_model=ScanResult)
async def get_scan(
    scan_id: str,
    user_id: str = Depends(get_current_user_id),
):
    pool = get_pool()
    if pool is None:
        raise HTTPException(503, "Database not configured")
    try:
        result = await get_scan_by_id(pool, scan_id, user_id=user_id)
        if result is None:
            raise HTTPException(404, "Scan not found")
        return result
    except HTTPException:
        raise
    except Exception as exc:
        log.error("get_scan error: %s", exc)
        raise HTTPException(status_code=500, detail="Could not load the requested scan.")


@router.delete("/scans/{scan_id}", status_code=204)
async def delete_scan_endpoint(
    scan_id: str,
    user_id: str = Depends(get_current_user_id),
):
    pool = get_pool()
    if pool is None:
        raise HTTPException(503, "Database not configured")
    deleted = await delete_scan(pool, scan_id, user_id)
    if not deleted:
        raise HTTPException(404, "Scan not found")
