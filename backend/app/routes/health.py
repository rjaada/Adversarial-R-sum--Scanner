from fastapi import APIRouter
from app.db import get_pool

router = APIRouter()


@router.get("/health")
async def health():
    db_ok = get_pool() is not None
    return {"status": "ok", "db": "connected" if db_ok else "not configured"}
