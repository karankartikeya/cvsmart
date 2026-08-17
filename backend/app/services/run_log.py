"""In-memory run history for the collector health view. Fine for a
week-long hackathon demo; swap for a DB if this needs to survive restarts."""

from app.models.schemas import CollectorRun

MAX_RUNS = 100


class RunLog:
    def __init__(self) -> None:
        self._runs: list[CollectorRun] = []

    def record(self, run: CollectorRun) -> None:
        self._runs.insert(0, run)
        del self._runs[MAX_RUNS:]

    def recent(self, limit: int = 20) -> list[CollectorRun]:
        return self._runs[:limit]


run_log = RunLog()
