# CV Cover

Upload a CV, paste the jobs you want, and get one cover letter per posting
that cites real details from the job ad and your own resume instead of
generic filler. Every letter downloads as a formal PDF, laid out to the
German DIN 5008 letter standard.

Built for the Into the Scrape-Verse hackathon (WeMakeDevs x Bright Data).

- **Live app:** https://cvcover.vercel.app
- **API health:** https://cvsmart-production-599d.up.railway.app/api/ping
- **Collector health view:** https://cvcover.vercel.app/health

No sign-up, no account, no payment. Paste and go.

## The problem

Applying to ten jobs means writing ten cover letters. Pasting a job ad into
ChatGPT gets you a letter that reads like it came from ChatGPT: the same
three-paragraph shape, the same "I am writing to express my enthusiasm",
and increasingly the same statistical fingerprint that AI-detection tools
in applicant tracking systems flag.

The interesting half of the problem is not the writing. It is *getting the
job posting in the first place* — reliably, as structured data, from a page
that was built to be read by humans and is redesigned without warning.
That is the part this project is actually about.

## Architecture

```
frontend/  Next.js 16 app. Upload CV -> add job URLs -> generate.
           Results and downloads appear in a modal; /health shows the
           structured record of every collector run.

backend/   FastAPI. Each job URL is routed to a collector and scraped
           concurrently, the CV is parsed server-side, and both feed an
           OpenAI prompt that drafts the letter. Every run is recorded
           with its per-field recovery result.
```

Data flow:

```
job_urls[] + CV file
      |
      v
  collector router  ------> LinkedIn URL?  -> Bright Data LinkedIn Jobs dataset
      |                     join.com URL?  -> join.com schema.org collector
      |                     anything else  -> Bright Data Scraper Studio collector
      v
  JobPosting (structured)  +  ContactDetails (parsed from CV)
      |
      v
  cover_letter service (OpenAI, JSON-mode)
      |
      v
  LetterParts -> DIN 5008 PDF  (+ ZIP when several jobs)
```

### Three collection paths, on purpose

| URL | Path | Why |
|---|---|---|
| `linkedin.com/jobs/...` | Bright Data **prebuilt LinkedIn Jobs dataset** (`gd_lpfll7v5hcqtkxl6l`) | LinkedIn is aggressively hostile to generic scraping and requires a session for most postings. The prebuilt dataset returns a fixed schema synchronously and sidesteps that entirely. |
| `join.com/companies/<company>/<id>-...` | **join.com collector** reading the posting's schema.org `JobPosting` block | join.com renders its postings client side, so the Scraper Studio collector reads nothing there and falls back to its training company. Every posting ships a structured JSON-LD block with the title, employer, location and full description, which is both exact and stable across layout changes. |
| everything else | Bright Data **Scraper Studio collector** (`/dca/trigger` → `/dca/dataset`) | Fields are defined in plain language, not CSS selectors, so the collector can be repaired in place when a site's layout shifts. |

All three paths converge on the same `JobPosting` model, so the rest of the
app does not know or care which one ran.

For join.com the tracking query string is dropped (the posting id lives in
the path) and the description HTML is split back into responsibilities,
required and preferred by walking its headings — join.com ships the body as
one blob, and the letter prompt wants discrete bullets. A link to a company
page rather than a specific job is rejected up front.

Any LinkedIn URL shape works — the canonical `/jobs/view/123`, the SEO
`/jobs/view/some-title-at-company-123`, or the one you actually have in
your address bar after clicking a search result:

```
https://www.linkedin.com/jobs/search-results/?currentJobId=4453884018&keywords=...
```

The job id is pulled out of the query string and the URL is rebuilt into
the form the dataset resolves.

## Structured output from Scraper Studio

Every scrape produces two structured objects. First, the posting itself
(`JobPosting`), which is what the letter is written from:

```json
{
  "role_title": "AI Transformation Working Student",
  "company_name": "CHAPTERS Group AG",
  "seniority_level": "Internship",
  "location": "Cologne, North Rhine-Westphalia, Germany",
  "salary": null,
  "responsibilities": ["Build AI Hub use cases for real problems in OpCos ..."],
  "required_qualifications": [],
  "preferred_qualifications": [],
  "raw_source_url": "https://www.linkedin.com/jobs/view/4453884018/"
}
```

Second, and more importantly for reliability, a `CollectorRun` — a record
of what the scrape actually managed to recover, field by field. This is a
real, unedited response:

```json
{
  "run_id": "610438d1-6353-4824-9a19-3498ada2a803",
  "collector_name": "linkedin_job",
  "target_url": "https://www.linkedin.com/jobs/view/4453884018/",
  "status": "partial",
  "fields_recovered": [
    "role_title", "company_name", "seniority_level", "location", "responsibilities"
  ],
  "fields_missing": ["salary"],
  "self_heal_events": [],
  "started_at": "2026-08-21T20:47:37.029079Z",
  "finished_at": "2026-08-21T20:47:40.286977Z"
}
```

Note the status: `partial`, not `success`. The posting listed no salary, so
the run says so rather than rounding up to a green checkmark. Three
statuses are possible:

- `success` — every expected field came back
- `partial` — the scrape landed, some fields were absent from the page
- `failed` — nothing usable came back

