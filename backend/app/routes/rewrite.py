from fastapi import APIRouter
from app.config import settings
from app.schemas import LLMStatusResponse, RewriteRequest, RewriteResponse
from app.services.llm_rewrite import (
    check_llm_health,
    generate_rewrite_variants,
    is_llm_configured,
)

router = APIRouter()


@router.get("/rewrite/status", response_model=LLMStatusResponse)
async def rewrite_status():
    if not is_llm_configured():
        return LLMStatusResponse(available=False)
    healthy = await check_llm_health()
    return LLMStatusResponse(
        available=True,
        model=settings.llm_model,
        healthy=healthy,
    )


@router.post("/rewrite", response_model=RewriteResponse)
async def rewrite_issue(req: RewriteRequest):
    if not is_llm_configured():
        return RewriteResponse(variants=[], available=False)

    variants, available, error = await generate_rewrite_variants(
        issue_type=req.issue_type,
        original_text=req.original_text,
        evidence=req.evidence,
        fix_pattern=req.fix_pattern,
        rewrite_starter=req.rewrite_starter,
        jd_keywords=req.jd_keywords,
        count=req.count,
    )
    return RewriteResponse(
        variants=variants,
        available=available,
        model=settings.llm_model if available else "",
        error=error,
    )
