from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.database import get_db
from app.models.device import Device
from app.models.user import User
from app.schemas.device import DeviceCreate, DeviceOut, DeviceUpdate, DeviceControl, WebhookUpdate
from app.core.dependencies import get_current_user, require_admin, require_nurse_or_above
from app.services.device_service import log_action, calculate_session_duration
from app.services.alert_service import check_long_running
from app.services.presence_service import reconcile_online_flags
from app.websockets.manager import manager

router = APIRouter(prefix="/api/devices", tags=["Devices"])


@router.post("", response_model=DeviceOut, include_in_schema=False)
@router.post("/", response_model=DeviceOut)
async def create_device(
    data: DeviceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    device = Device(**data.model_dump())
    db.add(device)
    await db.commit()
    await db.refresh(device)

    await log_action(
        db,
        device_id=device.id,
        user_id=current_user.id,
        action="REGISTERED",
        purpose="Device registered in system",
    )
    return device


@router.get("", response_model=List[DeviceOut], include_in_schema=False)
@router.get("/", response_model=List[DeviceOut])
async def list_devices(
    room_id: Optional[str] = None,
    device_type: Optional[str] = None,
    is_online: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = select(Device)
    if room_id:
        query = query.where(Device.room_id == room_id)
    if device_type:
        query = query.where(Device.device_type == device_type)
    result = await db.execute(query.order_by(Device.created_at.desc()))
    devices = result.scalars().all()
    await reconcile_online_flags(db, devices)
    if is_online is not None:
        devices = [d for d in devices if bool(d.is_online) == bool(is_online)]
    return devices


@router.get("/stats")
async def device_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Summary counts for dashboard header cards."""
    result = await db.execute(select(Device))
    devices = result.scalars().all()
    await reconcile_online_flags(db, devices)
    total   = len(devices)
    online  = sum(1 for d in devices if d.is_online)
    on      = sum(1 for d in devices if d.is_on)
    offline = total - online
    return {
        "total": total,
        "online": online,
        "offline": offline,
        "active": on,
    }


@router.get("/{device_id}", response_model=DeviceOut)
async def get_device(
    device_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Device).where(Device.device_id == device_id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    await reconcile_online_flags(db, [device])
    return device


@router.put("/{device_id}", response_model=DeviceOut)
async def update_device(
    device_id: str,
    data: DeviceUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(
        select(Device).where(Device.device_id == device_id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(device, field, value)

    await db.commit()
    await db.refresh(device)
    return device


@router.delete("/{device_id}")
async def delete_device(
    device_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(
        select(Device).where(Device.device_id == device_id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    await db.delete(device)
    await db.commit()
    return {"message": "Device deleted"}


@router.post("/{device_id}/control")
async def control_device(
    device_id: str,
    body: DeviceControl,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_nurse_or_above),
):
    result = await db.execute(
        select(Device).where(Device.device_id == device_id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    if body.action not in ("turn_on", "turn_off"):
        raise HTTPException(status_code=400, detail="action must be 'turn_on' or 'turn_off'")

    duration = None

    if body.action == "turn_on":
        if device.is_on:
            raise HTTPException(status_code=400, detail="Device is already ON")
        device.is_on = True
        action_label = "TURN_ON"
        await check_long_running(db, device)

    else:  # turn_off
        if not device.is_on:
            raise HTTPException(status_code=400, detail="Device is already OFF")
        duration = await calculate_session_duration(db, device.id)
        device.is_on = False
        action_label = "TURN_OFF"

    await db.commit()

    await log_action(
        db,
        device_id=device.id,
        user_id=current_user.id,
        action=action_label,
        purpose=body.purpose,
        duration_minutes=duration,
    )

    payload = {
        "is_on": device.is_on,
        "changed_by": current_user.name,
        "purpose": body.purpose,
        "timestamp": datetime.utcnow().isoformat(),
    }
    await manager.broadcast_state_change(device_id, payload)

    return {
        "message": f"Device {body.action} successful",
        "is_on": device.is_on,
        "duration_minutes": duration,
    }


@router.put("/{device_id}/webhook")
async def set_webhook(
    device_id: str,
    body: WebhookUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(
        select(Device).where(Device.device_id == device_id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    device.webhook_url = body.webhook_url
    await db.commit()
    return {"message": "Webhook configured", "webhook_url": body.webhook_url}


@router.post("/{device_id}/ota")
async def ota_update(
    device_id: str,
    firmware_version: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    from app.services.ota_service import push_ota_update
    result = await db.execute(
        select(Device).where(Device.device_id == device_id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return await push_ota_update(db, device, firmware_version, current_user.id)
