import asyncio
import threading
import time
import paho.mqtt.client as mqtt
from app.core.config import settings
from app.mqtt.topics import WILDCARD_DATA, extract_device_id
from app.mqtt.handler import handle_sensor_message


def create_mqtt_client() -> mqtt.Client:
    loop = asyncio.get_event_loop()
    dispatch_lock = threading.Lock()
    last_dispatch_ms_by_device = {}
    min_ingest_interval_ms = max(0, settings.MQTT_MIN_INGEST_INTERVAL_MS)
    ecg_min_ingest_interval_ms = max(0, settings.MQTT_ECG_MIN_INGEST_INTERVAL_MS)

    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            print(f"[MQTT] Connected to broker at {settings.MQTT_HOST}:{settings.MQTT_PORT}")
            client.subscribe(WILDCARD_DATA)
            print(f"[MQTT] Subscribed to {WILDCARD_DATA}")
        else:
            print(f"[MQTT] Connection failed with code {rc}")

    def on_message(client, userdata, msg):
        device_id = extract_device_id(msg.topic) or "__unknown__"
        now_ms = int(time.monotonic() * 1000)
        is_ecg_payload = b"\"ecg_raw\"" in msg.payload

        # Prevent message storm from overwhelming DB/session pool.
        target_interval = ecg_min_ingest_interval_ms if is_ecg_payload else min_ingest_interval_ms
        if target_interval > 0:
            with dispatch_lock:
                last_ms = last_dispatch_ms_by_device.get(device_id, 0)
                if now_ms - last_ms < target_interval:
                    return
                last_dispatch_ms_by_device[device_id] = now_ms

        # Schedule async handler on the event loop
        future = asyncio.run_coroutine_threadsafe(
            handle_sensor_message(msg.topic, msg.payload), loop
        )
        def _done_callback(f):
            exc = f.exception()
            if exc:
                print(f"[MQTT] Handler error for topic={msg.topic}: {exc}")
        future.add_done_callback(_done_callback)

    def on_disconnect(client, userdata, rc):
        print(f"[MQTT] Disconnected (rc={rc}). Reconnecting...")

    client = mqtt.Client()
    client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)
    client.reconnect_delay_set(min_delay=1, max_delay=5)
    client.on_connect    = on_connect
    client.on_message    = on_message
    client.on_disconnect = on_disconnect

    try:
        client.connect(settings.MQTT_HOST, settings.MQTT_PORT, keepalive=60)
        client.loop_start()  # runs in background thread
    except Exception as e:
        print(f"[MQTT] Could not connect: {e}. Continuing without MQTT.")

    return client
