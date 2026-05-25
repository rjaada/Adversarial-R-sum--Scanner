from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse

from app.db import get_pool
from app.schemas import ScanResult
from app.services.persistence import get_scan_by_id
from app.services.report_generator import generate_html_report

router = APIRouter()


@router.get("/scans/{scan_id}/report", response_class=HTMLResponse)
async def report_by_id(scan_id: str) -> HTMLResponse:
    """Retrieve a stored scan and return its HTML report."""
    pool = get_pool()
    if pool is None:
        raise HTTPException(503, "Database not configured")
    scan = await get_scan_by_id(pool, scan_id)
    if scan is None:
        raise HTTPException(404, "Scan not found")
    return HTMLResponse(content=generate_html_report(scan))


@router.post("/export", response_class=HTMLResponse)
async def export_report(scan: ScanResult) -> HTMLResponse:
    """Generate an HTML report from a ScanResult body — fallback for unsaved/mock scans."""
    return HTMLResponse(content=generate_html_report(scan))
