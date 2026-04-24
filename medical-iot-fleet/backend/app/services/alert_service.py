from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.alert import Alert
from app.models.device import Device
from app.services.presence_service import compute_presence_snapshot, seconds_since_last_seen


async def create_alert(
    db: AsyncSession,
    device_id: str,
    alert_type: str,
    message: str,
):
    alert = Alert(
        device_id=device_id,
        alert_type=alert_type,
        message=message,
    )
    db.add(alert)
    await db.commit()
    return alert


async def check_long_running(db: AsyncSession, device: Device):
    """Alert if device has been ON for more than 8 hours."""
    from app.models.audit_log import AuditLog

    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.device_id == device.id, AuditLog.action == "TURN_ON")
        .order_by(AuditLog.timestamp.desc())
        .limit(1)
    )
    last_on = result.scalar_one_or_none()
    if last_on:
        hours_on = (datetime.utcnow() - last_on.timestamp).total_seconds() / 3600
        if hours_on > 8:
            await create_alert(
                db,
                device.id,
                "LONG_RUNNING",
                f"{device.name} has been ON for over {int(hours_on)} hours.",
            )


async def check_device_offline(db: AsyncSession, device: Device):
    """Alert if device has not sent data in the last 60 seconds."""
    snapshot = compute_presence_snapshot(device)
    if device.is_online and not snapshot["is_online"]:
        seconds_silent = seconds_since_last_seen(snapshot["last_data_at"] or snapshot["last_seen"]) or 0
        device.is_online = snapshot["is_online"]
        device.connection_state = snapshot["connection_state"]
        device.data_state = snapshot["data_state"]
        await db.commit()
        await create_alert(
            db,
            device.id,
            "OFFLINE",
            f"{device.name} has gone offline (no data for {seconds_silent}s).",
        )
