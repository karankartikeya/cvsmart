"use client";

import { useState } from "react";
import Link from "next/link";
import { generateCoverLetter } from "@/lib/api";
import type { CoverLetterResponse } from "@/lib/types";
import StepSection from "@/components/StepSection";
import DropzoneUpload from "@/components/DropzoneUpload";
import JobUrlList from "@/components/JobUrlList";

export default function Home() {
  const [resume, setResume] = useState<File | null>(null);
  const [candidateName, setCandidateName] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [jobUrls, setJobUrls] = useState<string[]>([]);
  const [companyUrl, setCompanyUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CoverLetterResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resume) {
      setError("Attach your resume first.");
      return;
    }
    if (jobUrls.length === 0) {
      setError("Add at least one job posting URL.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await generateCoverLetter({
        job_urls: jobUrls,
        company_url: companyUrl,
        candidate_name: candidateName,
        resume,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper-warmth">
      <Nav />
      <main className="mx-auto max-w-3xl px-6">
        <Hero />
        <form onSubmit={handleSubmit} className="space-y-6 pb-20" id="generate">
          <StepSection number={1} title="Drag and drop your CV">
            <DropzoneUpload resume={resume} setResume={setResume} />
            <div className="mt-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-black">Your name</span>
                <input
                  required
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="Jordan Rivera"
                  className="input"
                />
              </label>
            </div>
          </StepSection>

          <StepSection number={2} title="Copy-paste your LinkedIn profile">
            <input
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://www.linkedin.com/in/your-profile"
              className="input"
            />
          </StepSection>

          <StepSection
            number={3}
            title="Copy-paste each job you want to get and click +ADD"
          >
            <JobUrlList
              jobUrls={jobUrls}
              onAdd={(url) => setJobUrls((prev) => [...prev, url])}
              onRemove={(i) => setJobUrls((prev) => prev.filter((_, idx) => idx !== i))}
            />
          </StepSection>

          <StepSection
            number={4}
            title="All set? Click Generate and relax."
            description="We will generate your personalized AI-proof cover letter right away!"
          >
            <label className="mb-4 block">
              <span className="mb-1.5 block text-sm font-medium text-black">
                Company site URL <span className="font-normal text-stone">(optional)</span>
              </span>
              <input
                type="url"
                value={companyUrl}
                onChange={(e) => setCompanyUrl(e.target.value)}
                placeholder="https://company.com/about"
                className="input"
              />
              <span className="mt-1 block text-xs text-stone">
                Adds extra company detail to the letter when the page can be read.
              </span>
            </label>
            <button type="submit" disabled={loading} className="btn-primary w-full text-base">
              {loading ? "Scraping and drafting..." : "GENERATE"}
            </button>
            {error && (
              <p className="mt-3 rounded-lg bg-coral/10 px-4 py-3 text-sm text-coral">{error}</p>
            )}
          </StepSection>
        </form>

        {result && <Result result={result} />}
      </main>
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-10 bg-paper-warmth/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
        <span className="text-[15px] font-semibold tracking-tight text-black">
          CV<span className="text-notion-blue">Cover</span>
        </span>
        <nav className="flex items-center gap-2">
          <Link href="/health" className="btn-text">
            Collector health
          </Link>
          <a href="#generate" className="btn-primary">
            Generate
          </a>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="pt-12 pb-10 text-center">
      <p className="font-handwritten mx-auto max-w-lg text-xl leading-snug text-graphite">
        Tired of always the same AI-generated cover letters? Ours are
        proof-read, original and low detection, just like grandma used to do
        them.
        <span className="mt-1 block text-lg text-notion-blue">— made with love</span>
      </p>
      <h1 className="mt-6 text-[54px] leading-none font-bold tracking-[-0.02em] text-black">
        CV COVER
      </h1>
      <p className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-black/40">
        The all-in-one website for your job search
      </p>
    </section>
  );
}

function Result({ result }: { result: CoverLetterResponse }) {
  return (
    <div className="space-y-8 pb-20">
      {result.results.map((r, i) => (
        <section key={r.job_url + i} className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-stone">
              Cover letter {result.results.length > 1 ? `#${i + 1}` : ""} —{" "}
              {r.job_posting.role_title ?? r.job_url}
            </h2>
            <CopyButton text={r.cover_letter} />
          </div>
          <div className="font-editorial whitespace-pre-wrap text-[15px] leading-[1.65] text-black">
            {r.cover_letter}
          </div>
          <dl className="mt-4 space-y-1.5 border-t border-black/8 pt-4 text-sm text-graphite">
            <Row k="Role" v={r.job_posting.role_title} />
            <Row k="Company" v={r.job_posting.company_name} />
            <Row k="Seniority" v={r.job_posting.seniority_level} />
            <Row k="Location" v={r.job_posting.location} />
            <Row k="Salary" v={r.job_posting.salary} />
          </dl>
        </section>
      ))}

      {result.company_context && (
        <section className="card">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone">
            Company context extracted
          </h3>
          <dl className="space-y-1.5 text-sm text-graphite">
            <Row k="Mission" v={result.company_context.mission} />
            <Row
              k="Announcements"
              v={result.company_context.recent_announcements.join(", ") || null}
            />
            <Row k="Tech stack" v={result.company_context.tech_stack_mentions.join(", ") || null} />
          </dl>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone">
          Collector runs
        </h3>
        <div className="space-y-2">
          {result.runs.map((run) => (
            <div key={run.run_id} className="card py-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-black">{run.collector_name}</span>
                <StatusBadge status={run.status} />
              </div>
              {run.self_heal_events.length > 0 && (
                <p className="mt-1 text-xs text-coral">
                  Self-healed {run.self_heal_events.length} field(s):{" "}
                  {run.self_heal_events.map((e) => e.field).join(", ")}
                </p>
              )}
              {run.fields_missing.length > 0 && (
                <p className="mt-1 text-xs text-stone">Missing: {run.fields_missing.join(", ")}</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost text-xs"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function Row({ k, v }: { k: string; v: string | null }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 text-stone">{k}</dt>
      <dd>{v || "—"}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    success: "bg-green-100 text-green-700",
    partial: "bg-marigold/20 text-[#8a5c00]",
    failed: "bg-coral/10 text-coral",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? ""}`}>
      {status}
    </span>
  );
}

function Footer() {
  return (
    <footer className="border-t border-black/8 py-10 text-center text-xs text-stone">
      Built for the Into the Scrape-Verse hackathon. Powered by Bright Data
      Scraper Studio.
    </footer>
  );
}
