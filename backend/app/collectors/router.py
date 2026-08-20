"""
Chooses a collector based on the job URL.

LinkedIn goes through Bright Data's prebuilt jobs dataset; everything else
goes through our Scraper Studio collector, which was trained on Greenhouse.
"""

from app.collectors.brightdata_client import BrightDataError
from app.collectors.job_posting_collector import collect_job_posting
from app.collectors.linkedin_job_collector import collect_linkedin_job, is_linkedin_job_url
from app.models.schemas import CollectorRun, JobPosting


async def collect_job(url: str) -> tuple[JobPosting, CollectorRun]:
    if is_linkedin_job_url(url):
        return await collect_linkedin_job(url)

    posting, run = await collect_job_posting(url)

    # The Scraper Studio collector was trained on Greenhouse. On an unfamiliar
    # layout it can return the training company rather than the real one, which
    # would put the wrong employer in the letter. A missing role title is the
    # reliable signal that the scrape did not really land, so fail loudly
    # instead of handing back plausible-looking but wrong data.
    if not posting.role_title:
        raise BrightDataError(
            "Could not read this job posting. Greenhouse and LinkedIn links work "
            "best; other job boards are not supported yet."
        )

    return posting, run
