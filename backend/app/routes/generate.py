import asyncio

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.collectors.brightdata_client import BrightDataError
from app.collectors.company_context_collector import collect_company_context
from app.collectors.router import collect_job
from app.models.schemas import (
    CollectorRun,
    CompanyContext,
    CoverLetterResponse,
    CoverLetterResult,
)
from app.services.cover_letter import generate_cover_letter
from app.services.resume_parser import extract_resume_text

router = APIRouter()


@router.post("/generate", response_model=CoverLetterResponse)
async def generate(
    job_urls: list[str] = Form(...),
    company_url: str = Form(""),
    candidate_name: str = Form(...),
    resume: UploadFile = File(...),
) -> CoverLetterResponse:
    resume_bytes = await resume.read()
    resume_text = await extract_resume_text(resume.filename or "resume.txt", resume_bytes)

    # The job posting is the hard requirement: it carries the role detail the
    # letter is grounded in. Company context is a bonus — many company sites are
    # JS-heavy and extract poorly, so a failure there must not sink the request.
    try:
        job_results = await asyncio.gather(
            *(collect_job(url) for url in job_urls)
        )
    except BrightDataError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    company: CompanyContext | None = None
    company_run: CollectorRun | None = None
    if company_url:
        try:
            company, company_run = await collect_company_context(company_url)
        except BrightDataError:
            company = None

    results: list[CoverLetterResult] = []
    runs = []
    for job, job_run in job_results:
        letter = await generate_cover_letter(job, company, candidate_name, resume_text)
        results.append(
            CoverLetterResult(cover_letter=letter, job_posting=job, job_url=job_run.target_url)
        )
        runs.append(job_run)
    if company_run is not None:
        runs.append(company_run)

    return CoverLetterResponse(
        results=results,
        company_context=company,
        runs=runs,
    )
