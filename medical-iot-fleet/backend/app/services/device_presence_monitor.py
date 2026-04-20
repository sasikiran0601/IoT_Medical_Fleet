import asyncio
from datetime import datetime

from sqlalchemy.future import select

from app.core.config import settings
from app.db.database import AsyncSessionLocal
from app.models.device import Device
from app.services.alert_service import create_alert
from app.services.presence_service import reconcile_online_flags, seconds_since_last_seen
from app.websockets.manager import manager


async def mark_stale_devices_offline() -> int:
    """Reconcile online/offline state from last_seen and push offline transitions."""
    marked_count = 0

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Device))
        devices = result.scalars().all()
        changed = await reconcile_online_flags(db, devices)

        for device, old_state, new_state in changed:
            if old_state and not new_state:
                marked_count += 1
                silent_for = seconds_since_last_seen(device.last_seen)
                if silent_for is None:
                    message = f"{device.name} has gone offline (no recent data)."
                else:
                    message = f"{device.name} has gone offline (no data for {silent_for}s)."

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
