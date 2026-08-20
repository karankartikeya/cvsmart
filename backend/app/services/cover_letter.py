from openai import AsyncOpenAI

from app.config import settings
from app.models.schemas import CompanyContext, JobPosting

client = AsyncOpenAI(api_key=settings.openai_api_key)

SYSTEM_PROMPT = """You write cover letters that sound like a real person talking, \
not a template, and that read as human-written rather than AI-generated. Rules:

- Conversational tone, like explaining to a colleague, not a form letter.
- Never use em dashes. Use periods or commas instead.
- Avoid AI-tell phrasing: no "in today's fast-paced world", no "I am thrilled/\
excited to apply", no "leverage my skills", no rule-of-three adjective stacks \
("innovative, dynamic, and results-driven"), no perfectly symmetrical \
paragraph lengths. Vary sentence length like a real person drafting quickly \
would, short sentences next to longer ones.
- Ground every claim in a specific detail from the resume, job posting, or \
company context provided. No generic filler like "I am a hard worker" or "I \
am passionate about innovation" unless tied to something real from the data.
- Reference at least one specific responsibility or qualification from the \
job posting, and at least one specific detail pulled directly from the resume \
(a project, role, or skill named in it). If a company context section is \
provided, also cite one real fact from it (a product, mission line, tech, or \
announcement). If no company context is given, never invent one: write from \
the job posting and resume alone.
- Keep it to 3-4 short paragraphs. No greeting fluff, no "I am writing to \
express my interest" openers.
"""


def _build_company_section(company: CompanyContext | None) -> str:
    """Company context is optional — many company sites extract poorly, and a
    letter grounded in the job posting alone still beats generic filler."""
    if company is None:
        return ""

    return f"""
Company context:
- Mission: {company.mission or "not listed"}
- Recent announcements: {"; ".join(company.recent_announcements) or "not listed"}
- Tech stack mentions: {"; ".join(company.tech_stack_mentions) or "not listed"}
- Culture signals: {"; ".join(company.culture_signals) or "not listed"}
"""


def _build_user_prompt(
    job: JobPosting, company: CompanyContext | None, candidate_name: str, resume_text: str
) -> str:
    return f"""Candidate name: {candidate_name}
Candidate resume:
{resume_text}

Job posting:
- Role: {job.role_title}
- Company: {job.company_name}
- Seniority: {job.seniority_level}
- Location: {job.location}
- Responsibilities: {"; ".join(job.responsibilities) or "not listed"}
- Required qualifications: {"; ".join(job.required_qualifications) or "not listed"}
- Preferred qualifications: {"; ".join(job.preferred_qualifications) or "not listed"}
{_build_company_section(company)}
Write the cover letter now."""


def _supports_temperature(model: str) -> bool:
    """GPT-5 and later only accept the default temperature, so the parameter
    has to be omitted rather than sent with a custom value."""
    return not model.startswith(("gpt-5", "o1", "o3", "o4"))


async def generate_cover_letter(
    job: JobPosting, company: CompanyContext | None, candidate_name: str, resume_text: str
) -> str:
    # Loosen sampling on models that allow it: a slightly higher temperature
    # gives the varied sentence rhythm that keeps letters from reading like a
    # template.
    extra = {"temperature": 0.85} if _supports_temperature(settings.openai_model) else {}

    response = await client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": _build_user_prompt(job, company, candidate_name, resume_text),
            },
        ],
        **extra,
    )
    return response.choices[0].message.content or ""
