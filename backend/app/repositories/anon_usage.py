from app.db import get_pool


async def find_by_cookie(anon_cookie_id: str) -> dict | None:
    row = await get_pool().fetchrow(
        "select * from public.anon_usage where anon_cookie_id = $1", anon_cookie_id
    )
    return dict(row) if row else None


async def find_by_identity_key(identity_key: str) -> dict | None:
    row = await get_pool().fetchrow(
        "select * from public.anon_usage where identity_key = $1", identity_key
    )
    return dict(row) if row else None


async def create(
    identity_key: str, anon_cookie_id: str, fingerprint_id: str, ip_hash: str
) -> dict:
    row = await get_pool().fetchrow(
        """
        insert into public.anon_usage
            (identity_key, anon_cookie_id, fingerprint_id, ip_hash)
        values ($1, $2, $3, $4)
        returning *
        """,
        identity_key,
        anon_cookie_id,
        fingerprint_id,
        ip_hash,
    )
    return dict(row)


async def attach_cookie(identity_key: str, anon_cookie_id: str) -> None:
    await get_pool().execute(
        "update public.anon_usage set anon_cookie_id = $2, last_seen_at = now() "
        "where identity_key = $1",
        identity_key,
        anon_cookie_id,
    )


async def increment_usage(identity_key: str, job_url_count: int) -> None:
    await get_pool().execute(
        """
        update public.anon_usage
        set generation_count = generation_count + 1,
            job_urls_used = job_urls_used + $2,
            last_seen_at = now()
        where identity_key = $1
        """,
        identity_key,
        job_url_count,
    )
