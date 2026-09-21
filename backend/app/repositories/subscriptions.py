from app.db import get_pool


async def get_subscription(user_id: str) -> dict | None:
    row = await get_pool().fetchrow(
        "select user_id, stripe_customer_id, stripe_subscription_id, tier, "
        "status, current_period_end, updated_at "
        "from public.subscriptions where user_id = $1",
        user_id,
    )
    return dict(row) if row else None


async def upsert_subscription(
    user_id: str,
    stripe_customer_id: str,
    stripe_subscription_id: str | None,
    tier: str,
    status: str,
    current_period_end,
) -> None:
    await get_pool().execute(
        """
        insert into public.subscriptions
            (user_id, stripe_customer_id, stripe_subscription_id, tier, status, current_period_end, updated_at)
        values ($1, $2, $3, $4, $5, $6, now())
        on conflict (user_id) do update set
            stripe_customer_id = excluded.stripe_customer_id,
            stripe_subscription_id = excluded.stripe_subscription_id,
            tier = excluded.tier,
            status = excluded.status,
            current_period_end = excluded.current_period_end,
            updated_at = now()
        """,
        user_id,
        stripe_customer_id,
        stripe_subscription_id,
        tier,
        status,
        current_period_end,
    )
