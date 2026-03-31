from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.database import get_db
from app.models.audit_log import AuditLog
from app.models.device import Device
from app.models.user import User
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/logs", tags=["Audit Logs"])


@router.get("/audit")
async def get_audit_logs(
    device_id: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = select(AuditLog).order_by(AuditLog.timestamp.desc())

    if device_id:
        dev_result = await db.execute(
            select(Device).where(Device.device_id == device_id)
        )
        dev = dev_result.scalar_one_or_none()
        if dev:
            query = query.where(AuditLog.device_id == dev.id)

    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if action:
        query = query.where(AuditLog.action == action)
    if from_date:
        query = query.where(AuditLog.timestamp >= datetime.combine(from_date, datetime.min.time()))
    if to_date:
        query = query.where(AuditLog.timestamp <= datetime.combine(to_date, datetime.max.time()))

    query = query.limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()

    # Enrich with user and device names
    enriched = []
    for log in logs:
        user_res = await db.execute(select(User).where(User.id == log.user_id))
        user_obj = user_res.scalar_one_or_none()

        dev_res = await db.execute(select(Device).where(Device.id == log.device_id))
        dev_obj = dev_res.scalar_one_or_none()

        enriched.append({
            "id": log.id,
            "action": log.action,
            "purpose": log.purpose,
            "duration_minutes": log.duration_minutes,
            "timestamp": log.timestamp.isoformat(),
            "user_name": user_obj.name if user_obj else "System",
            "user_role": user_obj.role if user_obj else "-",
            "device_name": dev_obj.name if dev_obj else "Unknown",
            "device_id": dev_obj.device_id if dev_obj else "-",
        })

    return enriched