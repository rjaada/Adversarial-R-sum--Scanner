"""
Extract plain text from PDF or DOCX. Returns text, parse_integrity score,
and a stripped ATS-preview string (what a naive ATS parser would see).
"""
from __future__ import annotations
import io
import re


def extract_resume_text(file_bytes: bytes, filename: str) -> dict:
    """
    Returns:
        text: full extracted text
        ats_preview: stripped version simulating naive ATS parse
        parse_integrity: float 0-1 (1 = no structural issues detected)
        warnings: list of parser warnings
    """
    filename_lower = filename.lower()
    if filename_lower.endswith(".pdf"):
        return _extract_pdf(file_bytes)
    elif filename_lower.endswith(".docx"):
        return _extract_docx(file_bytes)
    else:
        raise ValueError(f"Unsupported file type: {filename}")


def _extract_pdf(file_bytes: bytes) -> dict:
    import pdfplumber

    warnings: list[str] = []
    pages_text: list[str] = []
    column_detected = False
    table_detected = False

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text(x_tolerance=2, y_tolerance=2) or ""
            pages_text.append(text)

            # Detect multi-column layouts (common ATS failure)
            words = page.extract_words()
            if words:
                x_positions = [w["x0"] for w in words]
                if len(set(round(x / 50) for x in x_positions)) > 6:
                    column_detected = True

            # Detect tables (often lost in ATS)
            if page.extract_tables():
                table_detected = True

    full_text = "\n".join(pages_text)

    if column_detected:
        warnings.append("Multi-column layout detected — ATS may misorder sections")
    if table_detected:
        warnings.append("Tables detected — content may be lost or scrambled in ATS parse")
    if len(full_text.strip()) < 200:
        warnings.append("Very little text extracted — PDF may be image-based or heavily formatted")

    parse_integrity = _compute_parse_integrity(full_text, warnings)
    ats_preview = _strip_to_ats(full_text)

    return {
        "text": full_text,
        "ats_preview": ats_preview,
        "parse_integrity": parse_integrity,
        "warnings": warnings,
    }


def _extract_docx(file_bytes: bytes) -> dict:
    from docx import Document

    warnings: list[str] = []
    doc = Document(io.BytesIO(file_bytes))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    full_text = "\n".join(paragraphs)

    # Check for text boxes (common DOCX formatting trap)
    body_xml = doc.element.body.xml
    if "txbx" in body_xml or "textbox" in body_xml.lower():
        warnings.append("Text boxes detected — content inside text boxes is invisible to most ATS")

    if len(full_text.strip()) < 200:
        warnings.append("Very little text extracted — content may be in text boxes or images")

    parse_integrity = _compute_parse_integrity(full_text, warnings)
    ats_preview = _strip_to_ats(full_text)

    return {
        "text": full_text,
        "ats_preview": ats_preview,
        "parse_integrity": parse_integrity,
        "warnings": warnings,
    }


def _strip_to_ats(text: str) -> str:
    """Simulate what a naive ATS parser sees: collapsed whitespace, no formatting."""
    text = re.sub(r"[^\x20-\x7E\n]", " ", text)
    text = re.sub(r" {2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _compute_parse_integrity(text: str, warnings: list[str]) -> float:
    score = 1.0
    penalty_map = {
        "Multi-column": 0.20,
        "Tables detected": 0.15,
        "Text boxes": 0.25,
        "Very little text": 0.40,
    }
    for warning in warnings:
        for key, penalty in penalty_map.items():
            if key in warning:
                score -= penalty
    return max(0.0, round(score, 2))
