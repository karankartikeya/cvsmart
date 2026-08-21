import json
from dataclasses import dataclass

from openai import AsyncOpenAI

from app.config import settings
from app.models.schemas import CompanyContext, JobPosting

client = AsyncOpenAI(api_key=settings.openai_api_key)


@dataclass
class LetterParts:
    """A letter split into the pieces a formal layout positions separately."""

    body: str
    subject: str = ""
    salutation: str = ""
    closing: str = ""
    language: str = "en"

    def as_plain_text(self) -> str:
        """Flattened form for on-screen display and clipboard copying."""
        blocks = [b for b in (self.salutation, self.body, self.closing) if b]
        return "\n\n".join(blocks)

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

Write in the language of the job posting. A German posting gets a German \
letter using the conventions of a formal Anschreiben, an English posting gets \
an English letter. Do not translate the posting's language into English.

Return JSON with these keys:
- "language": ISO code of the language you wrote in, for example "de" or "en".
- "subject": the subject line. In German use the Bewerbung als ... form \
including the exact role title. In English name the role plainly.
- "salutation": the greeting line, without a trailing blank line. Use a named \
recipient only if one appears in the data, otherwise the neutral form for that \
language, for example "Sehr geehrte Damen und Herren," or "Dear Hiring Team,".
- "body": the letter itself, paragraphs separated by blank lines. No \
salutation, no closing, no signature, no addresses.
- "closing": the sign off only, for example "Mit freundlichen Grüßen" or \
"Best regards". No name after it.
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
) -> LetterParts:
    # Loosen sampling on models that allow it: a slightly higher temperature
    # gives the varied sentence rhythm that keeps letters from reading like a
    # template.
    extra = {"temperature": 0.85} if _supports_temperature(settings.openai_model) else {}

    response = await client.chat.completions.create(
        model=settings.openai_model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": _build_user_prompt(job, company, candidate_name, resume_text),
            },
        ],
        **extra,
    )

    raw = response.choices[0].message.content or "{}"
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        # Should not happen with json_object mode, but a letter with a plain
        # body still beats failing the whole request.
        return LetterParts(body=raw.strip())

    return LetterParts(
        language=str(parsed.get("language") or "en").lower()[:5],
        subject=str(parsed.get("subject") or "").strip(),
        salutation=str(parsed.get("salutation") or "").strip(),
        body=str(parsed.get("body") or "").strip(),
        closing=str(parsed.get("closing") or "").strip(),
    )
