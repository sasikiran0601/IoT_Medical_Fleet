from sqlalchemy import inspect, text

from app.db.database import Base, engine
# Import all models so Base knows about them
from app.models import user, floor, room, device, sensor_data, audit_log, alert, invite_token  # noqa


def _run_schema_patches(sync_conn):
    inspector = inspect(sync_conn)
    if not inspector.has_table("users"):
        return

    existing_cols = {col["name"] for col in inspector.get_columns("users")}
    if "email_verified" not in existing_cols:
        sync_conn.execute(text("ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE"))

    if inspector.has_table("devices"):
        device_cols = {col["name"] for col in inspector.get_columns("devices")}
        if "presence_source" not in device_cols:
            sync_conn.execute(text("ALTER TABLE devices ADD COLUMN presence_source VARCHAR DEFAULT 'unknown'"))
        if "connection_state" not in device_cols:
            sync_conn.execute(text("ALTER TABLE devices ADD COLUMN connection_state VARCHAR DEFAULT 'unknown'"))
        if "data_state" not in device_cols:
            sync_conn.execute(text("ALTER TABLE devices ADD COLUMN data_state VARCHAR DEFAULT 'unknown'"))
        if "last_status_at" not in device_cols:
            sync_conn.execute(text("ALTER TABLE devices ADD COLUMN last_status_at DATETIME"))
        if "last_data_at" not in device_cols:
            sync_conn.execute(text("ALTER TABLE devices ADD COLUMN last_data_at DATETIME"))


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_run_schema_patches)
    print("Database tables created")
