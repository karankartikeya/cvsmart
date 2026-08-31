"""
Collector for join.com job postings.

The Scraper Studio collector was trained on Greenhouse and does not read
join.com at all: pointed at one it returns the training company with every
job field empty. join.com does, however, publish a schema.org JobPosting
block on each posting, which carries the title, the hiring organisation, the
location and the full description. Reading that structured block is both more
accurate and more stable than guessing at the rendered layout, so this
collector fetches the page and maps the JSON-LD onto our own JobPosting.

The description arrives as HTML-escaped markup, so most of the work here is
turning it back into the discrete bullet lists the letter prompt expects.
"""

import html
import json
import re
import uuid
from urllib.parse import urlparse, urlunparse

import httpx

from app.collectors.brightdata_client import BrightDataError, utcnow
from app.models.schemas import CollectorRun, JobPosting, RunStatus
from app.services.run_log import run_log

EXPECTED_FIELDS = [
    "role_title",
    "company_name",
    "seniority_level",
    "location",
    "salary",
    "responsibilities",
    "required_qualifications",
]

# join.com serves the page fine to a normal browser UA but not to a bare
# client, so present as one.
_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

_LD_JSON = re.compile(
    r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>', re.S | re.I
)

# Headings join.com's editor emits, mapped onto our three buckets. Anything
# under an unrecognised heading falls back to responsibilities so the letter
# still sees it.
_REQUIRED_HEADINGS = ("requirements", "qualifications", "your profile", "what you bring")
_PREFERRED_HEADINGS = ("nice to have", "bonus", "preferred", "benefits", "we offer", "perks")

# Employment types worth naming in the letter. join.com uses the schema.org
# vocabulary, which is upper case and not something to paste in verbatim.
_EMPLOYMENT_TYPES = {
    "INTERN": "Internship",
    "PART_TIME": "Part-time",
    "FULL_TIME": "Full-time",
    "CONTRACTOR": "Contract",
    "TEMPORARY": "Temporary",
}


def is_join_job_url(url: str) -> bool:
    """join.com postings live under /companies/<company>/<id>-<slug>. The bare
    company page lists jobs but is not one, so require the id segment."""
    parsed = urlparse(url.lower())
    host = parsed.netloc.split(":")[0]
    if host != "join.com" and not host.endswith(".join.com"):
        return False
    return bool(re.search(r"/companies/[^/]+/\d+", parsed.path))


def _canonical_url(url: str) -> str:
    """Drop the tracking query string; the posting id is in the path."""
    parsed = urlparse(url)
    return urlunparse(parsed._replace(query="", fragment=""))


def _strip_tags(fragment: str) -> str:
    text = re.sub(r"<[^>]+>", " ", fragment)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def _bucket_for(heading: str) -> str:
    lowered = heading.lower()
    if any(h in lowered for h in _PREFERRED_HEADINGS):
        return "preferred_qualifications"
    if any(h in lowered for h in _REQUIRED_HEADINGS):
        return "required_qualifications"
    return "responsibilities"


def _parse_description(description: str) -> dict[str, list[str]]:
    """Split the posting body into responsibilities, required and preferred.

    The body is one HTML blob whose sections are marked by headings. Walk it
    in order, tracking which heading we are under, and file each list item and
    paragraph accordingly.
    """
    markup = html.unescape(description or "")
    buckets: dict[str, list[str]] = {
        "responsibilities": [],
        "required_qualifications": [],
        "preferred_qualifications": [],
    }
    current = "responsibilities"

    for match in re.finditer(
        r"<(h[1-6]|li|p)\b[^>]*>(.*?)</\1>", markup, re.S | re.I
    ):
        tag = match.group(1).lower()
        text = _strip_tags(match.group(2))
        if not text:
            continue
        if tag.startswith("h"):
            current = _bucket_for(text)
            continue
        # Short standalone paragraphs are section labels ("Your Tasks") or
        # boilerplate rather than content worth putting in a letter; list
        # items are always content.
        if tag == "p" and len(text) < 40:
            if _bucket_for(text) != "responsibilities" or text.endswith(":"):
                current = _bucket_for(text)
            continue
        buckets[current].append(text)

    seen: set[str] = set()
    for key, values in buckets.items():
        deduped = []
        for value in values:
            marker = value.lower()
            if marker not in seen:
                seen.add(marker)
                deduped.append(value)
        buckets[key] = deduped[:15]
    return buckets


