"use client";

import { useState } from "react";
import Link from "next/link";
import { generateCoverLetter } from "@/lib/api";
import type { CoverLetterResponse } from "@/lib/types";

export default function Home() {
  const [jobUrl, setJobUrl] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [candidateBackground, setCandidateBackground] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CoverLetterResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await generateCoverLetter({
        job_url: jobUrl,
        company_url: companyUrl,
        candidate_name: candidateName,
        candidate_background: candidateBackground,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Job Application Intelligence
          </h1>
          <Link
            href="/health"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            Collector health →
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Job posting URL">
            <input
              required
              type="url"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://boards.greenhouse.io/company/jobs/12345"
              className="input"
            />
          </Field>
          <Field label="Company site URL (about / blog / careers)">
            <input
              required
              type="url"
              value={companyUrl}
              onChange={(e) => setCompanyUrl(e.target.value)}
              placeholder="https://company.com/about"
              className="input"
            />
          </Field>
          <Field label="Your name">
            <input
              required
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Your background (2-3 sentences)">
            <textarea
              required
              value={candidateBackground}
              onChange={(e) => setCandidateBackground(e.target.value)}
              rows={4}
              className="input"
            />
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-zinc-950 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {loading ? "Scraping and drafting..." : "Generate cover letter"}
          </button>
        </form>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {result && <Result result={result} />}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      {children}
    </label>
  );
}

function Result({ result }: { result: CoverLetterResponse }) {
  return (
    <div className="mt-10 space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Cover letter
        </h2>
        <div className="whitespace-pre-wrap rounded-lg border border-zinc-200 bg-white p-6 text-sm leading-relaxed text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
          {result.cover_letter}
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Job posting extracted
          </h3>
          <dl className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
            <Row k="Role" v={result.job_posting.role_title} />
            <Row k="Company" v={result.job_posting.company_name} />
            <Row k="Seniority" v={result.job_posting.seniority_level} />
            <Row k="Location" v={result.job_posting.location} />
            <Row k="Salary" v={result.job_posting.salary} />
          </dl>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Company context extracted
          </h3>
          <dl className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
            <Row k="Mission" v={result.company_context.mission} />
            <Row
              k="Announcements"
              v={result.company_context.recent_announcements.join(", ") || null}
            />
            <Row k="Tech stack" v={result.company_context.tech_stack_mentions.join(", ") || null} />
          </dl>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Collector runs
        </h3>
        <div className="space-y-2">
          {result.runs.map((run) => (
            <div
              key={run.run_id}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {run.collector_name}
                </span>
                <StatusBadge status={run.status} />
              </div>
              {run.self_heal_events.length > 0 && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  Self-healed {run.self_heal_events.length} field(s):{" "}
                  {run.self_heal_events.map((e) => e.field).join(", ")}
                </p>
              )}
              {run.fields_missing.length > 0 && (
                <p className="mt-1 text-xs text-zinc-500">
                  Missing: {run.fields_missing.join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string | null }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 text-zinc-500 dark:text-zinc-500">{k}</dt>
      <dd>{v || "—"}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    success: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
    partial: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    failed: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? ""}`}>
      {status}
    </span>
  );
}
