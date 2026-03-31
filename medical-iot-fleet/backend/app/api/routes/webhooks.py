from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import httpx

from app.db.database import get_db
from app.models.device import Device
from app.models.user import User
from app.schemas.device import WebhookUpdate
from app.core.dependencies import require_admin

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])


@router.put("/{device_id}")
async def configure_webhook(
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
    return {"message": "Webhook configured", "url": body.webhook_url}


@router.delete("/{device_id}")
async def remove_webhook(
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
    device.webhook_url = None
    await db.commit()
    return {"message": "Webhook removed"}


@router.post("/{device_id}/test")
async def test_webhook(
    device_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Send a test payload to the configured webhook URL."""
    result = await db.execute(
        select(Device).where(Device.device_id == device_id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    if not device.webhook_url:
        raise HTTPException(status_code=400, detail="No webhook configured for this device")

    test_payload = {
        "device_id": device_id,
        "test": True,
        "message": "Webhook test from Medical IoT Fleet",
        "readings": {"temperature": 36.6, "heart_rate": 72},
    }

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.post(device.webhook_url, json=test_payload)
        return {
            "status": "sent",
            "response_code": resp.status_code,
            "webhook_url": device.webhook_url,
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Webhook unreachable: {str(e)}")