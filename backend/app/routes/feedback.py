import logging

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.auth import optional_user_id
from app.db import get_or_init_pool
from app.schemas import FeedbackPayload

router = APIRouter()
log = logging.getLogger("tracerank.feedback")


@router.post("/feedback", status_code=204)
async def submit_feedback(
    payload: FeedbackPayload,
    user_id: str | None = Depends(optional_user_id),
) -> Response:
    pool = await get_or_init_pool()

    log.info(
        "feedback surface=%s scan_id=%s user=%s",
        payload.surface,
        payload.scan_id,
        user_id or "anon",
    )

    if pool is None:
        # Degrade gracefully: log and accept without persistence
        log.warning("feedback received but DB unavailable — not persisted")
        return Response(status_code=204)

    try:
        await pool.execute(
            """
            INSERT INTO beta_feedback (
                user_id, scan_id, surface,
                usefulness, trustworthiness, most_helpful,
                confusing_text, broken, broken_text,
                report_type, report_text,
                contact_email,
                view_mode, route, user_agent, app_version
            ) VALUES (
                $1, $2, $3,
                $4, $5, $6,
                $7, $8, $9,
                $10, $11,
                $12,
                $13, $14, $15, $16
            )
            """,
            user_id,
            payload.scan_id,
            payload.surface,
            payload.usefulness,
            payload.trustworthiness,
            payload.most_helpful,
            payload.confusing_text,
            payload.broken,
            payload.broken_text,
            payload.report_type,
            payload.report_text,
            payload.contact_email,
            payload.view_mode,
            payload.route,
            payload.user_agent,
            payload.app_version,
        )
    except Exception as exc:
        log.error("Failed to persist feedback: %s", exc)
        # Still return 204 — user shouldn't see feedback submission errors

    return Response(status_code=204)
