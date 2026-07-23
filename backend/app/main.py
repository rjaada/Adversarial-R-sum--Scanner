import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import init_pool, close_pool
from app.routes import scan, rewrite, report, analytics, health, account, feedback

# DEBUG only in development — at DEBUG the app logs résumé-derived content, which
# must never reach production log aggregation (security audit). Override with
# LOG_LEVEL if needed.
_default_level = "DEBUG" if settings.environment.lower() == "development" else "INFO"
_level = os.getenv("LOG_LEVEL", _default_level).upper()
logging.basicConfig(level=getattr(logging, _level, logging.INFO),
                    format="%(name)s %(levelname)s %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    yield
    await close_pool()


app = FastAPI(title="TraceRank API", version="0.2.0", lifespan=lifespan)

# Resolved from ENVIRONMENT + ALLOWED_ORIGINS: "*" only in development,
# never a wildcard in production (see Settings.cors_origins).
origins = settings.cors_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Internal-Secret"],
    allow_credentials=False,
)

app.include_router(health.router)
app.include_router(scan.router, prefix="/api")
app.include_router(rewrite.router, prefix="/api")
app.include_router(report.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(account.router, prefix="/api")
app.include_router(feedback.router, prefix="/api")
