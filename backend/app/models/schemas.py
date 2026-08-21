from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class JobPosting(BaseModel):
    role_title: str | None = None
    company_name: str | None = None
    seniority_level: str | None = None
    location: str | None = None
    salary: str | None = None
    responsibilities: list[str] = Field(default_factory=list)
    required_qualifications: list[str] = Field(default_factory=list)
    preferred_qualifications: list[str] = Field(default_factory=list)
    raw_source_url: str


class CompanyContext(BaseModel):
    company_name: str | None = None
    mission: str | None = None
    recent_announcements: list[str] = Field(default_factory=list)
    tech_stack_mentions: list[str] = Field(default_factory=list)
    culture_signals: list[str] = Field(default_factory=list)
    raw_source_url: str


class RunStatus(str, Enum):
    success = "success"
    partial = "partial"
    failed = "failed"


class SelfHealEvent(BaseModel):
    field: str
    detail: str


class CollectorRun(BaseModel):
    run_id: str
    collector_name: str
    target_url: str
    status: RunStatus
    fields_recovered: list[str] = Field(default_factory=list)
    fields_missing: list[str] = Field(default_factory=list)
    self_heal_events: list[SelfHealEvent] = Field(default_factory=list)
    started_at: datetime
    finished_at: datetime | None = None


class ContactDetails(BaseModel):
    """Sender block for the letterhead, read out of the uploaded CV."""

    full_name: str = ""
    headline: str = ""
    street: str = ""
    city: str = ""
    phone: str = ""
    email: str = ""
    linkedin: str = ""


class CoverLetterResult(BaseModel):
    cover_letter: str
    job_posting: JobPosting
    job_url: str
    # Parts of a formal letter that sit outside the body text, so the PDF can
    # lay them out rather than embedding them in the prose.
    subject: str = ""
    salutation: str = ""
    closing: str = ""
    language: str = "en"


class CoverLetterResponse(BaseModel):
    results: list[CoverLetterResult]
    company_context: CompanyContext | None = None
    runs: list[CollectorRun]
    contact: ContactDetails | None = None
