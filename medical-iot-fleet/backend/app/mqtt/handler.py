import json
import asyncio
import time
from datetime import datetime
from sqlalchemy.future import select

from app.core.config import settings
from app.db.database import AsyncSessionLocal
from app.models.device import Device
from app.models.sensor_data import SensorData
from app.services.sensor_service import range_check, zscore_check, compute_confidence, is_anomaly
from app.services.alert_service import create_alert
from app.services.webhook_service import forward_to_webhook
from app.websockets.manager import manager
from app.mqtt.topics import extract_device_id

_last_anomaly_alert_at = {}
_processing_semaphore = asyncio.Semaphore(max(1, settings.MQTT_PROCESS_MAX_CONCURRENCY))


async def handle_sensor_message(topic: str, payload_bytes: bytes):
    """Called by MQTT client when a device publishes sensor data."""
    async with _processing_semaphore:
        try:
            device_id = extract_device_id(topic)
            if not device_id:
                return

            try:
                readings = json.loads(payload_bytes.decode())
            except Exception:
                print(f"[MQTT] Invalid JSON from {device_id}")
                return

            async with AsyncSessionLocal() as db:
                # Find device by device_id field
                result = await db.execute(
                    select(Device).where(Device.device_id == device_id)
                )
                device = result.scalar_one_or_none()
                if not device:
                    print(f"[MQTT] Unknown device: {device_id}")
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

                # Update device last_seen + online
                device.last_seen = datetime.utcnow()
                device.is_online = True
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
                    "confidence_score": confidence,
                    "is_anomaly": anomaly,
                    "is_online": True,
                    "is_on": device.is_on,
                    "timestamp": datetime.utcnow().isoformat(),
                }
                await manager.broadcast_sensor(device_id, ws_payload)

                # Forward to webhook if configured
                if device.webhook_url:
                    await forward_to_webhook(device.webhook_url, device_id, readings)

                print(f"[MQTT] Processed telemetry from {device_id} (confidence={confidence}, anomaly={anomaly})")
        except Exception as exc:
            print(f"[MQTT] Unhandled processing error for topic={topic}: {exc}")
