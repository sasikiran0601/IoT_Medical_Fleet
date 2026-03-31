from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.database import get_db
from app.models.alert import Alert
from app.models.device import Device
from app.models.user import User
from app.schemas.alert import AlertOut
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


@router.get("/", response_model=List[AlertOut])
async def get_alerts(
    is_resolved: bool = Query(False),
    alert_type: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = (
        select(Alert)
        .where(Alert.is_resolved == is_resolved)
        .order_by(Alert.timestamp.desc())
        .limit(limit)
    )
    if alert_type:
        query = query.where(Alert.alert_type == alert_type)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/count")
async def unresolved_count(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Alert).where(Alert.is_resolved == False)
    )
    return {"unresolved": len(result.scalars().all())}


@router.put("/{alert_id}/resolve", response_model=AlertOut)
async def resolve_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_resolved = True
    alert.resolved_at = datetime.utcnow()
    await db.commit()
    await db.refresh(alert)
    return alert


@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    await db.delete(alert)
    await db.commit()
    return {"message": "Alert deleted"}