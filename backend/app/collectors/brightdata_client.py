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

BASE_URL = "https://api.brightdata.com/datasets/v3"


class BrightDataError(Exception):
    pass


class BrightDataClient:
    def __init__(self) -> None:
        self._headers = {
            "Authorization": f"Bearer {settings.brightdata_api_key}",
            "Content-Type": "application/json",
        }

    async def run_collector(
        self, collector_id: str, target_url: str, poll_interval: float = 3.0, timeout: float = 120.0
    ) -> dict[str, Any]:
        """Trigger a Scraper Studio collector run against target_url and
        poll until it completes. Returns the raw structured record."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            trigger = await client.post(
                f"{BASE_URL}/trigger",
                headers=self._headers,
                params={"dataset_id": collector_id},
                json=[{"url": target_url}],
            )
            trigger.raise_for_status()
            snapshot_id = trigger.json()["snapshot_id"]

            elapsed = 0.0
            while elapsed < timeout:
                status_resp = await client.get(
                    f"{BASE_URL}/progress/{snapshot_id}", headers=self._headers
                )
                status_resp.raise_for_status()
                status = status_resp.json().get("status")

                if status == "ready":
                    data_resp = await client.get(
                        f"{BASE_URL}/snapshot/{snapshot_id}",
                        headers=self._headers,
                        params={"format": "json"},
                    )
                    data_resp.raise_for_status()
                    records = data_resp.json()
                    return records[0] if isinstance(records, list) and records else {}

                if status == "failed":
                    raise BrightDataError(f"Collector run {snapshot_id} failed")

                await asyncio.sleep(poll_interval)
                elapsed += poll_interval

            raise BrightDataError(f"Collector run {snapshot_id} timed out after {timeout}s")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
