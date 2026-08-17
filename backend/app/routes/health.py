from fastapi import APIRouter

from app.models.schemas import CollectorRun
from app.services.run_log import run_log

router = APIRouter()


@router.get("/collector-health", response_model=list[CollectorRun])
async def collector_health(limit: int = 20) -> list[CollectorRun]:
    return run_log.recent(limit)