def _extract_job_posting_ld(page: str) -> dict | None:
    """Return the JobPosting block, which may be a bare object or sit inside
    an @graph alongside the organisation and breadcrumb blocks."""
    for raw in _LD_JSON.findall(page):
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        candidates = data.get("@graph", [data]) if isinstance(data, dict) else data
        if isinstance(candidates, dict):
            candidates = [candidates]
        for candidate in candidates:
            if isinstance(candidate, dict) and candidate.get("@type") == "JobPosting":
                return candidate
    return None


def _location(job_location: object) -> str | None:
    entries = job_location if isinstance(job_location, list) else [job_location]
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        address = entry.get("address")
        if not isinstance(address, dict):
            continue
        parts = [address.get("addressLocality"), address.get("addressCountry")]
        joined = ", ".join(p for p in parts if p)
        if joined:
            return joined
    return None


def _salary(base_salary: object) -> str | None:
    """join.com usually omits salary, but when present it is a MonetaryAmount."""
    if not isinstance(base_salary, dict):
        return None
    value = base_salary.get("value")
    if not isinstance(value, dict):
        return None
    currency = base_salary.get("currency") or ""
    low, high = value.get("minValue"), value.get("maxValue")
    unit = value.get("unitText", "").lower()
    amount = (
        f"{low}–{high}" if low and high else str(low or high or "")
    )
    if not amount:
        return None
    return " ".join(p for p in (currency, amount, f"per {unit}" if unit else "") if p)


async def collect_join_job(url: str) -> tuple[JobPosting, CollectorRun]:
    run = CollectorRun(
        run_id=str(uuid.uuid4()),
        collector_name="join_job",
        target_url=url,
        status=RunStatus.failed,
        started_at=utcnow(),
    )

    def fail(message: str) -> BrightDataError:
        run.finished_at = utcnow()
        run.fields_missing = EXPECTED_FIELDS
        run_log.record(run)
        return BrightDataError(message)

    try:
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            response = await client.get(
                _canonical_url(url),
                headers={"User-Agent": _USER_AGENT, "Accept": "text/html"},
            )
            response.raise_for_status()
            page = response.text
    except httpx.HTTPError as exc:
        raise fail(f"join.com request failed: {exc}") from exc

    raw = _extract_job_posting_ld(page)
    # A withdrawn posting still renders a page, just without the JobPosting
    # block, so treat its absence as a failed scrape rather than guessing.
    if not raw or not raw.get("title"):
        raise fail(
            "join.com returned no job data for this link. The posting may have "
            "been closed, or the link may point at the company page rather "
            "than a specific job."
        )

    organisation = raw.get("hiringOrganization")
    company_name = (
        organisation.get("name") if isinstance(organisation, dict) else None
    )
    sections = _parse_description(raw.get("description", ""))

    values = {
        "role_title": raw.get("title"),
        "company_name": company_name,
        "seniority_level": _EMPLOYMENT_TYPES.get(raw.get("employmentType") or ""),
        "location": _location(raw.get("jobLocation")),
        "salary": _salary(raw.get("baseSalary")),
        "responsibilities": sections["responsibilities"],
        "required_qualifications": sections["required_qualifications"],
    }

    run.status = RunStatus.success if all(values.values()) else RunStatus.partial
    run.fields_recovered = [f for f in EXPECTED_FIELDS if values.get(f)]
    run.fields_missing = [f for f in EXPECTED_FIELDS if not values.get(f)]
    run.finished_at = utcnow()
    run_log.record(run)

    posting = JobPosting(
        role_title=values["role_title"],
        company_name=company_name,
        seniority_level=values["seniority_level"],
        location=values["location"],
        salary=values["salary"],
        responsibilities=sections["responsibilities"],
        required_qualifications=sections["required_qualifications"],
        preferred_qualifications=sections["preferred_qualifications"],
        raw_source_url=url,
    )
    return posting, run
