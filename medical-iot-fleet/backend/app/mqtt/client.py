import asyncio
import paho.mqtt.client as mqtt
from app.core.config import settings
from app.mqtt.topics import WILDCARD_DATA
from app.mqtt.handler import handle_sensor_message


def create_mqtt_client() -> mqtt.Client:
    loop = asyncio.get_event_loop()

    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            print(f"[MQTT] Connected to broker at {settings.MQTT_HOST}:{settings.MQTT_PORT}")
            client.subscribe(WILDCARD_DATA)
            print(f"[MQTT] Subscribed to {WILDCARD_DATA}")
        else:
            print(f"[MQTT] Connection failed with code {rc}")

    def on_message(client, userdata, msg):
        # Schedule async handler on the event loop
        asyncio.run_coroutine_threadsafe(
            handle_sensor_message(msg.topic, msg.payload), loop
        )

    def on_disconnect(client, userdata, rc):
        print(f"[MQTT] Disconnected (rc={rc}). Reconnecting...")

    client = mqtt.Client()
    client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)
    client.on_connect    = on_connect
    client.on_message    = on_message
    client.on_disconnect = on_disconnect

    try:
        client.connect(settings.MQTT_HOST, settings.MQTT_PORT, keepalive=60)
        client.loop_start()  # runs in background thread
    except Exception as e:
        print(f"[MQTT] Could not connect: {e}. Continuing without MQTT.")

    return client