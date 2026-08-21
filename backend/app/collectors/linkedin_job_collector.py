"""
Collector for LinkedIn job postings.

LinkedIn is hostile to generic scraping, so instead of a Scraper Studio
collector this uses Bright Data's prebuilt LinkedIn Jobs dataset, which
returns a fixed schema synchronously. Everything here is about mapping that
schema onto our own JobPosting.
"""

import re
import uuid
from urllib.parse import parse_qs, urlparse

import httpx

from app.collectors.brightdata_client import BrightDataError, utcnow
from app.config import settings
from app.models.schemas import CollectorRun, JobPosting, RunStatus
from app.services.run_log import run_log

LINKEDIN_JOBS_DATASET_ID = "gd_lpfll7v5hcqtkxl6l"
SCRAPE_URL = "https://api.brightdata.com/datasets/v3/scrape"

EXPECTED_FIELDS = [
    "role_title",
    "company_name",
    "seniority_level",
    "location",
    "salary",
    "responsibilities",
]


def is_linkedin_job_url(url: str) -> bool:
    return "linkedin.com/jobs/" in url.lower()


def _canonical_url(url: str) -> str:
    """Reduce any LinkedIn job URL to the numeric form the dataset resolves.

    People paste several shapes, and only the last one works as-is:

    - /jobs/search-results/?currentJobId=123  (copied from the job search)
    - /jobs/view/some-title-at-company-123    (the shareable SEO link)
    - /jobs/view/123
    """
    # Search, collection and recommendation pages carry the id in the query
    # string; the path itself says nothing about which job is open.
    query = parse_qs(urlparse(url).query)
    for key in ("currentJobId", "trackingId", "jobId"):
        values = query.get(key) or []
        for value in values:
            if value.isdigit() and len(value) >= 6:
                return f"https://www.linkedin.com/jobs/view/{value}"

    match = re.search(r"/jobs/view/(?:.*?-)?(\d{6,})", url)
    if match:
        return f"https://www.linkedin.com/jobs/view/{match.group(1)}"

    return url


def _split_summary(summary: str | None) -> list[str]:
    """LinkedIn returns one prose blob rather than bullet lists. Split it into
    paragraphs so the prompt gets discrete points instead of a wall of text."""
    if not summary:
        return []
    parts = [p.strip() for p in re.split(r"\n+", summary) if p.strip()]
    return [p for p in parts if len(p) > 30][:12]


async def collect_linkedin_job(url: str) -> tuple[JobPosting, CollectorRun]:
    run = CollectorRun(
        run_id=str(uuid.uuid4()),
        collector_name="linkedin_job",
        target_url=url,
        status=RunStatus.failed,
        started_at=utcnow(),
    )

    canonical = _canonical_url(url)
    # A LinkedIn jobs page with no id in it, such as the bare search page,
    # names no particular job. Say so rather than sending a doomed request.
    if "/jobs/view/" not in canonical:
        run.finished_at = utcnow()
        run.fields_missing = EXPECTED_FIELDS
        run_log.record(run)
        raise BrightDataError(
            "That LinkedIn link does not point at a specific job. Open the job "
            "first, then copy the URL from the address bar."
        )

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                SCRAPE_URL,
                headers={
                    "Authorization": f"Bearer {settings.brightdata_api_key}",
                    "Content-Type": "application/json",
                },
                params={"dataset_id": LINKEDIN_JOBS_DATASET_ID, "format": "json"},
                json=[{"url": canonical}],
            )
            response.raise_for_status()
            payload = response.json()
    except httpx.HTTPError as exc:
        run.finished_at = utcnow()
        run.fields_missing = EXPECTED_FIELDS
        run_log.record(run)
        raise BrightDataError(f"LinkedIn job request failed: {exc}") from exc

    raw = payload[0] if isinstance(payload, list) and payload else {}

    # An expired or unreachable posting still returns 200, just without any of
    # the job fields, so treat a missing title as a failed scrape.
    if not raw.get("job_title"):
        run.finished_at = utcnow()
        run.fields_missing = EXPECTED_FIELDS
        run_log.record(run)
        raise BrightDataError(
            "LinkedIn returned no data for this posting. It may have expired or "
            "be restricted to signed-in users."
        )

    responsibilities = _split_summary(raw.get("job_summary"))

    values = {
        "role_title": raw.get("job_title"),
        "company_name": raw.get("company_name"),
        "seniority_level": raw.get("job_seniority_level"),
        "location": raw.get("job_location"),
        "salary": raw.get("base_salary") or raw.get("salary_standards"),
        "responsibilities": responsibilities,
    }
    fields_recovered = [f for f in EXPECTED_FIELDS if values.get(f)]
    fields_missing = [f for f in EXPECTED_FIELDS if not values.get(f)]

    run.status = RunStatus.success if not fields_missing else RunStatus.partial
    run.fields_recovered = fields_recovered
    run.fields_missing = fields_missing
    run.finished_at = utcnow()
    run_log.record(run)

    posting = JobPosting(
        role_title=values["role_title"],
        company_name=values["company_name"],
        seniority_level=values["seniority_level"],
        location=values["location"],
        salary=values["salary"] if isinstance(values["salary"], str) else None,
        responsibilities=responsibilities,
        required_qualifications=[],
        preferred_qualifications=[],
        raw_source_url=url,
    )
    return posting, run
