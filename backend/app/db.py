import asyncpg

from app.config import settings

_pool: asyncpg.Pool | None = None


async def init_pool() -> None:
    global _pool
    if _pool is not None or not settings.database_url:
        return
    # Small pool: serverless instances each hold their own connections.
    _pool = await asyncpg.create_pool(settings.database_url, min_size=1, max_size=3)


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool not initialized (DATABASE_URL not set)")
    return _pool
