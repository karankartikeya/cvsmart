# Demo script

Target length: **2 minutes 30 seconds**. Screen recording with voiceover.
Everything below is real — no mockups, no sped-up fake loading.

## Before you record

- [ ] Backend awake: `curl https://cvsmart-production-599d.up.railway.app/api/ping`
- [ ] **Verify every job URL still resolves.** Postings expire without
      warning; two died mid-development. Re-check within an hour of recording.
- [ ] Have a CV ready with a full sender block (name, street, city, phone,
      email, LinkedIn) so the letterhead fills in properly.
- [ ] Do one full dry run first, so the LLM call is warm and you know the
      timing.
- [ ] Browser zoom ~110%, no bookmark bar, no extension icons, no
      notifications.
- [ ] Have `/health` open in a second tab so you are not typing URLs on camera.

## Beat sheet

### 0:00–0:20 — The problem

> "Applying to ten jobs means writing ten cover letters. Paste the ad into
> ChatGPT and you get something that reads like ChatGPT wrote it — and
> increasingly, something an applicant tracking system can flag as
> generated.
>
> But the writing isn't the hard part. The hard part is getting the job
> posting itself, as structured data, off a page built for humans that gets
> redesigned without telling you."

Show the landing page. Do not narrate the UI.

### 0:20–0:50 — Input

Upload the CV. Paste a LinkedIn URL — deliberately the ugly one, straight
from the address bar after clicking a search result:

```
https://www.linkedin.com/jobs/search-results/?currentJobId=4453884018&keywords=...
```

> "This is the URL you actually have. Not the clean one — the one with the
> job id buried in a query string. It gets normalised into the canonical
> form before it reaches Bright Data."

Add a second job so the ZIP download has a reason to exist. Hit generate.

### 0:50–1:20 — The scrape (this is the important part)

While the modal runs:

> "Both jobs are being scraped concurrently through Bright Data. LinkedIn
> goes through the prebuilt LinkedIn Jobs dataset, because LinkedIn blocks
> generic collectors. Anything else goes through a Scraper Studio collector
> where the fields are defined in plain language — 'the job title for this
> posting' — not as CSS selectors.
>
> That distinction is the whole reliability story. A selector breaks when a
> site renames a class. A description doesn't."

### 1:20–1:50 — Structured output

Switch to the `/health` tab. Point at a real run:

> "Every scrape is recorded field by field. This one came back `partial` —
> not `success`. It recovered the title, company, seniority, location and
> responsibilities, and it's telling me the salary wasn't on the page.
>
> That honesty matters more than it sounds. A scraper that quietly degrades
> is worse than one that crashes, because the output still looks fine."

Sample of what is on screen (real, unedited):

```json
{
  "collector_name": "linkedin_job",
  "status": "partial",
  "fields_recovered": ["role_title", "company_name", "seniority_level",
                       "location", "responsibilities"],
  "fields_missing": ["salary"]
}
```

### 1:50–2:15 — Failing loudly, not plausibly

This is the strongest 25 seconds in the demo. Tell it as what happened.

> "During development the Scraper Studio collector was built against
> Greenhouse. When I pointed it at Lever, it didn't return empty fields —
> it returned the *training* company's name, with the record otherwise
> perfectly well-formed. The app cheerfully generated letters addressed to
> the wrong employer.
>
> Healing doesn't fix that, because nothing looks broken. So the router
> treats a missing role title as proof the scrape didn't land, and refuses."

Paste an unsupported board URL on camera. Show the refusal:

> "A scraper that fails loudly is a bug report. A scraper that fails
> plausibly sends someone's application to the wrong company."

### 2:15–2:30 — The output

Back to the results modal. Download one PDF, open it.

> "German DIN 5008 layout — sender block, recipient, dateline, subject
> line. The contact details are read out of the CV, and the letter is
> written in the language of the posting, not the CV. Filename is
> `firstNamelastName_anschreiben_company_position`. Multiple jobs come down
> as a ZIP."

End on the open PDF, not on the browser.

## If something breaks on camera

- **Posting expired** → it reports a failed scrape, which is honest but
  wastes 30 seconds. Use a spare URL, checked the same day.
- **LLM call slow** → the modal shows staged progress; keep narrating the
  scrape, do not sit in silence.
- **Backend cold** → Railway can idle-sleep. Hit `/api/ping` right before
  recording.

## What not to do

- Do not claim self-healing that was not recorded. The Lever story is
  genuine and lands harder than a vague claim would.
- Do not speed up the loading modal. Real timing is a credibility signal.
- Do not read the UI out loud. Narrate the system, show the UI.
