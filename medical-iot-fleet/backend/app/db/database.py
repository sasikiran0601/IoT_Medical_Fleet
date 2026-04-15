from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from app.core.config import settings

engine_kwargs = {"echo": False}
database_url = settings.DATABASE_URL

if database_url.startswith("postgresql+asyncpg"):
    # For Supabase pooler endpoints, prefer NullPool to avoid local QueuePool starvation.
    if "pooler.supabase.com" in database_url:
        engine_kwargs.update(
            {
                "poolclass": NullPool,
                "connect_args": {
                    "statement_cache_size": 0,
                    "server_settings": {"jit": "off"},
                },
            }
        )
    else:
        engine_kwargs.update(
            {
                "pool_size": settings.DB_POOL_SIZE,
                "max_overflow": settings.DB_MAX_OVERFLOW,
                "pool_timeout": settings.DB_POOL_TIMEOUT_SECONDS,
                "pool_recycle": settings.DB_POOL_RECYCLE_SECONDS,
                "pool_pre_ping": True,
                "connect_args": {
                    # Avoid asyncpg prepared-statement cache issues behind poolers.
                    "statement_cache_size": 0,
                    "server_settings": {"jit": "off"},
                },
            }
        )

engine = create_async_engine(database_url, **engine_kwargs)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
