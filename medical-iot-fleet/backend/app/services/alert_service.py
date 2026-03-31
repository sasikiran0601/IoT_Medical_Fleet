from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.alert import Alert
from app.models.device import Device


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
    if device.last_seen:
        seconds_silent = (datetime.utcnow() - device.last_seen).total_seconds()
        if seconds_silent > 60 and device.is_online:
            device.is_online = False
            await db.commit()
            await create_alert(
                db,
                device.id,
                "OFFLINE",
                f"{device.name} has gone offline (no data for {seconds_silent}s).",
            )