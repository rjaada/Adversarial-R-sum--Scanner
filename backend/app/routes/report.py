from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import HTMLResponse

from app.auth import get_current_user_id
from app.db import get_pool
from app.schemas import ScanResult
from app.services.persistence import get_scan_by_id
from app.services.report_generator import generate_html_report

router = APIRouter()


@router.get("/scans/{scan_id}/report", response_class=HTMLResponse)
async def report_by_id(
    scan_id: str,
    user_id: str = Depends(get_current_user_id),
) -> HTMLResponse:
    """
    Retrieve a stored scan and return its HTML report.

    The query is scoped to the authenticated owner (audit P1 — this route
    previously fetched any scan by id with no ownership check, an IDOR). A
    scan that does not belong to the caller is reported as 404 rather than
    403 on purpose: a 403 would confirm the id exists, leaking an existence
    oracle. Scoping the lookup makes "not yours" and "not found"
    indistinguishable to the client.
    """
    pool = get_pool()
    if pool is None:
        raise HTTPException(503, "Database not configured")
    scan = await get_scan_by_id(pool, scan_id, user_id=user_id)
    if scan is None:
        raise HTTPException(404, "Scan not found")
    return HTMLResponse(content=generate_html_report(scan))


@router.post("/export", response_class=HTMLResponse)
async def export_report(
    scan: ScanResult,
    user_id: str = Depends(get_current_user_id),
) -> HTMLResponse:
    """
    Generate an HTML report from a ScanResult body — fallback for unsaved
    scans. Requires authentication: export is a signed-in feature, and an
    open endpoint would let anyone render arbitrary report HTML.
    """
    return HTMLResponse(content=generate_html_report(scan))
