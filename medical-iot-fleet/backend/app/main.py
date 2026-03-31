from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.db.init_db import init_db
from app.mqtt.client import create_mqtt_client

# Routes
from app.api.routes import auth, users, floors, rooms, devices, sensor, logs, alerts, api_keys, webhooks
from app.websockets.routes import router as ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ────────────────────────────────────────────────────────────
    await init_db()
    create_mqtt_client()          # starts MQTT listener in background thread
    print("🚀 Medical IoT Fleet Management System started")
    yield
    # ── Shutdown ───────────────────────────────────────────────────────────
    print("🛑 Shutting down")


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

# ── CORS ───────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten in production to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────
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
app.include_router(ws_router)


# ── Health check ───────────────────────────────────────────────────────────
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