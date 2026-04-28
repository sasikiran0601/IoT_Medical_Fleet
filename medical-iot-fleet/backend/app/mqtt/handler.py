import json
import asyncio
import time
from datetime import datetime
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.rate_limit import rate_limiter
from app.db.database import AsyncSessionLocal
from app.models.device import Device
from app.models.room import Room
from app.models.sensor_data import SensorData
from app.services.sensor_service import range_check, zscore_check, compute_confidence, is_anomaly
from app.services.alert_service import create_alert
from app.services.presence_service import compute_presence_snapshot
from app.services.telemetry_meta import build_telemetry_meta
from app.services.webhook_service import forward_to_webhook
from app.websockets.manager import manager
from app.mqtt.topics import extract_device_id, extract_topic_context

_last_anomaly_alert_at = {}
_processing_semaphore = asyncio.Semaphore(max(1, settings.MQTT_PROCESS_MAX_CONCURRENCY))
_topic_conflict_cache = {}


def _normalize_topic_token(value: str | None) -> str:
    if not value:
        return ""
    return "".join(ch.lower() for ch in value if ch.isalnum())


def _location_mismatch(device: Device, topic_context: dict) -> str | None:
    room = getattr(device, "room", None)
    floor = getattr(room, "floor", None) if room else None
    expected_floor = _normalize_topic_token(getattr(floor, "name", ""))
    expected_room = _normalize_topic_token(getattr(room, "name", ""))
    topic_floor = _normalize_topic_token(topic_context.get("floor"))
    topic_room = _normalize_topic_token(topic_context.get("room"))

    if expected_floor and topic_floor and expected_floor != topic_floor:
        return f"floor mismatch: device expects '{getattr(floor, 'name', '')}', topic has '{topic_context.get('floor')}'"
    if expected_room and topic_room and expected_room != topic_room:
        return f"room mismatch: device expects '{getattr(room, 'name', '')}', topic has '{topic_context.get('room')}'"
    return None


async def handle_sensor_message(topic: str, payload_bytes: bytes):
    """Called by MQTT client when a device publishes sensor data."""
    async with _processing_semaphore:
        try:
            device_id = extract_device_id(topic)
            if not device_id:
                return
            topic_context = extract_topic_context(topic)

            try:
                readings = json.loads(payload_bytes.decode())
            except Exception:
                print(f"[MQTT] Invalid JSON from {device_id}")
                return

            is_ecg_payload = isinstance(readings, dict) and "ecg_raw" in readings
            mqtt_limit = settings.RATE_LIMIT_MQTT_ECG_REQUESTS if is_ecg_payload else settings.RATE_LIMIT_MQTT_REQUESTS
            allowed, retry_after = rate_limiter.allow(
                "mqtt_ingest_ecg" if is_ecg_payload else "mqtt_ingest",
                device_id,
                mqtt_limit,
                settings.RATE_LIMIT_MQTT_WINDOW_SECONDS,
            )
            if not allowed:
                print(f"[MQTT] Rate limited telemetry from {device_id}; retry after {retry_after}s")
                return

            async with AsyncSessionLocal() as db:
                # Find device by device_id field
                result = await db.execute(
                    select(Device)
                    .options(selectinload(Device.room).selectinload(Room.floor))
                    .where(Device.device_id == device_id)
                )
                device = result.scalar_one_or_none()
                if not device:
                    print(f"[MQTT] Unknown device: {device_id}")
                    return

                mismatch = _location_mismatch(device, topic_context)
                if mismatch:
                    cache_key = (device_id, topic_context.get("floor"), topic_context.get("room"), topic_context.get("bed"))
                    if _topic_conflict_cache.get(cache_key) != mismatch:
                        _topic_conflict_cache[cache_key] = mismatch
                        print(f"[MQTT] Topic identity conflict for {device_id}: {mismatch}")
                    if settings.MQTT_REJECT_TOPIC_IDENTITY_MISMATCH:
                        return

                if not device.is_on:
                    # Control-state OFF: ignore telemetry until device is turned ON again.
                    print(f"[MQTT] Ignored telemetry (device OFF): {device_id}")
                    return

                # Fetch recent history for statistical check
                history_result = await db.execute(
                    select(SensorData.readings)
                    .where(SensorData.device_id == device.id)
                    .order_by(SensorData.timestamp.desc())
                    .limit(20)
                )
                history = [row[0] for row in history_result.fetchall()]

                # Validate readings
                range_result  = range_check(device.device_type, readings)
                zscore_result = zscore_check(readings, history)
                confidence    = compute_confidence(range_result, zscore_result)
                anomaly       = is_anomaly(confidence)

                # Save to DB
                record = SensorData(
                    device_id=device.id,
                    readings=json.dumps(readings),
                    confidence_score=confidence,
                    is_anomaly=int(anomaly),
                )
                db.add(record)

                now = datetime.utcnow()
                device.presence_source = "mqtt"
                device.last_data_at = now
                device.last_seen = now
                snapshot = compute_presence_snapshot(device, now)
                device.connection_state = snapshot["connection_state"]
                device.data_state = snapshot["data_state"]
                device.is_online = snapshot["is_online"]
                await db.commit()

                # Create alert if anomaly
                if anomaly:
                    now_s = time.monotonic()
                    cooldown = max(0, settings.MQTT_ANOMALY_ALERT_COOLDOWN_SECONDS)
                    last_alert_at = _last_anomaly_alert_at.get(device_id, 0)
                    if cooldown == 0 or (now_s - last_alert_at) >= cooldown:
                        await create_alert(
                            db, device.id, "LOW_CONFIDENCE",
                            f"Low confidence reading ({confidence}%) from {device.name}",
                        )
                        _last_anomaly_alert_at[device_id] = now_s

                # WebSocket broadcast
                ws_payload = {
                    "readings": readings,
                    "telemetry_meta": build_telemetry_meta(device.device_type, [readings]),
                    "confidence_score": confidence,
                    "is_anomaly": anomaly,
                    "presence_source": device.presence_source,
                    "connection_state": device.connection_state,
                    "data_state": device.data_state,
                    "is_online": device.is_online,
                    "is_on": device.is_on,
                    "last_status_at": device.last_status_at.isoformat() if device.last_status_at else None,
                    "last_data_at": device.last_data_at.isoformat() if device.last_data_at else None,
                    "timestamp": now.isoformat(),
                }
                await manager.broadcast_sensor(device_id, ws_payload)

                # Forward to webhook if configured
                if device.webhook_url:
                    await forward_to_webhook(device.webhook_url, device_id, readings)

                print(f"[MQTT] Processed telemetry from {device_id} (confidence={confidence}, anomaly={anomaly})")
        except Exception as exc:
            print(f"[MQTT] Unhandled processing error for topic={topic}: {exc}")


