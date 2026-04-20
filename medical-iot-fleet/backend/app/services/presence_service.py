from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.device import Device


def _to_utc_naive(ts: datetime | None) -> datetime | None:
    if ts is None:
        return None
    if ts.tzinfo is not None:
        return ts.astimezone(timezone.utc).replace(tzinfo=None)
    return ts


def seconds_since_last_seen(last_seen: datetime | None, now_utc: datetime | None = None) -> int | None:
    normalized = _to_utc_naive(last_seen)
    if normalized is None:
        return None
    now = now_utc or datetime.utcnow()
    return max(0, int((now - normalized).total_seconds()))


def compute_online_from_last_seen(last_seen: datetime | None, now_utc: datetime | None = None) -> bool:
    offline_after = max(2, int(settings.DEVICE_OFFLINE_SECONDS))
    silent_for = seconds_since_last_seen(last_seen, now_utc)
    if silent_for is None:
        return False
    return silent_for <= offline_after


async def reconcile_online_flags(db: AsyncSession, devices: Iterable[Device]) -> list[tuple[Device, bool, bool]]:
    """
    Recompute effective online state from last_seen and persist changed flags.
    Returns [(device, old_state, new_state), ...] for changed rows.
    """
    now = datetime.utcnow()
    changed: list[tuple[Device, bool, bool]] = []

    for device in devices:
        old_state = bool(device.is_online)
        new_state = compute_online_from_last_seen(device.last_seen, now)
        if old_state != new_state:
            device.is_online = new_state
            changed.append((device, old_state, new_state))

    if changed:
        await db.commit()

    return changed
