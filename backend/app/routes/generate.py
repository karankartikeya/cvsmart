from fastapi import APIRouter, HTTPException

from app.collectors.brightdata_client import BrightDataError
from app.collectors.company_context_collector import collect_company_context
from app.collectors.job_posting_collector import collect_job_posting
from app.models.schemas import CoverLetterRequest, CoverLetterResponse
from app.services.cover_letter import generate_cover_letter

router = APIRouter()


@router.post("/generate", response_model=CoverLetterResponse)
async def generate(req: CoverLetterRequest) -> CoverLetterResponse:
    try:
        job, job_run = await collect_job_posting(req.job_url)
        company, company_run = await collect_company_context(req.company_url)
    except BrightDataError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    letter = await generate_cover_letter(
        job, company, req.candidate_name, req.candidate_background
    )

    return CoverLetterResponse(
        cover_letter=letter,
        job_posting=job,
        company_context=company,
        runs=[job_run, company_run],
    )
