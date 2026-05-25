from fastapi import APIRouter
from app.db import get_or_init_pool

router = APIRouter()


@router.get("/health")
async def health():
    pool = await get_or_init_pool()
    if pool is None:
        return {"status": "ok", "db": "not configured"}
    try:
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        return {"status": "ok", "db": "connected"}
    except Exception:
        return {"status": "ok", "db": "unreachable"}