async def handle_status_message(topic: str, payload_bytes: bytes):
    """Handle explicit MQTT device presence updates on .../status topics."""
    try:
        device_id = extract_device_id(topic)
        if not device_id:
            return

        raw = payload_bytes.decode(errors="ignore").strip()
        status_text = raw.lower()
        if status_text not in {"online", "offline"}:
            try:
                parsed = json.loads(raw)
                status_text = str(parsed.get("status", "")).strip().lower()
            except Exception:
                status_text = ""
        if status_text not in {"online", "offline"}:
            return

        online = status_text == "online"
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Device).where(Device.device_id == device_id))
            device = result.scalar_one_or_none()
            if not device:
                return
            before_is_online = bool(device.is_online)
            before_connection_state = device.connection_state or "unknown"
            now = datetime.utcnow()
            device.presence_source = "mqtt"
            if online:
                device.last_status_at = now
            elif device.last_status_at is None:
                device.last_status_at = now
            device.connection_state = "connected" if online else "disconnected"
            snapshot = compute_presence_snapshot(device, now)
            device.connection_state = snapshot["connection_state"]
            device.data_state = snapshot["data_state"]
            device.is_online = snapshot["is_online"]
            device.last_seen = snapshot["last_seen"]
            await db.commit()

            changed = before_is_online != device.is_online or before_connection_state != device.connection_state
            if changed:
                await manager.broadcast_dashboard(
                    {
                        "type": "device_update",
                        "device_id": device.device_id,
                        "presence_source": device.presence_source,
                        "connection_state": device.connection_state,
                        "data_state": device.data_state,
                        "is_online": device.is_online,
                        "is_on": device.is_on,
                        "last_status_at": device.last_status_at.isoformat() if device.last_status_at else None,
                        "last_data_at": device.last_data_at.isoformat() if device.last_data_at else None,
                        "timestamp": now.isoformat(),
                    }
                )
                if not online:
                    await create_alert(
                        db,
                        device.id,
                        "OFFLINE",
                        f"{device.name} disconnected from MQTT broker.",
                    )
    except Exception as exc:
        print(f"[MQTT] Unhandled status processing error for topic={topic}: {exc}")
