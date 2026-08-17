import type { CollectorRun, CoverLetterResponse } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export async function generateCoverLetter(input: {
  job_url: string;
  company_url: string;
  candidate_name: string;
  candidate_background: string;
}): Promise<CoverLetterResponse> {
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `Request failed with ${res.status}`);
  }
  return res.json();
}

export async function fetchCollectorHealth(limit = 20): Promise<CollectorRun[]> {
  const res = await fetch(`${API_BASE}/api/collector-health?limit=${limit}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load collector health");
  return res.json();
}
