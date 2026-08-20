# CV Cover

Upload a CV, paste the jobs you want, and get a cover letter per posting
that cites real details from the job ad and your own resume instead of
generic filler.

Built for the Into the Scrape-Verse hackathon (WeMakeDevs x Bright Data).

## Architecture

```
frontend/  Next.js app. Four step form (CV upload, job URLs, generate) ->
           POST /api/generate -> renders one letter per posting plus the
           extracted data. /health shows recent collector runs.

backend/   FastAPI. Bright Data Scraper Studio collects each job posting
           concurrently; the resume is parsed server-side; both feed an
           OpenAI prompt that drafts the letter. Every collector run is
           logged in memory for the health view.
```

Data flow: `job_urls[] + resume file` → `job_posting_collector` (Bright
Data Scraper Studio) → structured `JobPosting` → `cover_letter` service
(OpenAI) → one letter per posting, returned with the structured data and
run health.

Company context is optional. When a company URL is supplied and the page
extracts cleanly, its mission and announcements enrich the letter; when it
does not, the letter is written from the posting and resume alone rather
than failing the request.

Collectors are built with the Bright Data CLI from a plain-language
description rather than hand-written selectors, which is what lets them be
repaired in place with `bdata scraper heal` when a site's layout shifts.
See [bright-data-collectors.md](./bright-data-collectors.md) for the field
specs.

## Setup

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

`backend/.env` needs four values:

```
BRIGHTDATA_API_KEY=              # account API token, from Account Settings
OPENAI_API_KEY=
BRIGHTDATA_JOB_COLLECTOR_ID=     # c_... from Scraper Studio
BRIGHTDATA_COMPANY_COLLECTOR_ID= # optional, blank disables company context
```

Note that `.env` is read once at startup, so restart the server after
changing it.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:3000.

## Status

- [x] Backend and frontend structure
- [x] Collectors built with the Bright Data CLI, IDs wired into `.env`
- [x] Resume parsing (PDF, TXT, Markdown)
- [x] Cover letter generation, one per job URL
- [x] Collector health tracking with per-field recovery reporting
- [x] End-to-end verified against live Greenhouse postings
- [ ] Demo script and submission notes

### Known limitations

Extraction quality varies by job board layout. Some postings return the
full responsibilities and qualifications, others only the title and
location, in which case the letter leans more on the resume. Runs report
this honestly as `partial` with the missing fields named, rather than
pretending the scrape was complete.

Company context extraction is unreliable on JS-heavy marketing sites, so
it is optional by design.
