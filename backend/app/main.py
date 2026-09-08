from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import generate, health

app = FastAPI(title="Coverit")

# Local development is always allowed; deployed frontends are added through
# ALLOWED_ORIGINS so the hosted site is not locked out by a hardcoded list.
allowed_origins = ["http://localhost:3000"]
if settings.allowed_origins:
    allowed_origins += [
        origin.strip() for origin in settings.allowed_origins.split(",") if origin.strip()
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    # Vercel gives every deployment its own preview URL, so match them by
    # pattern rather than listing each one.
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate.router, prefix="/api")
app.include_router(health.router, prefix="/api")


@app.get("/api/ping")
async def ping() -> dict[str, str]:
    return {"status": "ok"}
