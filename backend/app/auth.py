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

# Cache: one entry ("client"), TTL = 3600 s. On expiry a fresh client is built;
# `_last_good_client` survives the TTL and keeps its cached keys, so a transient
# JWKS-fetch failure falls back to still-valid keys instead of 503-ing all auth.
_jwks_cache: TTLCache = TTLCache(maxsize=1, ttl=3600)
_last_good_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    """Return a PyJWKClient (cached for the TTL, else freshly built)."""
    cached = _jwks_cache.get("client")
    if cached is not None:
        return cached
    if not settings.clerk_jwks_url:
        raise HTTPException(503, "CLERK_JWKS_URL not configured")
    client = PyJWKClient(settings.clerk_jwks_url, cache_keys=True)
    _jwks_cache["client"] = client
    return client


def _signing_key(token: str):
    """Resolve the signing key, falling back to the last client whose keys
    worked if a fresh JWKS fetch fails transiently."""
    global _last_good_client
    client = _get_jwks_client()
    try:
        key = client.get_signing_key_from_jwt(token)
        _last_good_client = client
        return key
    except PyJWKClientError as exc:
        if _last_good_client is not None and _last_good_client is not client:
            try:
                return _last_good_client.get_signing_key_from_jwt(token)
            except PyJWKClientError:
                pass
        raise exc


def _expected_issuer() -> Optional[str]:
    """Derive the Clerk issuer from the JWKS URL (…/.well-known/jwks.json)."""
    marker = "/.well-known/jwks.json"
    url = settings.clerk_jwks_url or ""
    return url[: -len(marker)] if url.endswith(marker) else None


def _verify_token(token: str) -> str:
    """Verify a Clerk JWT and return the user_id (sub claim)."""
    issuer = _expected_issuer()
    try:
        signing_key = _signing_key(token)
        # Clerk session tokens carry no `aud`; identity is bound by the
        # instance-scoped signing key + `iss`, and (optionally) `azp` against an
        # origin allowlist. Verify issuer and require exp/sub; audience stays off
        # by design (audit — hardened without breaking working tokens).
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=issuer,
            options={
                "verify_aud": False,
                "verify_iss": issuer is not None,
                "require": ["exp", "sub"],
            },
        )
        parties = [p.strip() for p in settings.clerk_authorized_parties.split(",") if p.strip()]
        if parties:
            azp = payload.get("azp")
            if azp and azp not in parties:
                raise HTTPException(401, "Token authorized party not allowed")
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
