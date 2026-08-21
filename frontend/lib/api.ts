import type { CollectorRun, CoverLetterResponse } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export async function generateCoverLetter(input: {
  job_urls: string[];
  company_url: string;
  candidate_name: string;
  resume: File;
}): Promise<CoverLetterResponse> {
  const formData = new FormData();
  for (const url of input.job_urls) {
    formData.append("job_urls", url);
  }
  formData.append("company_url", input.company_url);
  formData.append("candidate_name", input.candidate_name);
  formData.append("resume", input.resume);

  const res = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res));
  }
  return res.json();
}

async function extractErrorMessage(res: Response): Promise<string> {
  const text = await res.text();

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed.detail === "string") return parsed.detail;
  } catch {
    // Not JSON. Most often that means the request never reached the API and
    // something else answered with an HTML page, so fall through.
  }

  // A misconfigured API base sends requests to the site itself, which replies
  // with a whole HTML document. Showing that verbatim is useless, so name the
  // likely cause instead.
  if (text.trimStart().startsWith("<")) {
    return res.status === 404
      ? "Could not reach the API. Check that NEXT_PUBLIC_API_BASE points at the backend and includes https://."
      : `The server returned an unexpected response (${res.status}).`;
  }

  const trimmed = text.trim();
  if (!trimmed) return `Request failed with ${res.status}.`;

  // Guard against any other oversized body reaching the modal.
  return trimmed.length > 300 ? `${trimmed.slice(0, 300)}...` : trimmed;
}

export async function fetchCollectorHealth(limit = 20): Promise<CollectorRun[]> {
  const res = await fetch(`${API_BASE}/api/collector-health?limit=${limit}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load collector health");
  return res.json();
}