These runs are what `/health` renders. The point is that a scraper which
quietly degrades is worse than one that crashes, because the output still
looks plausible. Naming the missing fields is how you tell the difference.

## Reliability and self-healing

Three layers, from cheapest to most involved.

**1. Plain-language field definitions.** The Scraper Studio collector is
defined by descriptions ("the job title / role name for this posting"),
not selectors. When a site renames a CSS class or restructures its DOM, a
selector-based scraper returns empty strings; a description-based one
re-locates the field from what it means. See
[bright-data-collectors.md](./bright-data-collectors.md).

**2. `bdata scraper heal`.** When extraction genuinely regresses, the
Bright Data CLI repairs the collector against the live page rather than
requiring hand-written selectors to be rewritten.

**3. A guard against confidently wrong data.** This one came out of a real
failure during development, and it is the most important of the three.

The Scraper Studio collector was built against Greenhouse. Pointed at
Lever and Ashby — unfamiliar layouts — it did not return empty fields. It
returned *the training company's name*, every time, with the structure
intact. The app happily generated letters addressed to the wrong employer.

A scraper that fails loudly is a bug report. A scraper that fails
plausibly is a user sending an application to the wrong company. So the
router treats a missing `role_title` as proof the scrape did not land, and
refuses rather than guessing:

```python
# backend/app/collectors/router.py
if not posting.role_title:
    raise BrightDataError(
        "Could not read this job posting. Greenhouse, LinkedIn and join.com "
        "links work best; other job boards are not supported yet."
    )
```

The same principle governs company context: when the About-page scrape
returns garbage — which it often does on JS-heavy marketing sites — the
letter is written from the posting and CV alone instead of the request
failing or, worse, absorbing nonsense.

## Setup

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env     # then fill in the values below
uvicorn app.main:app --reload --port 8000
```

`backend/.env`:

```
BRIGHTDATA_API_KEY=              # account API token (Account Settings -> API Tokens)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-sol         # optional, this is the default
BRIGHTDATA_JOB_COLLECTOR_ID=     # c_... from Scraper Studio
BRIGHTDATA_COMPANY_COLLECTOR_ID= # optional; blank disables company context
ALLOWED_ORIGINS=                 # optional, comma-separated extra CORS origins
```

`BRIGHTDATA_API_KEY` must be the **account API token**, not a per-zone
key — it is sent as a bearer token on every Bright Data call. `.env` is
read once at startup, so restart the server after editing it.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:3000. To point the frontend at a deployed backend,
set `NEXT_PUBLIC_API_BASE` — **including the scheme**:

```
NEXT_PUBLIC_API_BASE=https://your-backend.up.railway.app
```

Without `https://` the browser resolves it as a relative path and every
request 404s against the frontend's own domain.

Deployment notes are in [DEPLOY.md](./DEPLOY.md).

## What works, and what does not

**Supported job boards:** LinkedIn (any URL shape), join.com and Greenhouse.
Other boards are rejected with a clear message rather than silently producing a
wrong letter — see the guard above.

**Extraction quality varies by layout.** Some postings return full
responsibilities and qualifications; others return only title, company and
location, in which case the letter leans harder on the CV. Runs report this
as `partial` with the missing fields named.

**Company context is unreliable** on JS-heavy marketing sites, so it is
optional by design and off unless a URL is supplied.

**Contact extraction is regex-based.** It reads the sender block — name,
street, city, phone, email, LinkedIn — out of the uploaded CV for the
letterhead. Unusual layouts may miss a field; missing fields collapse out
of the letterhead rather than printing blanks.

**Letter language follows the posting, not the CV.** A German posting
produces a German letter even if the CV is in English. This is deliberate:
it is the correct behaviour for a German application.

**Expired postings** return HTTP 200 with no job fields. That is detected
and reported as a failed scrape, but it does mean a demo link can die
between rehearsal and recording.

## Repo map

```
backend/app/collectors/     brightdata_client.py   Scraper Studio trigger/poll
                            router.py              picks a path, guards output
                            linkedin_job_collector.py
                            join_job_collector.py  schema.org JobPosting
                            job_posting_collector.py
                            company_context_collector.py
backend/app/services/       cover_letter.py        prompt + JSON-mode call
                            resume_parser.py       PDF / TXT / Markdown
                            contact_details.py     sender block from the CV
                            run_log.py             in-memory run history
frontend/lib/download.ts    DIN 5008 PDF, filenames, ZIP bundling
frontend/components/        form steps, result modal, health view
```

Docs: [bright-data-collectors.md](./bright-data-collectors.md) (field
specs), [DEMO.md](./DEMO.md) (demo script),
[SUBMISSION.md](./SUBMISSION.md) (submission answers),
[design.md](./design.md) (design system).

## Status

- [x] Backend and frontend structure
- [x] Collectors built with the Bright Data CLI, IDs wired into `.env`
- [x] LinkedIn path via the prebuilt Jobs dataset, any URL shape
- [x] Resume parsing (PDF, TXT, Markdown) and contact extraction
- [x] Cover letter generation, one per job URL, language-matched
- [x] DIN 5008 PDF output, individual and ZIP
- [x] Collector health tracking with per-field recovery reporting
- [x] Guard against confidently-wrong extraction
- [x] Deployed: Vercel (frontend) + Railway (backend)
- [x] Demo script and submission notes
