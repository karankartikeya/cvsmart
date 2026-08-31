# Bright Data collector setup

Three ways a job posting gets collected, plus the field specs for each.

| Path | Used for | Mechanism |
|---|---|---|
| Scraper Studio collector | Greenhouse and other job boards | `POST /dca/trigger` → poll `GET /dca/dataset` |
| Prebuilt LinkedIn Jobs dataset | `linkedin.com/jobs/*` | `POST /datasets/v3/scrape`, synchronous |
| join.com schema.org collector | `join.com/companies/<company>/<id>-*` | Fetch the posting, read its JSON-LD `JobPosting` block |

The first two are Bright Data. The split exists because LinkedIn requires a session
for most postings and blocks generic collectors; the prebuilt dataset
(`gd_lpfll7v5hcqtkxl6l`) handles that and returns a fixed schema in one
call. Everything else goes through Scraper Studio, where the value is that
fields are described rather than selected.

join.com needs neither: nothing to configure, no collector id. Its postings
render client side, so the Scraper Studio collector reads nothing there and
falls back to its training company (see the `role_title` guard in
`router.py`) — but every posting embeds a complete schema.org `JobPosting`
block. `join_job_collector.py` reads that directly, which is exact and
survives layout changes for free. Company-page links, which name no
specific job, are rejected before the fetch.

## Credentials

`BRIGHTDATA_API_KEY` must be the **account API token** (Account Settings →
API Tokens), not a per-zone key. It is sent as a bearer token on every
call — `/dca/trigger`, `/dca/dataset`, and `/datasets/v3/scrape` alike.

Collector IDs start with `c_` and are on each collector's overview page:

```
BRIGHTDATA_JOB_COLLECTOR_ID=c_xxxxxxxxxxxxxxxx
BRIGHTDATA_COMPANY_COLLECTOR_ID=c_xxxxxxxxxxxxxxxx
```

## Creating collectors with the CLI

```bash
npx -p @brightdata/cli bdata scraper create \
  --name job_posting \
  --description "Extract the job title, hiring company, seniority level, location, salary, responsibilities, required qualifications and preferred qualifications from a job posting page."

npx -p @brightdata/cli bdata scraper run  <collector_id> --url <target_url>
npx -p @brightdata/cli bdata scraper heal <collector_id>
npx -p @brightdata/cli bdata scraper approve <collector_id>
```

**Keep descriptions short.** A long, detailed description is rejected with
a bare `Invalid description` (HTTP 400), which reads like an auth or
account problem and is not. Several 25-minute builds were burned on this
during development before the cause was clear. Short descriptions rebuild
in under a minute.

## Collector 1: job_posting

Target: a job posting URL. Built and verified against Greenhouse.

| Field | Type | Description (paste into Scraper Studio) |
|---|---|---|
| role_title | text | The job title / role name for this posting |
| company_name | text | The name of the company hiring for this role |
| seniority_level | text | The seniority or experience level implied or stated (e.g. junior, mid, senior, staff, intern) |
| location | text | The work location, including whether it's remote, hybrid, or onsite, and city/country if listed |
| salary | text | The salary range or compensation info if listed on the page, otherwise leave empty |
| responsibilities | list of text | The list of job responsibilities or "what you'll do" bullet points |
| required_qualifications | list of text | The list of required or "must have" qualifications, skills, or experience |
| preferred_qualifications | list of text | The list of preferred, "nice to have", or bonus qualifications |

## Collector 2: company_context

Target: a company's About page, blog, changelog, or careers page. Optional
— leave `BRIGHTDATA_COMPANY_COLLECTOR_ID` blank to disable it.

| Field | Type | Description (paste into Scraper Studio) |
|---|---|---|
| company_name | text | The name of the company this page belongs to |
| mission | text | The company's stated mission, purpose, or "what we do" summary |
| recent_announcements | list of text | Recent product launches, news, blog post titles, or announcements mentioned on the page |
| tech_stack_mentions | list of text | Any programming languages, frameworks, or technologies mentioned as part of their stack or engineering culture |
| culture_signals | list of text | Statements about company culture, values, work style, or team environment |

This one is unreliable in practice. Marketing sites are JS-heavy and the
extraction frequently returns noise, so company context is treated as a
bonus: when it is clean it enriches the letter, when it is not the letter
is written from the posting and CV alone.

## LinkedIn path

No collector to configure. `linkedin_job_collector.py` calls:

```
POST https://api.brightdata.com/datasets/v3/scrape
     ?dataset_id=gd_lpfll7v5hcqtkxl6l&format=json
Body: [{"url": "https://www.linkedin.com/jobs/view/4453884018"}]
```

The dataset resolves only the numeric `/jobs/view/<id>` form, so
`_canonical_url()` normalises whatever the user pasted first:

- `/jobs/search-results/?currentJobId=123` → id from the query string
- `/jobs/view/some-title-at-company-123` → id from the path
- `/jobs/view/123` → unchanged

A LinkedIn jobs URL with no id in any of those positions names no
particular job, and is rejected before a doomed request is sent.

Response fields are mapped onto our own `JobPosting`:

| Dataset field | `JobPosting` field |
|---|---|
| `job_title` | `role_title` |
| `company_name` | `company_name` |
| `job_seniority_level` | `seniority_level` |
| `job_location` | `location` |
| `base_salary` / `salary_standards` | `salary` |
| `job_summary` | `responsibilities` (split into paragraphs) |

An expired or restricted posting still returns HTTP 200, just with none of
the job fields, so a missing `job_title` is treated as a failed scrape.

## Self-healing

**What the plain-language approach buys you.** Fields are defined by
description, not by CSS selector. When a target ships a redesign — renamed
classes, restructured DOM — a selector-based scraper returns empty strings
and keeps reporting success. A description-based one re-locates the field
from what it means.

**What to do when extraction regresses:**

```bash
npx -p @brightdata/cli bdata scraper heal <collector_id>
npx -p @brightdata/cli bdata scraper run  <collector_id> --url <target_url>
npx -p @brightdata/cli bdata scraper approve <collector_id>
```

**Where healing is not enough, and what we did about it.** The honest
result from development: the `job_posting` collector was built against
Greenhouse, and pointed at Lever and Ashby it did not fail — it returned
the *training* company's name with the record otherwise well-formed. `heal`
does not fix that, because from the collector's point of view nothing is
broken; it found a company name.

So the application layer carries the last line of defence
(`backend/app/collectors/router.py`): a missing `role_title` is treated as
proof the scrape did not land, and the request is refused rather than
producing a letter addressed to the wrong employer.

This is the design position worth stating plainly: a scraper that fails
loudly is a bug report, a scraper that fails plausibly is a user sending an
application to the wrong company. Self-healing raises the first kind. The
second kind has to be caught by validating that what came back is about the
page you asked for.

**What `/health` shows.** Every run is recorded as a `CollectorRun` with
`status`, `fields_recovered`, `fields_missing`, and `self_heal_events`,
rendered at `/health`. Runs are kept in memory, so the list resets when the
backend restarts.
