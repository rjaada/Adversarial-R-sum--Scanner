import os
from fastapi import APIRouter
from app.schemas import RewriteRequest, RewriteResponse
from app.services.llm_rewrite import generate_rewrite_variants, is_llm_configured

router = APIRouter()


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
        model=os.getenv("LLM_MODEL", "llama3") if available else "",
        error=error,
    )
