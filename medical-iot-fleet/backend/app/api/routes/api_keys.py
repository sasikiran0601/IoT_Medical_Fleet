import json
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.rate_limit import enforce_request_rate_limit
from app.db.database import get_db
from app.models.device import Device
from app.models.user import User
from app.core.dependencies import require_admin

router = APIRouter(prefix="/api/keys", tags=["API Keys"])


def _api_base_url(request: Request) -> str:
    if settings.API_BASE_URL:
        return settings.API_BASE_URL.rstrip("/")

    forwarded_proto = (request.headers.get("x-forwarded-proto") or request.url.scheme or "http").split(",")[0].strip()
    forwarded_host = (request.headers.get("x-forwarded-host") or request.headers.get("host") or "").split(",")[0].strip()
    if forwarded_host:
        return f"{forwarded_proto}://{forwarded_host}".rstrip("/")

    return str(request.base_url).rstrip("/")


def _sample_payload(device_type: str) -> dict:
    samples = {
        "ECG": {
            "ecg_raw": 1984,
            "heart_rate": 78,
            "rr_interval_ms": 770,
            "status": "NORMAL",
        },
        "Pulse Oximeter": {
            "spo2": 98,
            "pulse": 76,
            "status": "NORMAL",
        },
        "Ventilator": {
            "respiratory_rate": 16,
            "tidal_volume": 500,
            "status": "NORMAL",
        },
        "Temperature Sensor": {
            "temperature": 36.8,
            "status": "NORMAL",
        },
        "Blood Pressure": {
            "systolic": 120,
            "diastolic": 80,
            "status": "NORMAL",
        },
    }
    return samples.get(device_type, {"status": "NORMAL", "value": 1})


@router.get("", include_in_schema=False)
@router.get("/")
async def list_api_keys(
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    enforce_request_rate_limit(
        response,
        request,
        "api_keys_list",
        settings.RATE_LIMIT_ADMIN_REQUESTS,
        settings.RATE_LIMIT_ADMIN_WINDOW_SECONDS,
    )
    """List all devices with their API keys (admin only)."""
    result = await db.execute(select(Device).order_by(Device.created_at.desc()))
    devices = result.scalars().all()
    return [
        {
            "device_id": d.device_id,
            "name": d.name,
            "device_type": d.device_type,
            "api_key": d.api_key,
            "webhook_url": d.webhook_url,
        }
        for d in devices
    ]


@router.post("/{device_id}/regenerate")
async def regenerate_key(
    device_id: str,
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    enforce_request_rate_limit(
        response,
        request,
        "api_keys_regenerate",
        settings.RATE_LIMIT_ADMIN_REQUESTS,
        settings.RATE_LIMIT_ADMIN_WINDOW_SECONDS,
        scope_key=device_id,
    )
    result = await db.execute(
        select(Device).where(Device.device_id == device_id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    device.api_key = f"mk_{uuid.uuid4().hex}"
    await db.commit()
    return {
        "device_id": device_id,
        "new_api_key": device.api_key,
        "message": "API key regenerated successfully",
    }


@router.get("/example/{device_id}")
async def get_example_code(
    device_id: str,
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    enforce_request_rate_limit(
        response,
        request,
        "api_keys_example",
        settings.RATE_LIMIT_ADMIN_REQUESTS,
        settings.RATE_LIMIT_ADMIN_WINDOW_SECONDS,
        scope_key=device_id,
    )
    """Return ready-to-use code examples for this device."""
    result = await db.execute(
        select(Device).where(Device.device_id == device_id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    api_base_url = _api_base_url(request)
    payload = _sample_payload(device.device_type)
    payload_json = json.dumps(payload)
    payload_pretty = json.dumps(payload, indent=2)

    return {
        "device_id": device_id,
        "api_key": device.api_key,
        "examples": {
            "python": f"""import requests

API_KEY = "{device.api_key}"
DEVICE_ID = "{device_id}"
URL = "{api_base_url}/api/v1/data/{{DEVICE_ID}}"

data = {payload_pretty}
resp = requests.post(URL, json=data, headers={{"X-API-Key": API_KEY}})
print(resp.json())
""",
            "arduino_esp32": f"""#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* apiKey = "{device.api_key}";
const char* serverUrl = "{api_base_url}/api/v1/data/{device_id}";

WiFiClientSecure client;

void setup() {{
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  client.setInsecure();
}}

void loop() {{
  if (WiFi.status() == WL_CONNECTED) {{
    HTTPClient http;
    http.begin(client, serverUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-Key", apiKey);

    const char* payload = R"json({payload_json})json";
    int code = http.POST(payload);
    Serial.println(code);
    Serial.println(http.getString());
    http.end();
  }}
  delay(5000);
}}
""",
            "curl": f"""curl -X POST {api_base_url}/api/v1/data/{device_id} \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: {device.api_key}" \\
  -d '{payload_json}'
""",
        },
    }
