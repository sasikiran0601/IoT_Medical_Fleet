import asyncio
import importlib.util
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    alerts,
    api_keys,
    auth,
    devices,
    floors,
    invites,
    logs,
    rooms,
    sensor,
    users,
    webhooks,
)
from app.db.init_db import init_db
from app.mqtt.client import create_mqtt_client
from app.services.device_presence_monitor import run_device_presence_monitor
from app.websockets.routes import router as ws_router


def _ensure_ws_runtime_dependencies() -> None:
    """Fail fast if Uvicorn WS runtime deps are missing in the active venv."""
    has_websockets = importlib.util.find_spec("websockets") is not None
    has_wsproto = importlib.util.find_spec("wsproto") is not None
    if has_websockets or has_wsproto:
        return
    raise RuntimeError(
        "WebSocket runtime dependency missing. Install in active backend venv: "
        "pip install \"uvicorn[standard]\" websockets wsproto"
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    _ensure_ws_runtime_dependencies()
    await init_db()
    create_mqtt_client()  # starts MQTT listener in a background thread

    stop_event = asyncio.Event()
    presence_task = asyncio.create_task(run_device_presence_monitor(stop_event))
    app.state.presence_stop_event = stop_event
    app.state.presence_task = presence_task

    print("Medical IoT Fleet Management System started")
    try:
        yield
    finally:
        stop_event.set()
        await asyncio.gather(presence_task, return_exceptions=True)
        print("Shutting down")


app = FastAPI(
    title="Medical IoT Fleet Management System",
    description=(
        "Centralized platform for managing, monitoring, and controlling "
        "medical IoT devices across hospital floors and rooms."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(floors.router)
app.include_router(rooms.router)
app.include_router(devices.router)
app.include_router(sensor.router)
app.include_router(logs.router)
app.include_router(alerts.router)
app.include_router(api_keys.router)
app.include_router(webhooks.router)
app.include_router(invites.router)
app.include_router(ws_router)


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": "Medical IoT Fleet API"}


@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "Medical IoT Fleet Management System",
        "docs": "/docs",
        "health": "/health",
    }
