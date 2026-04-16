import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.database import get_db
from app.models.device import Device
from app.models.user import User
from app.core.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/api/keys", tags=["API Keys"])


@router.get("", include_in_schema=False)
@router.get("/")
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
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
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
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
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return ready-to-use code examples for this device."""
    result = await db.execute(
        select(Device).where(Device.device_id == device_id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    return {
        "device_id": device_id,
        "api_key": device.api_key,
        "examples": {
            "python": f"""import requests

API_KEY = "{device.api_key}"
DEVICE_ID = "{device_id}"
URL = "http://your-server/api/v1/data/{{DEVICE_ID}}"

data = {{"temperature": 36.6, "heart_rate": 78}}
resp = requests.post(URL, json=data, headers={{"X-API-Key": API_KEY}})
print(resp.json())
""",
            "arduino_esp32": f"""#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* apiKey = "{device.api_key}";
const char* deviceId = "{device_id}";
const char* serverUrl = "http://your-server/api/v1/data/{device_id}";

void sendData(float temperature, int heartRate) {{
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", apiKey);

  String body = "{{\"temperature\":" + String(temperature) +
                ",\"heart_rate\":" + String(heartRate) + "}}";
  int code = http.POST(body);
  http.end();
}}
""",
            "curl": f"""curl -X POST http://your-server/api/v1/data/{device_id} \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: {device.api_key}" \\
  -d '{{"temperature": 36.6, "heart_rate": 78}}'
""",
        },
    }
