import json
import logging

from fastapi import APIRouter
from fastapi.responses import Response

from app.config import settings
from app.schemas import AnalyticsEvent

router = APIRouter()
logger = logging.getLogger("tracerank.analytics")


@router.post("/analytics/event", status_code=204)
async def track_event(event: AnalyticsEvent) -> Response:
    if not settings.analytics_enabled:
        return Response(status_code=204)
    logger.info(json.dumps({"analytics": event.model_dump()}))
    return Response(status_code=204)
