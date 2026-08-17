from openai import AsyncOpenAI

from app.config import settings
from app.models.schemas import CompanyContext, JobPosting

client = AsyncOpenAI(api_key=settings.openai_api_key)

SYSTEM_PROMPT = """You write cover letters that sound like a real person talking, \
not a template. Rules:

- Conversational tone, like explaining to a colleague, not a form letter.
- Never use em dashes. Use periods or commas instead.
- Ground every claim in a specific detail from the job posting or company \
context provided. No generic filler like "I am a hard worker" or "I am \
passionate about innovation" unless tied to something real from the data.
- Reference at least one specific responsibility or qualification from the \
job posting, and at least one specific fact from the company context \
(a real product, mission line, tech, or announcement).
- Keep it to 3-4 short paragraphs. No greeting fluff, no "I am writing to \
express my interest" openers.
"""


def _build_user_prompt(
    job: JobPosting, company: CompanyContext, candidate_name: str, candidate_background: str
) -> str:
    return f"""Candidate name: {candidate_name}
Candidate background: {candidate_background}

Job posting:
- Role: {job.role_title}
- Company: {job.company_name}
- Seniority: {job.seniority_level}
- Location: {job.location}
- Responsibilities: {"; ".join(job.responsibilities) or "not listed"}
- Required qualifications: {"; ".join(job.required_qualifications) or "not listed"}
- Preferred qualifications: {"; ".join(job.preferred_qualifications) or "not listed"}

Company context:
- Mission: {company.mission or "not listed"}
- Recent announcements: {"; ".join(company.recent_announcements) or "not listed"}
- Tech stack mentions: {"; ".join(company.tech_stack_mentions) or "not listed"}
- Culture signals: {"; ".join(company.culture_signals) or "not listed"}

Write the cover letter now."""


async def generate_cover_letter(
    job: JobPosting, company: CompanyContext, candidate_name: str, candidate_background: str
) -> str:
    response = await client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": _build_user_prompt(job, company, candidate_name, candidate_background),
            },
        ],
        temperature=0.7,
    )
    return response.choices[0].message.content or ""
