import json
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.database import get_db
from app.models.device import Device
from app.models.sensor_data import SensorData
from app.models.user import User
from app.schemas.sensor_data import SensorDataOut
from app.schemas.telemetry import SensorHistoryResponse
from app.core.dependencies import get_current_user, get_device_by_api_key
from app.services.sensor_service import (
    range_check, zscore_check, compute_confidence, is_anomaly
)
from app.services.telemetry_meta import build_telemetry_meta
from app.services.alert_service import create_alert
from app.services.webhook_service import forward_to_webhook
from app.websockets.manager import manager

router = APIRouter(tags=["Sensor Data"])


# ── Device pushes data (authenticated via API key) ─────────────────────────
@router.post("/api/v1/data/{device_id}")
async def ingest_sensor_data(
    device_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    device: Device = Depends(get_device_by_api_key),
):
    if device.device_id != device_id:
        raise HTTPException(status_code=403, detail="Device ID mismatch with API key")
    if not device.is_on:
        return {
            "status": "ignored",
            "reason": "device_off",
            "timestamp": datetime.utcnow().isoformat(),
        }

    readings = payload

    # Fetch last 50 historical readings for statistical check
    history_result = await db.execute(
        select(SensorData.readings)
        .where(SensorData.device_id == device.id)
        .order_by(SensorData.timestamp.desc())
        .limit(50)
    )
    history = [row[0] for row in history_result.fetchall()]

    # Run validation pipeline
    range_result  = range_check(device.device_type, readings)
    zscore_result = zscore_check(readings, history)
    confidence    = compute_confidence(range_result, zscore_result)
    anomaly_flag  = is_anomaly(confidence)

    # Persist
    record = SensorData(
        device_id=device.id,
        readings=json.dumps(readings),
        confidence_score=confidence,
        is_anomaly=int(anomaly_flag),
    )
    db.add(record)

    # Update device status
    device.last_seen = datetime.utcnow()
    device.is_online = True
    await db.commit()

    # Create alert if anomaly detected
    if anomaly_flag:
        await create_alert(
            db,
            device_id=device.id,
            alert_type="LOW_CONFIDENCE",
            message=f"Anomalous reading on {device.name} (confidence {confidence}%)",
        )

    # Broadcast to WebSocket listeners
    ws_payload = {
        "readings": readings,
        "telemetry_meta": build_telemetry_meta(device.device_type, [readings]),
        "confidence_score": confidence,
        "is_anomaly": anomaly_flag,
        "timestamp": datetime.utcnow().isoformat(),
    }
    await manager.broadcast_sensor(device_id, ws_payload)

    # Forward to external webhook if configured
    if device.webhook_url:
        await forward_to_webhook(device.webhook_url, device_id, readings)

    return {
        "status": "received",
        "confidence_score": confidence,
        "is_anomaly": anomaly_flag,
        "timestamp": datetime.utcnow().isoformat(),
    }


# ── Retrieve historical data (authenticated via JWT) ───────────────────────
@router.get("/api/v1/data/{device_id}", response_model=SensorHistoryResponse)
async def get_sensor_data(
    device_id: str,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Device).where(Device.device_id == device_id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    data_result = await db.execute(
        select(SensorData)
        .where(SensorData.device_id == device.id)
        .order_by(SensorData.timestamp.desc())
        .limit(limit)
    )
    records = data_result.scalars().all()
    payloads = []
    for record in records:
        try:
            payloads.append(json.loads(record.readings or "{}"))
        except Exception:
            payloads.append({})
    telemetry_meta = build_telemetry_meta(device.device_type, payloads)
    return {
        "records": records,
        "telemetry_meta": telemetry_meta,
    }
