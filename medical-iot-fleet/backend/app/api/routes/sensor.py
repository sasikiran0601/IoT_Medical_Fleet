import json
import csv
from io import StringIO
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse, JSONResponse
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
from app.services.presence_service import compute_presence_snapshot
from app.services.telemetry_meta import build_telemetry_meta
from app.services.alert_service import create_alert
from app.services.webhook_service import forward_to_webhook
from app.websockets.manager import manager

router = APIRouter(tags=["Sensor Data"])


def _parse_iso_datetime(value: str | None, field_name: str) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}") from exc


def _parse_time_of_day(value: str | None, field_name: str):
    if not value:
        return None
    try:
        return datetime.strptime(value, "%H:%M").time()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}; expected HH:MM") from exc


def _matches_time_slot(timestamp: datetime, slot_start, slot_end) -> bool:
    if slot_start is None and slot_end is None:
        return True
    current = timestamp.time()
    if slot_start and slot_end:
        if slot_start <= slot_end:
            return slot_start <= current <= slot_end
        return current >= slot_start or current <= slot_end
    if slot_start:
        return current >= slot_start
    return current <= slot_end


def _serialize_export_record(record: SensorData) -> dict:
    try:
        readings = json.loads(record.readings or "{}")
    except Exception:
        readings = {}
    return {
        "id": record.id,
        "device_id": record.device_id,
        "timestamp": record.timestamp.isoformat() if record.timestamp else None,
        "confidence_score": record.confidence_score,
        "is_anomaly": record.is_anomaly,
        "readings": readings,
    }


async def _resolve_device_for_history(device_id: str, db: AsyncSession) -> Device:
    result = await db.execute(select(Device).where(Device.device_id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device


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
    now = datetime.utcnow()
    device.presence_source = "http"
    device.last_data_at = now
    device.last_seen = now
    snapshot = compute_presence_snapshot(device, now)
    device.connection_state = snapshot["connection_state"]
    device.data_state = snapshot["data_state"]
    device.is_online = snapshot["is_online"]
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
        "presence_source": device.presence_source,
        "connection_state": device.connection_state,
        "data_state": device.data_state,
        "is_online": device.is_online,
        "last_status_at": device.last_status_at.isoformat() if device.last_status_at else None,
        "last_data_at": device.last_data_at.isoformat() if device.last_data_at else None,
        "timestamp": now.isoformat(),
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
    device = await _resolve_device_for_history(device_id, db)

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


@router.get("/api/v1/data/{device_id}/export")
async def export_sensor_data(
    device_id: str,
    format: str = Query("csv", pattern="^(csv|json)$"),
    limit: int = Query(500, ge=1, le=5000),
    from_datetime: str | None = Query(None),
    to_datetime: str | None = Query(None),
    time_slot_start: str | None = Query(None),
    time_slot_end: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    device = await _resolve_device_for_history(device_id, db)
    from_dt = _parse_iso_datetime(from_datetime, "from_datetime")
    to_dt = _parse_iso_datetime(to_datetime, "to_datetime")
    slot_start = _parse_time_of_day(time_slot_start, "time_slot_start")
    slot_end = _parse_time_of_day(time_slot_end, "time_slot_end")

    query = (
        select(SensorData)
        .where(SensorData.device_id == device.id)
        .order_by(SensorData.timestamp.desc())
        .limit(limit)
    )
    if from_dt is not None:
        query = query.where(SensorData.timestamp >= from_dt)
    if to_dt is not None:
        query = query.where(SensorData.timestamp <= to_dt)

    data_result = await db.execute(query)
    records = data_result.scalars().all()
    filtered = [record for record in records if record.timestamp and _matches_time_slot(record.timestamp, slot_start, slot_end)]
    serialized = [_serialize_export_record(record) for record in filtered]

    timestamp_suffix = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename_base = f"{device.device_id}_telemetry_{timestamp_suffix}"

    if format == "json":
        return JSONResponse(
            content={
                "device_id": device.device_id,
                "device_name": device.name,
                "exported_at": datetime.utcnow().isoformat(),
                "filters": {
                    "limit": limit,
                    "from_datetime": from_datetime,
                    "to_datetime": to_datetime,
                    "time_slot_start": time_slot_start,
                    "time_slot_end": time_slot_end,
                },
                "records": serialized,
            },
            headers={
                "Content-Disposition": f'attachment; filename="{filename_base}.json"'
            },
        )

    fieldnames = ["record_id", "device_row_id", "timestamp", "confidence_score", "is_anomaly", "field", "value"]
    buffer = StringIO()
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()
    for record in serialized:
        readings = record["readings"] or {}
        if not readings:
            writer.writerow(
                {
                    "record_id": record["id"],
                    "device_row_id": record["device_id"],
                    "timestamp": record["timestamp"],
                    "confidence_score": record["confidence_score"],
                    "is_anomaly": record["is_anomaly"],
                    "field": "",
                    "value": "",
                }
            )
            continue
        for key, value in readings.items():
            writer.writerow(
                {
                    "record_id": record["id"],
                    "device_row_id": record["device_id"],
                    "timestamp": record["timestamp"],
                    "confidence_score": record["confidence_score"],
                    "is_anomaly": record["is_anomaly"],
                    "field": key,
                    "value": value,
                }
            )

    return PlainTextResponse(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename_base}.csv"'
        },
    )
