# Submission notes

Prepared answers for the Into the Scrape-Verse submission form. Adjust
wording to whatever the form actually asks; the substance is here.

## Links

| | |
|---|---|
| Repository | https://github.com/karankartikeya/cvsmart |
| Live app | https://cvcover.vercel.app |
| Backend health | https://cvsmart-production-599d.up.railway.app/api/ping |
| Collector health view | https://cvcover.vercel.app/health |
| Demo video | *(add once recorded — see [DEMO.md](./DEMO.md))* |

## One-line description

Upload a CV, paste job links, get a formal cover letter per posting — each
one written from the real job ad, scraped as structured data through Bright
Data.

## What it does (short)

CV Cover turns a CV plus a list of job URLs into one tailored cover letter
per posting, downloadable as a DIN 5008 formatted PDF or a ZIP. No account,
no payment.

Each job URL is scraped through Bright Data into a structured `JobPosting`.
The CV is parsed server-side for both its content and its sender block. Both
feed a prompt that drafts a letter citing specifics from the actual posting,
in the posting's own language.

## The problem it solves

Applying to ten jobs means writing ten cover letters. The LLM shortcut —
paste the ad into a chatbot — produces letters with a recognisable shape and
an increasingly detectable statistical fingerprint, which applicant tracking
systems now screen for.

But the writing is the easy half. The hard half is acquiring the job posting
reliably as structured data from pages built for human eyes and redesigned
without notice. That acquisition problem is what the project is built
around.

## How Scraper Studio is used

Two Bright Data paths, converging on one schema:

1. **Scraper Studio collector** for Greenhouse and general job boards.
   `POST /dca/trigger?collector=<id>&queue_next=1` returns a
   `collection_id`; `GET /dca/dataset?id=<id>` is polled until it returns an
   array. Eight fields, each defined by a plain-language description rather
   than a CSS selector.
2. **Prebuilt LinkedIn Jobs dataset** (`gd_lpfll7v5hcqtkxl6l`) via
   `POST /datasets/v3/scrape`, because LinkedIn blocks generic collectors and
   requires a session for most postings.

Collectors were created and repaired with the Bright Data CLI (`bdata
scraper create` / `run` / `heal` / `approve`), not by hand-writing
selectors. Field specs: [bright-data-collectors.md](./bright-data-collectors.md).

## Structured output

Every scrape yields a `JobPosting` (title, company, seniority, location,
salary, responsibilities, required and preferred qualifications, source URL)
and a `CollectorRun` recording what was actually recovered:

```json
{
  "run_id": "610438d1-6353-4824-9a19-3498ada2a803",
  "collector_name": "linkedin_job",
  "target_url": "https://www.linkedin.com/jobs/view/4453884018/",
  "status": "partial",
  "fields_recovered": ["role_title", "company_name", "seniority_level",
                       "location", "responsibilities"],
  "fields_missing": ["salary"],
  "self_heal_events": [],
  "started_at": "2026-08-21T20:47:37.029079Z",
  "finished_at": "2026-08-21T20:47:40.286977Z"
}
```

Real, unedited. `partial` because the posting listed no salary — the run
says so instead of rounding up to success. These records are rendered at
`/health`.

## Reliability and self-healing

Three layers:

1. **Description-based fields.** Extraction is driven by what a field means,
   so a renamed CSS class or restructured DOM does not silently produce
   empty strings.
2. **`bdata scraper heal`.** Repairs the collector against the live page when
   extraction genuinely regresses.
3. **A guard against confidently wrong output.** The collector was built
   against Greenhouse; pointed at Lever it returned the *training* company's
   name with the record otherwise well-formed, generating letters addressed
   to the wrong employer. Healing does not catch that, because nothing
   appears broken. So the router treats a missing `role_title` as proof the
   scrape did not land and refuses the request.

The position, stated plainly: a scraper that fails loudly is a bug report; a
scraper that fails plausibly is a user sending an application to the wrong
company. Self-healing addresses the first. The second has to be caught by
validating that what came back is about the page you asked for.

The same principle applies to company context, which is unreliable on
JS-heavy marketing sites and therefore optional: when it is noisy the letter
is written from the posting and CV alone rather than absorbing nonsense.

## Tech stack

- **Scraping:** Bright Data Scraper Studio + prebuilt LinkedIn Jobs dataset, Bright Data CLI
- **Backend:** FastAPI, httpx, pydantic, concurrent scrapes via `asyncio.gather`
- **LLM:** OpenAI `gpt-5.6-sol` in JSON mode, returning structured letter parts
- **Frontend:** Next.js 16, Tailwind v4, jsPDF + JSZip for client-side PDF/ZIP
- **Deploy:** Vercel (frontend) + Railway (backend), Vercel Analytics + Speed Insights

## Honest limitations

Worth stating rather than hiding — the health view exposes them anyway.

- Supported boards are LinkedIn, join.com and Greenhouse. Others are refused with a
  clear message rather than silently mis-scraped.
- Extraction completeness varies by layout; incomplete runs report `partial`
  with the missing fields named.
- Company context is off by default.
- Contact extraction is regex-based; unusual CV layouts may miss a field, and
  missing fields collapse out of the letterhead rather than printing blanks.
- Run history is in-memory and resets on backend restart.

---

## LinkedIn challenge post

Draft for the `@WeMakeDevs` / `@Bright Data` social post. Trim to taste.

> Spent this week building **CV Cover** for the Into the Scrape-Verse
> hackathon: upload a CV, paste job links, get a formal cover letter per
> posting — written from the actual job ad, not a guess.
>
> The interesting bug wasn't in the writing. It was in the scraping.
>
> My Bright Data Scraper Studio collector was built against Greenhouse. When
> I pointed it at a different job board, it didn't return empty fields. It
> returned the **training company's name**, with the record otherwise
> perfectly well-formed — so the app happily generated letters addressed to
> the wrong employer.
>
> That's the failure mode nobody warns you about. A scraper that crashes is
> a bug report. A scraper that fails *plausibly* is a user sending their
> application to the wrong company.
>
> Self-healing doesn't catch it, because from the collector's point of view
> nothing is broken — it found a company name. So the fix was at the
> application layer: treat a missing role title as proof the scrape didn't
> land, and refuse rather than guess.
>
> Every scrape now reports field by field what it actually recovered, and
> the app surfaces `partial` runs honestly instead of rounding up to a green
> checkmark.
>
> Live: cvcover.vercel.app
>
> @WeMakeDevs @Bright Data #ScrapeVerse
