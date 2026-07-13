import hmac
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import JSONResponse

from app.auth import get_current_user_id
from app.config import settings
from app.db import get_pool
from app.schemas import (
    ThemePrefUpdate,
    WaitlistEntry,
    PurgeResult,
    ScanSummary,
    UserProfile,
)
from app.services.persistence import (
    get_all_scan_summaries,
    delete_all_user_scans,
    delete_user_account,
    purge_expired_scans,
    update_theme_pref,
    upsert_user,
    get_user_plan,
    add_to_waitlist,
)

log = logging.getLogger(__name__)
router = APIRouter()


@router.post("/users/sync", status_code=204)
async def sync_user(user_id: str = Depends(get_current_user_id)):
    """Called after Clerk sign-up to ensure a users row exists."""
    pool = get_pool()
    if pool is None:
        return
    await upsert_user(pool, user_id)


@router.get("/account/profile", response_model=UserProfile)
async def get_profile(user_id: str = Depends(get_current_user_id)):
    pool = get_pool()
    if pool is None:
        return UserProfile(clerk_user_id=user_id, plan="free")
    plan = await get_user_plan(pool, user_id)
    row = await pool.fetchrow(
        "SELECT theme_pref, bench_opt_in FROM users WHERE clerk_user_id = $1",
        user_id,
    )
    return UserProfile(
        clerk_user_id=user_id,
        plan=plan,
        theme_pref=row["theme_pref"] if row else None,
        bench_opt_in=row["bench_opt_in"] if row else False,
    )


@router.patch("/account/theme", status_code=204)
async def update_theme(
    body: ThemePrefUpdate,
    user_id: str = Depends(get_current_user_id),
):
    pool = get_pool()
    if pool is None:
        return
    await upsert_user(pool, user_id)
    await update_theme_pref(pool, user_id, body.theme_pref)


@router.get("/account/export")
async def export_account_data(user_id: str = Depends(get_current_user_id)):
    pool = get_pool()
    if pool is None:
        raise HTTPException(503, "Database not configured")
    summaries = await get_all_scan_summaries(pool, user_id)
    return {
        "user_id": user_id,
        "scans": [s.model_dump() for s in summaries],
        "note": "Raw résumé files and job description text are never stored and therefore not included in this export.",
    }


@router.delete("/account/scans", status_code=200)
async def delete_all_scans(user_id: str = Depends(get_current_user_id)):
    pool = get_pool()
    if pool is None:
        raise HTTPException(503, "Database not configured")
    count = await delete_all_user_scans(pool, user_id)
    return {"deleted": count}


@router.delete("/account", status_code=204)
async def delete_account(user_id: str = Depends(get_current_user_id)):
    """
    Mark all scans for immediate expiry and delete the user row.
    The cron job clears scan rows within 24 hours.
    Caller is responsible for deleting the Clerk account via Clerk SDK after this returns.
    """
    pool = get_pool()
    if pool is None:
        raise HTTPException(503, "Database not configured")
    await delete_user_account(pool, user_id)


@router.get("/internal/purge-expired", response_model=PurgeResult)
async def purge_expired(
    x_internal_secret: Optional[str] = Header(None, alias="X-Internal-Secret"),
):
    """Cron endpoint — protected by shared secret, not user auth."""
    if not settings.internal_cron_secret:
        raise HTTPException(503, "INTERNAL_CRON_SECRET not configured")
    # Constant-time compare so the secret can't be recovered via timing (audit).
    if not hmac.compare_digest(x_internal_secret or "", settings.internal_cron_secret):
        raise HTTPException(401, "Unauthorized")
    pool = get_pool()
    if pool is None:
        return PurgeResult(deleted=0)
    deleted = await purge_expired_scans(pool)
    log.info("Purged %d expired scans", deleted)
    return PurgeResult(deleted=deleted)


@router.post("/waitlist", status_code=201)
async def join_waitlist(body: WaitlistEntry):
    pool = get_pool()
    if pool is None:
        raise HTTPException(503, "Database not configured")
    email = body.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(422, "Invalid email")
    await add_to_waitlist(pool, email)
    return {"status": "ok"}
