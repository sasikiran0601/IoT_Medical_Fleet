import math
import time
from collections import deque
from threading import Lock

from fastapi import HTTPException, Request

from app.core.config import settings


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._events: dict[tuple[str, str], deque[float]] = {}
        self._lock = Lock()
        self._cleanup_counter = 0

    def allow(self, bucket: str, key: str, limit: int, window_seconds: int) -> tuple[bool, int]:
        if not settings.RATE_LIMIT_ENABLED or limit <= 0 or window_seconds <= 0:
            return True, 0

        now = time.monotonic()
        cutoff = now - window_seconds

        with self._lock:
            event_key = (bucket, key)
            queue = self._events.setdefault(event_key, deque())
            while queue and queue[0] <= cutoff:
                queue.popleft()

            if len(queue) >= limit:
                retry_after = max(1, int(math.ceil(window_seconds - (now - queue[0]))))
                return False, retry_after

            queue.append(now)
            self._cleanup_counter += 1
            if self._cleanup_counter % 256 == 0:
                self._cleanup(cutoff)

        return True, 0

    def _cleanup(self, cutoff: float) -> None:
        empty_keys = []
        for key, queue in self._events.items():
            while queue and queue[0] <= cutoff:
                queue.popleft()
            if not queue:
                empty_keys.append(key)
        for key in empty_keys:
            self._events.pop(key, None)


rate_limiter = InMemoryRateLimiter()


def get_request_identity(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        first_ip = forwarded_for.split(",")[0].strip()
        if first_ip:
            return first_ip
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def enforce_request_rate_limit(
    request: Request,
    bucket: str,
    limit: int,
    window_seconds: int,
    scope_key: str | None = None,
) -> None:
    identity = get_request_identity(request)
    if scope_key:
        identity = f"{identity}:{scope_key}"

    allowed, retry_after = rate_limiter.allow(bucket, identity, limit, window_seconds)
    if allowed:
        return

    raise HTTPException(
        status_code=429,
        detail="Rate limit exceeded. Please try again shortly.",
        headers={"Retry-After": str(retry_after)},
    )
