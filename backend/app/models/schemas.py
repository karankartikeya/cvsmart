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


class CoverLetterResult(BaseModel):
    cover_letter: str
    job_posting: JobPosting
    job_url: str


class CoverLetterResponse(BaseModel):
    results: list[CoverLetterResult]
    company_context: CompanyContext | None = None
    runs: list[CollectorRun]
