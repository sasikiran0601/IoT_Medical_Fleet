"""
ESP32 MQTT Device Simulator (single device)

Reads settings from sim_config.json and publishes vitals to:
  hospital/{floor}/{room_no}/{bed_no}/{device_id}/data
"""

import json
import random
import time
from datetime import datetime, timezone
from pathlib import Path

import paho.mqtt.client as mqtt

CONFIG_PATH = Path(__file__).with_name("sim_config.json")


def load_config() -> dict:
    with CONFIG_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def build_topic(topic_template: str, device: dict) -> str:
    return topic_template.format(
        floor=device["floor"],
        room_no=device["room_no"],
        bed_no=device["bed_no"],
        device_id=device["device_id"],
    )


def generate_payload(device_id: str) -> dict:
    heart_rate = random.randint(68, 96)
    spo2 = random.randint(95, 100)
    temperature = round(random.uniform(36.4, 37.3), 1)

    status = "NORMAL"
    if heart_rate > 110 or spo2 < 92 or temperature > 38.0:
        status = "WARNING"

    return {
        "device_id": device_id,
        "heart_rate": heart_rate,
        "spo2": spo2,
        "temperature": temperature,
        "status": status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def main():
    cfg = load_config()
    mqtt_cfg = cfg["mqtt"]
    device = cfg["device"]
    topic_template = cfg["topic_template"]
    interval = int(cfg.get("publish_interval_seconds", 1))

    topic = build_topic(topic_template, device)

    client = mqtt.Client()
    client.username_pw_set(mqtt_cfg["username"], mqtt_cfg["password"])

    print("=" * 64)
    print("Medical IoT MQTT Simulator")
    print(f"Broker: {mqtt_cfg['host']}:{mqtt_cfg['port']}")
    print(f"Topic : {topic}")
    print(f"Rate  : every {interval}s")
    print("Press Ctrl+C to stop")
    print("=" * 64)

    client.connect(mqtt_cfg["host"], int(mqtt_cfg["port"]), keepalive=60)
    client.loop_start()

    try:
        while True:
            payload = generate_payload(device["device_id"])
            body = json.dumps(payload)
            info = client.publish(topic, body, qos=0, retain=False)

            if info.rc == mqtt.MQTT_ERR_SUCCESS:
                ts = datetime.now().strftime("%H:%M:%S")
                print(f"[{ts}] Published -> {topic} | {body}")
            else:
                print(f"[MQTT] Publish failed with rc={info.rc}")

            time.sleep(interval)
    except KeyboardInterrupt:
        print("\n[Simulator] Stopping...")
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()
