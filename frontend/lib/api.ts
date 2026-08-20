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
    // not JSON, fall through to raw text
  }
  return text || `Request failed with ${res.status}`;
}

export async function fetchCollectorHealth(limit = 20): Promise<CollectorRun[]> {
  const res = await fetch(`${API_BASE}/api/collector-health?limit=${limit}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load collector health");
  return res.json();
}
