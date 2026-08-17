# Scraper Studio collector setup

Two collectors, created in the Bright Data Scraper Studio dashboard
(https://brightdata.com → Scraper Studio → New Collector). Each field
below is defined with a **plain-language description**, not a CSS
selector — this is what gives self-healing: when a target site's layout
changes, Scraper Studio re-locates the field from its description instead
of failing on a stale selector.

After creating each collector, copy its dataset/collector ID into
`backend/.env`:

```
BRIGHTDATA_JOB_COLLECTOR_ID=<id from job posting collector>
BRIGHTDATA_COMPANY_COLLECTOR_ID=<id from company context collector>
```

## Collector 1: job_posting

Target: any job posting URL (Greenhouse, Lever, LinkedIn, company career page).

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

Target: a company's About page, blog, changelog, or careers/culture page.

| Field | Type | Description (paste into Scraper Studio) |
|---|---|---|
| company_name | text | The name of the company this page belongs to |
| mission | text | The company's stated mission, purpose, or "what we do" summary |
| recent_announcements | list of text | Recent product launches, news, blog post titles, or announcements mentioned on the page |
| tech_stack_mentions | list of text | Any programming languages, frameworks, or technologies mentioned as part of their stack or engineering culture |
| culture_signals | list of text | Statements about company culture, values, work style, or team environment |

## Demoing self-healing

For the hackathon demo:

1. Run collector against a live career page, show the structured JSON output.
2. Open Scraper Studio's field editor, show the plain-language description
   (not a selector) driving extraction.
3. Explain: if the target site ships a redesign (new DOM structure, renamed
   CSS classes, restructured layout), a traditional selector-based scraper
   breaks silently. Scraper Studio re-reads the page against the field
   description and re-locates the data.
4. If Scraper Studio's dashboard shows a self-heal / re-extraction event
   log, screen-record one. Otherwise, narrate it against the field
   description approach and point to the `self_heal_events` surfaced in
   the app's own `/health` page (populated from `_self_heal_events` in the
   collector response, if Bright Data returns that metadata — confirm the
   exact response shape once the collector is live and adjust
   `job_posting_collector.py` / `company_context_collector.py` accordingly).
