from app.db import get_pool


async def get_profile(user_id: str) -> dict | None:
    row = await get_pool().fetchrow(
        "select id, email, trial_started_at, trial_ends_at, created_at "
        "from public.profiles where id = $1",
        user_id,
    )
    return dict(row) if row else None
