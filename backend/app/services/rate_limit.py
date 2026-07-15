"""
Dependency-free in-process rate limiting for the expensive, anonymous /scan
endpoint. On scale-to-zero billing an unthrottled scan loop is both a DoS and
a cost-amplification vector (audit).

Two sliding windows guard the endpoint:
  * per-client — best-effort, keyed on the first X-Forwarded-For hop (the real
    caller behind the Vercel proxy) or the socket IP.
  * global — a coarse ceiling that caps total spend regardless of IP games,
    since X-Forwarded-For is spoofable when the container is publicly reachable.

In-process means the window is per-replica (max 3), which is fine as a first
line of defence for a beta. Disabled in `development` so local dev and the test
suite are unaffected; enforced only when ENVIRONMENT is production/staging.
"""
from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

from app.config import settings


class SlidingWindowLimiter:
    def __init__(self, max_events: int, window_seconds: float):
        self.max = max_events
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str) -> bool:
        """Record a hit; return False if the key is over its limit."""
        now = time.monotonic()
        cutoff = now - self.window
        dq = self._hits[key]
        while dq and dq[0] < cutoff:
            dq.popleft()
        if not dq and key != "__global__":
            # Drop empty buckets so the dict doesn't grow unbounded over unique IPs.
            del self._hits[key]
            dq = self._hits[key]
        if len(dq) >= self.max:
            return False
        dq.append(now)
        return True


# 10 scans / minute per client; 60 / minute across the whole replica.
_per_client = SlidingWindowLimiter(max_events=10, window_seconds=60)
_global = SlidingWindowLimiter(max_events=60, window_seconds=60)

# Live rescans are cheap (pure text scoring, no parse) but fired while typing —
# allow a much higher per-client rate.
_rescan_per_client = SlidingWindowLimiter(max_events=60, window_seconds=60)
_rescan_global = SlidingWindowLimiter(max_events=300, window_seconds=60)


def _client_key(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def scan_rate_limit(request: Request) -> None:
    """FastAPI dependency — raises 429 when the scan endpoint is over its rate."""
    if settings.environment.lower() == "development":
        return
    if not _global.check("__global__"):
        raise HTTPException(429, "The scanner is busy right now — please try again in a minute.")
    if not _per_client.check(_client_key(request)):
        raise HTTPException(429, "Too many scans in a short time. Please wait a minute and try again.")


async def rescan_rate_limit(request: Request) -> None:
    """Typing-friendly limiter for live edit-and-rescore."""
    if settings.environment.lower() == "development":
        return
    if not _rescan_global.check("__global__"):
        raise HTTPException(429, "Live re-scoring is busy — give it a few seconds.")
    if not _rescan_per_client.check(_client_key(request)):
        raise HTTPException(429, "Re-scoring too fast — pause a moment.")
