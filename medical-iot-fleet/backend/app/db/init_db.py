from app.db.database import engine, Base
# Import all models so Base knows about them
from app.models import user, floor, room, device, sensor_data, audit_log, alert  # noqa


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables created")