import httpx
from datetime import datetime


async def forward_to_webhook(webhook_url: str, device_id: str, readings: dict):
    """Push sensor data to configured external URL (AWS IoT Core, etc.)."""
    payload = {
        "device_id": device_id,
        "readings": readings,
        "timestamp": datetime.utcnow().isoformat(),
    }
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.post(webhook_url, json=payload)
            return response.status_code
    except Exception as e:
        print(f"[Webhook] Failed to forward to {webhook_url}: {e}")
        return None