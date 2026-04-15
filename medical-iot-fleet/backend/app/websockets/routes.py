from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websockets.manager import manager

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/dashboard")
async def dashboard_ws(websocket: WebSocket):
    """Main dashboard endpoint for live updates."""
    await manager.connect_dashboard(websocket)
    try:
        while True:
            message = await websocket.receive_text()
            if message == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@router.websocket("/ws/device/{device_id}")
async def device_ws(websocket: WebSocket, device_id: str):
    """Device detail endpoint for a single device stream."""
    await manager.connect_device(websocket, device_id)
    try:
        while True:
            message = await websocket.receive_text()
            if message == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, device_id)
