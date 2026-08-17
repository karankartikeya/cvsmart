# Job Application Intelligence Tool

Scrape a job posting and a company's site with Bright Data Scraper Studio,
feed the structured output to an LLM, get a cover letter grounded in real
specifics instead of generic filler.

Built for the Into the Scrape-Verse hackathon (WeMakeDevs x Bright Data).

## Architecture

```
frontend/  Next.js app. Form -> POST /api/generate -> renders letter +
           collector run details. /health page shows recent collector runs.

backend/   FastAPI. Two Bright Data Scraper Studio collectors
           (job posting, company context) run in parallel-ish sequence,
           results feed an OpenAI prompt that drafts the cover letter.
           Every collector run is logged in-memory for the health view.
```

Data flow: `job_url + company_url` → `job_posting_collector` /
`company_context_collector` (Bright Data Scraper Studio, plain-language
field descriptions, not selectors — this is the self-healing part) →
structured `JobPosting` / `CompanyContext` → `cover_letter` service
(OpenAI) → response with letter + structured data + run health.

See [bright-data-collectors.md](./bright-data-collectors.md) for the exact
field specs to paste into Scraper Studio.

## Setup

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# .env already has BRIGHTDATA_API_KEY and OPENAI_API_KEY filled in.
# Still need to fill in BRIGHTDATA_JOB_COLLECTOR_ID and
# BRIGHTDATA_COMPANY_COLLECTOR_ID after creating the two collectors
# in Scraper Studio (see bright-data-collectors.md).
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:3000.

## Status

- [x] Repo scaffold, backend + frontend structure
- [x] Collector wrappers with self-heal/health tracking
- [x] Cover letter generation service (OpenAI, tone template)
- [x] Frontend form + results view + collector health page
- [ ] Create the two collectors in Bright Data Scraper Studio dashboard,
      fill in their IDs in `backend/.env`
- [ ] End-to-end test against a real job posting + company page
- [ ] Demo script / submission notes
