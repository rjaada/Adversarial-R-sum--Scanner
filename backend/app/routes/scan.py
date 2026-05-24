import uuid
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from app.schemas import ScanResult
from app.services.extract_resume import extract_resume_text
from app.services.parse_sections import parse_resume_sections
from app.services.jd_requirements import extract_jd_requirements
from app.services.scoring import compute_scores
from app.services.rewrite_suggestions import generate_fix_suggestions

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

    return ScanResult(
        scan_id=str(uuid.uuid4()),
        source_id=file.filename,
        ats_text_preview=extracted["ats_preview"],
        resume_sections=sections,
        jd_requirements=jd_reqs,
        scores=scores,
        issues=sorted(issues, key=lambda x: x.impact_score, reverse=True),
        missing_keywords=jd_reqs.get("missing_from_resume", []),
        matched_keywords=jd_reqs.get("matched_keywords", []),
    )
