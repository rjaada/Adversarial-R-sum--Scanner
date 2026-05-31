"""
Clerk JWT verification for FastAPI.

Every protected endpoint depends on `get_current_user_id`.
Public endpoints that optionally identify a caller use `optional_user_id`.

The JWKS endpoint is fetched once and cached for 1 hour. On refresh failure
the last known good set of keys is used and the failure is logged — we never
lock out all users because of a transient network error.
"""
from __future__ import annotations

import logging
import time
from typing import Optional

import httpx
import jwt
from cachetools import TTLCache
from fastapi import Depends, Header, HTTPException
from jwt import PyJWKClient, PyJWKClientError

from app.config import settings

log = logging.getLogger(__name__)

# Cache: one entry ("jwks"), TTL = 3600 s
_jwks_cache: TTLCache = TTLCache(maxsize=1, ttl=3600)
_last_good_keys: list[dict] | None = None


def _get_jwks_client() -> PyJWKClient:
    """Return a PyJWKClient, reading JWKS from cache or network."""
    global _last_good_keys

    cached = _jwks_cache.get("client")
    if cached is not None:
        return cached

    if not settings.clerk_jwks_url:
        raise HTTPException(503, "CLERK_JWKS_URL not configured")

    try:
        client = PyJWKClient(settings.clerk_jwks_url, cache_keys=True)
        _jwks_cache["client"] = client
        return client
    except Exception as exc:
        log.warning("JWKS refresh failed: %s", exc)
        # Try to return a stale client if we have one
        if "client_stale" in _jwks_cache:
            return _jwks_cache["client_stale"]  # type: ignore[return-value]
        raise HTTPException(503, "Authentication service temporarily unavailable")


def _verify_token(token: str) -> str:
    """Verify a Clerk JWT and return the user_id (sub claim)."""
    client = _get_jwks_client()
    try:
        signing_key = client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        user_id: str = payload.get("sub", "")
        if not user_id:
            raise HTTPException(401, "Invalid token: missing sub claim")
        return user_id
    except PyJWKClientError as exc:
        log.warning("JWKS key lookup failed: %s", exc)
        raise HTTPException(401, "Token verification failed")
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError as exc:
        log.debug("Invalid JWT: %s", exc)
        raise HTTPException(401, "Invalid token")


def get_current_user_id(
    authorization: str = Header(..., alias="Authorization"),
) -> str:
    """FastAPI dependency — raises 401 if not authenticated."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authorization header must be 'Bearer <token>'")
    token = authorization.removeprefix("Bearer ")
    return _verify_token(token)


def optional_user_id(
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> Optional[str]:
    """FastAPI dependency — returns None for unauthenticated requests."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ")
    try:
        return _verify_token(token)
    except HTTPException:
        return None
