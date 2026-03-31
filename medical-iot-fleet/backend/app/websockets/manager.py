import json
from typing import Dict, List
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # device_id → list of websockets watching that device
        self.device_listeners: Dict[str, List[WebSocket]] = {}
        # all websockets watching the main dashboard
        self.dashboard_listeners: List[WebSocket] = []

    # ── Connect ────────────────────────────────────────────────────────────
    async def connect_device(self, websocket: WebSocket, device_id: str):
        await websocket.accept()
        self.device_listeners.setdefault(device_id, []).append(websocket)

    async def connect_dashboard(self, websocket: WebSocket):
        await websocket.accept()
        self.dashboard_listeners.append(websocket)

    # ── Disconnect ─────────────────────────────────────────────────────────
    def disconnect(self, websocket: WebSocket, device_id: str = None):
        if device_id and device_id in self.device_listeners:
            self.device_listeners[device_id] = [
                ws for ws in self.device_listeners[device_id] if ws != websocket
            ]
        if websocket in self.dashboard_listeners:
            self.dashboard_listeners.remove(websocket)

    # ── Send helpers ───────────────────────────────────────────────────────
    async def _safe_send(self, websocket: WebSocket, data: dict):
        try:
            await websocket.send_text(json.dumps(data))
        except Exception:
            pass  # Dead connection — will be cleaned up on next disconnect

    async def broadcast_sensor(self, device_id: str, payload: dict):
        """Push new sensor data to device detail page viewers + dashboard."""
        for ws in self.device_listeners.get(device_id, []):
            await self._safe_send(ws, {"type": "sensor_data", **payload})

        await self.broadcast_dashboard({
            "type": "device_update",
            "device_id": device_id,
            **payload,
        })

    async def broadcast_state_change(self, device_id: str, payload: dict):
        """Push ON/OFF state change to everyone."""
        for ws in self.device_listeners.get(device_id, []):
            await self._safe_send(ws, {"type": "state_change", **payload})
        await self.broadcast_dashboard({"type": "state_change", "device_id": device_id, **payload})

    async def broadcast_alert(self, payload: dict):
        """Push new alert to the dashboard."""
        await self.broadcast_dashboard({"type": "new_alert", **payload})

    async def broadcast_dashboard(self, data: dict):
        for ws in self.dashboard_listeners:
            await self._safe_send(ws, data)


# Global singleton used across the app
manager = ConnectionManager()