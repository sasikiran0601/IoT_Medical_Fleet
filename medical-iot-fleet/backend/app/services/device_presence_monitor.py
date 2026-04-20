import asyncio
from datetime import datetime, timedelta

from sqlalchemy.future import select

from app.core.config import settings
from app.db.database import AsyncSessionLocal
from app.models.device import Device
from app.services.alert_service import create_alert
from app.websockets.manager import manager


async def mark_stale_devices_offline() -> int:
    """Mark stale online devices as offline and push realtime UI updates."""
    offline_after = max(5, int(settings.DEVICE_OFFLINE_SECONDS))
    cutoff = datetime.utcnow() - timedelta(seconds=offline_after)
    marked_count = 0

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Device).where(Device.is_online == True))
        online_devices = result.scalars().all()

        stale_devices = [
            d for d in online_devices
            if d.last_seen is None or d.last_seen < cutoff
        ]

        for device in stale_devices:
            # Stale telemetry means connectivity loss only.
            # Keep power/control state (is_on) unchanged.
            device.is_online = False
            marked_count += 1

        if marked_count > 0:
            await db.commit()

        for device in stale_devices:
            if device.last_seen:
                silent_for = int((datetime.utcnow() - device.last_seen).total_seconds())
                message = f"{device.name} has gone offline (no data for {silent_for}s)."
            else:
                message = f"{device.name} has gone offline (no recent data)."

            await create_alert(db, device.id, "OFFLINE", message)
            await manager.broadcast_dashboard(
                {
                    "type": "device_update",
                    "device_id": device.device_id,
                    "is_online": False,
                    "is_on": device.is_on,
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
