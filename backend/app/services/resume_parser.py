import io

from fastapi import HTTPException
from pypdf import PdfReader


async def extract_resume_text(filename: str, content: bytes) -> str:
    lower = filename.lower()

    if lower.endswith(".pdf"):
        try:
            reader = PdfReader(io.BytesIO(content))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as exc:
            raise HTTPException(status_code=400, detail="Could not read PDF resume") from exc
    elif lower.endswith((".txt", ".md")):
        text = content.decode("utf-8", errors="ignore")
    else:
        raise HTTPException(
            status_code=400, detail="Resume must be a .pdf, .txt, or .md file"
        )

    text = text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Resume appears to be empty")
    return text
