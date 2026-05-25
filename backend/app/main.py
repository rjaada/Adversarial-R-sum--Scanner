import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import init_pool, close_pool
from app.routes import scan, rewrite, report, analytics, health

logging.basicConfig(level=logging.DEBUG, format="%(name)s %(levelname)s %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    yield
    await close_pool()


app = FastAPI(title="TraceRank API", version="0.1.0", lifespan=lifespan)

_origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(scan.router, prefix="/api")
app.include_router(rewrite.router, prefix="/api")
app.include_router(report.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
