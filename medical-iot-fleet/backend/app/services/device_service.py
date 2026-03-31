from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.device import Device
from app.models.audit_log import AuditLog


async def log_action(
    db: AsyncSession,
    device_id: str,
    user_id: str,
    action: str,
    purpose: str = None,
    duration_minutes: float = None,
):
    log = AuditLog(
        device_id=device_id,
        user_id=user_id,
        action=action,
        purpose=purpose,
        duration_minutes=duration_minutes,
    )
    db.add(log)
    await db.commit()


async def calculate_session_duration(db: AsyncSession, device_id: str) -> float:
    """Find last TURN_ON log and return minutes elapsed since then."""
    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.device_id == device_id, AuditLog.action == "TURN_ON")
        .order_by(AuditLog.timestamp.desc())
        .limit(1)
    )
    last_on = result.scalar_one_or_none()
    if last_on:
        delta = datetime.utcnow() - last_on.timestamp
        return round(delta.total_seconds() / 60, 2)
    return 0.0