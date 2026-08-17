from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import generate, health

app = FastAPI(title="Job Application Intelligence Tool")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate.router, prefix="/api")
app.include_router(health.router, prefix="/api")


@app.get("/api/ping")
async def ping() -> dict[str, str]:
    return {"status": "ok"}
