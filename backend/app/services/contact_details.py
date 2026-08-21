"""
Pulls the sender block out of a resume.

A formal cover letter needs the applicant's own address and contact details in
the letterhead, which the form never asks for. Rather than adding fields, these
are read back out of the CV the user already uploaded.

Everything here is best effort: a missing field is left blank and the PDF
simply omits that line.
"""

import re

from app.models.schemas import ContactDetails

EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")

# Deliberately permissive: international formats vary and a false positive is
# less costly than dropping a real number.
PHONE_RE = re.compile(r"(?:\+\d{1,3}[\s-]?)?(?:\(\+?\d{1,4}\)[\s-]?)?\d[\d\s()/-]{7,17}\d")

LINKEDIN_RE = re.compile(r"(?:https?://)?(?:www\.)?linkedin\.com/in/[\w%-]+", re.I)

# German and Austrian postcodes are five digits, Swiss four.
POSTCODE_CITY_RE = re.compile(r"^\d{4,5}\s+[A-Za-zÄÖÜäöüß][\w.\-\s]{1,40}$")

STREET_RE = re.compile(
    r"^[A-Za-zÄÖÜäöüß][\w.\-\s]{2,40}"
    r"(?:stra(?:ss|ß)e|str\.|weg|allee|platz|gasse|ring|damm|ufer|road|street|avenue|lane)"
    r"\s*\d+[a-zA-Z]?$",
    re.I,
)


def _clean_phone(value: str) -> str:
    collapsed = re.sub(r"\s+", " ", value).strip(" -/")
    digits = re.sub(r"\D", "", collapsed)
    # Guard against catching dates, postcodes or ID numbers.
    return collapsed if 7 <= len(digits) <= 15 else ""


def extract_contact_details(resume_text: str, fallback_name: str) -> ContactDetails:
    lines = [line.strip() for line in resume_text.splitlines() if line.strip()]
    head = lines[:30]  # Contact blocks sit at the top of virtually every CV.
    joined_head = "\n".join(head)

    email_match = EMAIL_RE.search(resume_text)
    linkedin_match = LINKEDIN_RE.search(resume_text)

    phone = ""
    for line in head:
        # Skip lines that are clearly an address or an email.
        if EMAIL_RE.search(line):
            continue
        candidate = PHONE_RE.search(line)
        if candidate:
            phone = _clean_phone(candidate.group())
            if phone:
                break

    street = ""
    city = ""
    for line in head:
        if not street and STREET_RE.match(line):
            street = line
        elif not city and POSTCODE_CITY_RE.match(line):
            city = line
        if street and city:
            break

    return ContactDetails(
        full_name=fallback_name.strip(),
        street=street,
        city=city,
        phone=phone,
        email=email_match.group() if email_match else "",
        linkedin=linkedin_match.group() if linkedin_match else "",
        # The line under the name, for example "Informatik B.Sc. | Project
        # Manager". Taken from the CV only when it looks like a title rather
        # than contact data.
        headline=_find_headline(head, fallback_name),
    )


def _find_headline(head: list[str], fallback_name: str) -> str:
    name_lower = fallback_name.strip().lower()
    for index, line in enumerate(head[:6]):
        if line.lower() == name_lower and index + 1 < len(head):
            candidate = head[index + 1]
            if (
                not EMAIL_RE.search(candidate)
                and not LINKEDIN_RE.search(candidate)
                and not POSTCODE_CITY_RE.match(candidate)
                and not STREET_RE.match(candidate)
                and len(candidate) <= 80
            ):
                return candidate
    return ""
