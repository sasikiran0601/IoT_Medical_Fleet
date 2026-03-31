"""
ESP32 Device Simulator
─────────────────────
Simulates multiple medical IoT devices sending real-time sensor data
to the FastAPI backend via HTTP POST.

Usage:
  1. Register devices via the dashboard or API to get device_id + api_key
  2. Fill in the DEVICES list below
  3. python device_sim.py
"""

import requests
import time
import random
import threading
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

# ── Configure your registered devices here ────────────────────────────────
# Get device_id and api_key from /api/keys or the ApiManager page
DEVICES = [
    {
        "device_id": "DEV-AAAAAAAA",
        "api_key":   "mk_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "type":      "ECG",
        "interval":  2,          # seconds between readings
    },
    {
        "device_id": "DEV-BBBBBBBB",
        "api_key":   "mk_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        "type":      "Pulse Oximeter",
        "interval":  3,
    },
    {
        "device_id": "DEV-CCCCCCCC",
        "api_key":   "mk_cccccccccccccccccccccccccccccccccc",
        "type":      "Ventilator",
        "interval":  4,
    },
    {
        "device_id": "DEV-DDDDDDDD",
        "api_key":   "mk_dddddddddddddddddddddddddddddddddd",
        "type":      "Temperature Sensor",
        "interval":  5,
    },
    {
        "device_id": "DEV-EEEEEEEE",
        "api_key":   "mk_eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        "type":      "Blood Pressure",
        "interval":  6,
    },
]


# ── Data generators per device type ───────────────────────────────────────
def generate_readings(device_type: str, inject_anomaly: bool = False) -> dict:
    if device_type == "ECG":
        hr = random.randint(60, 100)
        temp = round(random.uniform(36.1, 37.5), 1)
        if inject_anomaly:
            hr = random.choice([random.randint(200, 280), random.randint(10, 25)])
        return {"heart_rate": hr, "temperature": temp}

    elif device_type == "Pulse Oximeter":
        spo2 = random.randint(95, 100)
        pulse = random.randint(65, 95)
        if inject_anomaly:
            spo2 = random.randint(50, 70)
        return {"spo2": spo2, "pulse": pulse}

    elif device_type == "Ventilator":
        rr = random.randint(12, 20)
        tv = random.randint(400, 600)
        if inject_anomaly:
            rr = random.randint(70, 90)
        return {"respiratory_rate": rr, "tidal_volume": tv}

    elif device_type == "Temperature Sensor":
        temp = round(random.uniform(36.1, 37.5), 1)
        if inject_anomaly:
            temp = round(random.uniform(40.0, 41.5), 1)
        return {"temperature": temp}

    elif device_type == "Blood Pressure":
        sys = random.randint(110, 130)
        dia = random.randint(70, 90)
        if inject_anomaly:
            sys = random.randint(200, 240)
        return {"systolic": sys, "diastolic": dia}

    return {"value": round(random.uniform(0, 100), 2)}


# ── Simulator thread per device ───────────────────────────────────────────
def simulate_device(device: dict, stop_event: threading.Event):
    device_id = device["device_id"]
    api_key   = device["api_key"]
    dev_type  = device["type"]
    interval  = device["interval"]
    url       = f"{BASE_URL}/api/v1/data/{device_id}"
    headers   = {"X-API-Key": api_key, "Content-Type": "application/json"}

    reading_count = 0
    print(f"[{device_id}] ▶ Starting simulator ({dev_type})")

    while not stop_event.is_set():
        reading_count += 1

        # Inject anomaly every ~20 readings for demo purposes
        inject_anomaly = (reading_count % 20 == 0)
        readings = generate_readings(dev_type, inject_anomaly=inject_anomaly)

        try:
            resp = requests.post(url, json=readings, headers=headers, timeout=5)
            status  = resp.status_code
            result  = resp.json()
            conf    = result.get("confidence_score", "?")
            anomaly = "⚠ ANOMALY" if result.get("is_anomaly") else ""
            ts      = datetime.now().strftime("%H:%M:%S")
            print(
                f"[{ts}] [{device_id}] {json.dumps(readings)} "
                f"→ HTTP {status} | confidence={conf}% {anomaly}"
            )
        except requests.exceptions.ConnectionError:
            print(f"[{device_id}] ✗ Cannot reach server at {BASE_URL}")
        except Exception as e:
            print(f"[{device_id}] ✗ Error: {e}")

        stop_event.wait(interval)


# ── Main ──────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  Medical IoT Device Simulator")
    print(f"  Backend: {BASE_URL}")
    print(f"  Simulating {len(DEVICES)} devices")
    print("  Press Ctrl+C to stop")
    print("=" * 60)

    stop_event = threading.Event()
    threads    = []

    for device in DEVICES:
        t = threading.Thread(
            target=simulate_device,
            args=(device, stop_event),
            daemon=True,
        )
        threads.append(t)
        t.start()
        time.sleep(0.3)          # stagger starts slightly

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[Simulator] Stopping all devices...")
        stop_event.set()
        for t in threads:
            t.join(timeout=2)
        print("[Simulator] All devices stopped.")


if __name__ == "__main__":
    main()