import uuid

from app.collectors.brightdata_client import BrightDataClient, BrightDataError, utcnow
from app.config import settings
from app.models.schemas import CollectorRun, JobPosting, RunStatus, SelfHealEvent
from app.services.run_log import run_log

EXPECTED_FIELDS = [
    "role_title",
    "company_name",
    "seniority_level",
    "location",
    "salary",
    "responsibilities",
    "required_qualifications",
    "preferred_qualifications",
]


async def collect_job_posting(url: str) -> tuple[JobPosting, CollectorRun]:
    client = BrightDataClient()
    run = CollectorRun(
        run_id=str(uuid.uuid4()),
        collector_name="job_posting",
        target_url=url,
        status=RunStatus.failed,
        started_at=utcnow(),
    )

    try:
        raw = await client.run_collector(settings.brightdata_job_collector_id, url)
    except BrightDataError as exc:
        run.finished_at = utcnow()
        run.fields_missing = EXPECTED_FIELDS
        run_log.record(run)
        raise exc

    fields_recovered = [f for f in EXPECTED_FIELDS if raw.get(f)]
    fields_missing = [f for f in EXPECTED_FIELDS if not raw.get(f)]

    self_heal_events = [
        SelfHealEvent(field=e["field"], detail=e["detail"])
        for e in raw.get("_self_heal_events", [])
    ]

    run.status = (
        RunStatus.success if not fields_missing else
        RunStatus.partial if fields_recovered else
        RunStatus.failed
    )
    run.fields_recovered = fields_recovered
    run.fields_missing = fields_missing
    run.self_heal_events = self_heal_events
    run.finished_at = utcnow()
    run_log.record(run)

    posting = JobPosting(
        role_title=raw.get("role_title"),
        company_name=raw.get("company_name"),
        seniority_level=raw.get("seniority_level"),
        location=raw.get("location"),
        salary=raw.get("salary"),
        responsibilities=raw.get("responsibilities", []),
        required_qualifications=raw.get("required_qualifications", []),
        preferred_qualifications=raw.get("preferred_qualifications", []),
        raw_source_url=url,
    )
    return posting, run
