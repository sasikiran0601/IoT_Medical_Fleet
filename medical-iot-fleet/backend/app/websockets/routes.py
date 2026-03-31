from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websockets.manager import manager

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/dashboard")
async def dashboard_ws(websocket: WebSocket):
    """Main dashboard — receives all device updates."""
    await manager.connect_dashboard(websocket)
    try:
        while True:
            await websocket.receive_text()  # keep-alive ping
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@router.websocket("/ws/device/{device_id}")
async def device_ws(websocket: WebSocket, device_id: str):
    """Device detail page — receives live sensor data for one device."""
    await manager.connect_device(websocket, device_id)
    try:
        while True:
            await websocket.receive_text()  # keep-alive ping
    except WebSocketDisconnect:
        manager.disconnect(websocket, device_id)