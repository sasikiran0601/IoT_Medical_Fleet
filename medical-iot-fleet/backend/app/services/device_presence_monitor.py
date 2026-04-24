import asyncio
from datetime import datetime

from sqlalchemy.future import select

from app.core.config import settings
from app.db.database import AsyncSessionLocal
from app.models.device import Device
from app.services.alert_service import create_alert
from app.services.presence_service import apply_presence_snapshot, compute_presence_snapshot, seconds_since_last_seen
from app.websockets.manager import manager

_consecutive_disconnect_sweeps = {}
_consecutive_stale_sweeps = {}


async def mark_stale_devices_offline() -> int:
    """Reconcile online/offline state from last_seen and push offline transitions."""
    marked_count = 0
    sweeps_required = max(1, int(settings.DEVICE_STALE_SWEEPS_REQUIRED))

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Device))
        devices = result.scalars().all()
        changed = []

        for device in devices:
            device_id = device.device_id
            before = {
                "presence_source": device.presence_source or "unknown",
                "connection_state": device.connection_state or "unknown",
                "data_state": device.data_state or "unknown",
                "is_online": bool(device.is_online),
                "last_status_at": device.last_status_at,
                "last_data_at": device.last_data_at,
                "last_seen": device.last_seen,
            }
            after = compute_presence_snapshot(device)

            allow_apply = True
            if before["connection_state"] != "disconnected" and after["connection_state"] == "disconnected":
                _consecutive_disconnect_sweeps[device_id] = _consecutive_disconnect_sweeps.get(device_id, 0) + 1
                allow_apply = _consecutive_disconnect_sweeps[device_id] >= sweeps_required
            else:
                _consecutive_disconnect_sweeps.pop(device_id, None)

            if before["data_state"] != "stale" and after["data_state"] == "stale":
                _consecutive_stale_sweeps[device_id] = _consecutive_stale_sweeps.get(device_id, 0) + 1
                allow_apply = allow_apply and _consecutive_stale_sweeps[device_id] >= sweeps_required
            else:
                _consecutive_stale_sweeps.pop(device_id, None)

            before_cmp = (
                before["presence_source"],
                before["connection_state"],
                before["data_state"],
                before["is_online"],
                before["last_status_at"],
                before["last_data_at"],
                before["last_seen"],
            )
            after_cmp = (
                after["presence_source"],
                after["connection_state"],
                after["data_state"],
                after["is_online"],
                after["last_status_at"],
                after["last_data_at"],
                after["last_seen"],
            )

            if before_cmp != after_cmp and allow_apply:
                apply_presence_snapshot(device, after)
                changed.append((device, before, after))

        if changed:
            await db.commit()

        for device, before, after in changed:
            became_disconnected = before["connection_state"] != "disconnected" and device.connection_state == "disconnected"
            became_stale = before["data_state"] != "stale" and device.data_state == "stale"

            if became_disconnected:
                marked_count += 1
                silent_for = seconds_since_last_seen(device.last_data_at or device.last_seen)
                if silent_for is None:
                    message = f"{device.name} has gone offline (no recent data)."
                else:
                    message = f"{device.name} has gone offline (no data for {silent_for}s)."

                await create_alert(db, device.id, "OFFLINE", message)
            elif became_stale:
                await create_alert(db, device.id, "STALE_DATA", f"{device.name} is connected but telemetry has gone stale.")

            await manager.broadcast_dashboard(
                {
                    "type": "device_update",
                    "device_id": device.device_id,
                    "presence_source": device.presence_source,
                    "connection_state": device.connection_state,
                    "data_state": device.data_state,
                    "is_online": device.is_online,
                    "is_on": device.is_on,
                    "last_status_at": device.last_status_at.isoformat() if device.last_status_at else None,
                    "last_data_at": device.last_data_at.isoformat() if device.last_data_at else None,
                    "timestamp": datetime.utcnow().isoformat(),
                }
            )

    return marked_count


async def run_device_presence_monitor(stop_event: asyncio.Event):
    """Background loop that enforces offline timeout from last_seen."""
    interval = max(2, int(settings.DEVICE_PRESENCE_SWEEP_SECONDS))

    while not stop_event.is_set():
        try:
            await mark_stale_devices_offline()
        except Exception as exc:
            print(f"[Presence] monitor error: {exc}")

        try:
            await asyncio.wait_for(stop_event.wait(), timeout=interval)
        except asyncio.TimeoutError:
            pass
