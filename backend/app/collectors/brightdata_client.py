"""
Thin client around Bright Data's Scraper Studio API.

Collectors are defined in Scraper Studio itself (bright-data-collectors.md
in repo root has the field specs to paste in) using plain-language field
descriptions, not CSS selectors. That's what gives self-healing: when a
site's layout shifts, Scraper Studio re-locates fields from the description
instead of failing on a stale selector. This client just triggers a
collector run and polls for the structured result.
"""

import asyncio
from datetime import datetime, timezone
from typing import Any

import httpx

from app.config import settings

BASE_URL = "https://api.brightdata.com/dca"


class BrightDataError(Exception):
    pass


class BrightDataClient:
    def __init__(self) -> None:
        self._headers = {
            "Authorization": f"Bearer {settings.brightdata_api_key}",
            "Content-Type": "application/json",
        }

    async def run_collector(
        self, collector_id: str, target_url: str, poll_interval: float = 5.0, timeout: float = 120.0
    ) -> dict[str, Any]:
        """Trigger a Scraper Studio collector run against target_url and
        poll until it completes. Returns the raw structured record."""
        if not collector_id:
            raise BrightDataError(
                "Collector ID is not configured. Set BRIGHTDATA_JOB_COLLECTOR_ID / "
                "BRIGHTDATA_COMPANY_COLLECTOR_ID in backend/.env."
            )

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                trigger = await client.post(
                    f"{BASE_URL}/trigger",
                    headers=self._headers,
                    params={"collector": collector_id, "queue_next": 1},
                    json=[{"url": target_url}],
                )
                trigger.raise_for_status()
                collection_id = trigger.json()["collection_id"]

                elapsed = 0.0
                while elapsed < timeout:
                    data_resp = await client.get(
                        f"{BASE_URL}/dataset",
                        headers=self._headers,
                        params={"id": collection_id},
                    )
                    data_resp.raise_for_status()
                    body = data_resp.json()

                    if isinstance(body, list):
                        return body[0] if body else {}

                    status = body.get("status") if isinstance(body, dict) else None
                    if status == "failed" or status == "error":
                        raise BrightDataError(f"Collector run {collection_id} failed")

                    await asyncio.sleep(poll_interval)
                    elapsed += poll_interval

                raise BrightDataError(f"Collector run {collection_id} timed out after {timeout}s")
        except httpx.HTTPError as exc:
            raise BrightDataError(f"Bright Data request failed: {exc}") from exc


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
