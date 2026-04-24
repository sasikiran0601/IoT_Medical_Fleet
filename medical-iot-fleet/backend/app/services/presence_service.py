from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.device import Device


MQTT_SOURCES = {"mqtt"}
HTTP_SOURCES = {"http"}


def _to_utc_naive(ts: datetime | None) -> datetime | None:
    if ts is None:
        return None
    if ts.tzinfo is not None:
        return ts.astimezone(timezone.utc).replace(tzinfo=None)
    return ts


def seconds_since(ts: datetime | None, now_utc: datetime | None = None) -> int | None:
    normalized = _to_utc_naive(ts)
    if normalized is None:
        return None
    now = now_utc or datetime.utcnow()
    return max(0, int((now - normalized).total_seconds()))


def seconds_since_last_seen(last_seen: datetime | None, now_utc: datetime | None = None) -> int | None:
    return seconds_since(last_seen, now_utc)


def _http_connected(device: Device, now_utc: datetime) -> bool:
    offline_after = max(2, int(settings.DEVICE_OFFLINE_SECONDS))
    silent_for = seconds_since(device.last_data_at or device.last_seen, now_utc)
    if silent_for is None:
        return False
    return silent_for <= offline_after


def compute_presence_snapshot(device: Device, now_utc: datetime | None = None) -> dict:
    now = now_utc or datetime.utcnow()
    presence_source = (device.presence_source or "unknown").strip().lower() or "unknown"

    status_age = seconds_since(device.last_status_at, now)
    data_age = seconds_since(device.last_data_at or device.last_seen, now)

    status_timeout = max(5, int(settings.DEVICE_STATUS_TIMEOUT_SECONDS))
    stale_after = max(5, int(settings.DEVICE_DATA_STALE_SECONDS))
    http_offline_after = max(2, int(settings.DEVICE_OFFLINE_SECONDS))

    if presence_source in MQTT_SOURCES:
        if data_age is not None and data_age <= stale_after and (status_age is None or status_age > status_timeout):
            connection_state = "connected"
        elif device.last_status_at is not None:
            connection_state = "connected" if (status_age is not None and status_age <= status_timeout) else "disconnected"
        elif data_age is not None and data_age <= http_offline_after:
            connection_state = "connected"
        else:
            connection_state = "unknown"

        if data_age is None:
            data_state = "unknown"
        elif data_age <= stale_after:
            data_state = "fresh"
        else:
            data_state = "stale"

        is_online = connection_state == "connected"
    else:
        connected = _http_connected(device, now)
        connection_state = "connected" if connected else "disconnected"
        if data_age is None:
            data_state = "unknown"
        elif data_age <= stale_after:
            data_state = "fresh"
        else:
            data_state = "stale"
        is_online = connected
        if presence_source not in HTTP_SOURCES:
            presence_source = "http" if device.last_data_at or device.last_seen else "unknown"

    last_data_at = device.last_data_at or device.last_seen
    return {
        "presence_source": presence_source,
        "connection_state": connection_state,
        "data_state": data_state,
        "last_status_at": _to_utc_naive(device.last_status_at),
        "last_data_at": _to_utc_naive(last_data_at),
        "last_seen": _to_utc_naive(last_data_at),
        "is_online": is_online,
        "status_age_seconds": status_age,
        "data_age_seconds": data_age,
    }


def apply_presence_snapshot(device: Device, snapshot: dict) -> None:
    device.presence_source = snapshot["presence_source"]
    device.connection_state = snapshot["connection_state"]
    device.data_state = snapshot["data_state"]
    device.last_status_at = snapshot["last_status_at"]
    device.last_data_at = snapshot["last_data_at"]
    device.last_seen = snapshot["last_seen"]
    device.is_online = snapshot["is_online"]


async def reconcile_online_flags(db: AsyncSession, devices: Iterable[Device]) -> list[tuple[Device, dict, dict]]:
    now = datetime.utcnow()
    changed: list[tuple[Device, dict, dict]] = []

    for device in devices:
        before = {
            "presence_source": device.presence_source or "unknown",
            "connection_state": device.connection_state or "unknown",
            "data_state": device.data_state or "unknown",
            "is_online": bool(device.is_online),
            "last_status_at": _to_utc_naive(device.last_status_at),
            "last_data_at": _to_utc_naive(device.last_data_at or device.last_seen),
            "last_seen": _to_utc_naive(device.last_seen),
        }
        after = compute_presence_snapshot(device, now)
        if before != {
            "presence_source": after["presence_source"],
            "connection_state": after["connection_state"],
            "data_state": after["data_state"],
            "is_online": after["is_online"],
            "last_status_at": after["last_status_at"],
            "last_data_at": after["last_data_at"],
            "last_seen": after["last_seen"],
        }:
            apply_presence_snapshot(device, after)
            changed.append((device, before, after))

    if changed:
        await db.commit()

    return changed
