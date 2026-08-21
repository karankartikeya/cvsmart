"use client";

import { useState } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";
import { generateCoverLetter } from "@/lib/api";
import type { CoverLetterResponse } from "@/lib/types";
import StepSection from "@/components/StepSection";
import DropzoneUpload from "@/components/DropzoneUpload";
import JobUrlList from "@/components/JobUrlList";
import ResultModal from "@/components/ResultModal";

export default function Home() {
  const [resume, setResume] = useState<File | null>(null);
  const [candidateName, setCandidateName] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [jobUrls, setJobUrls] = useState<string[]>([]);
  const [companyUrl, setCompanyUrl] = useState("");
  const [loading, setLoading] = useState(false);
  // Form validation stays inline next to the button; anything that goes wrong
  // during the request itself is shown in the modal.
  const [formError, setFormError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [result, setResult] = useState<CoverLetterResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resume) {
      setFormError("Attach your resume first.");
      return;
    }
    if (jobUrls.length === 0) {
      setFormError("Add at least one job posting URL.");
      return;
    }

    setFormError(null);
    setRequestError(null);
    setResult(null);
    setLoading(true);
    setModalOpen(true);

    const startedAt = Date.now();
    track("generate_started", {
      job_count: jobUrls.length,
      has_company_url: Boolean(companyUrl),
      resume_type: resume.name.split(".").pop()?.toLowerCase() ?? "unknown",
    });

    try {
      const res = await generateCoverLetter({
        job_urls: jobUrls,
        company_url: companyUrl,
        candidate_name: candidateName,
        resume,
      });
      setResult(res);
      track("generate_succeeded", {
        letters: res.results.length,
        // Bucketed rather than exact so the numbers stay readable in the
        // Vercel dashboard.
        seconds: Math.round((Date.now() - startedAt) / 5) * 5,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setRequestError(message);
      track("generate_failed", { reason: message.slice(0, 100) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-3xl px-6">
        <Hero />
        <form onSubmit={handleSubmit} className="space-y-6 pb-20" id="generate">
          <StepSection number={1} title="Drag and drop your CV">
            <DropzoneUpload resume={resume} setResume={setResume} />
            <div className="mt-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink">Your name</span>
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
              <span className="mb-1.5 block text-sm font-medium text-ink">
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
              {loading ? "Generating..." : "GENERATE"}
            </button>
            {formError && (
              <p className="mt-3 rounded-lg bg-coral/10 px-4 py-3 text-sm text-coral">
                {formError}
              </p>
            )}
          </StepSection>
        </form>

        {result && !modalOpen && (
          <div className="pb-20">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="btn-ghost w-full py-3"
            >
              View your {result.results.length > 1 ? "cover letters" : "cover letter"} again
            </button>
          </div>
        )}
      </main>
      <Footer />

      <ResultModal
        open={modalOpen}
        loading={loading}
        error={requestError}
        result={result}
        candidateName={candidateName}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-10 border-b border-hairline bg-cream/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
        <span className="text-[16px] font-extrabold tracking-tight text-ink">
          CV<span className="text-gradient">Cover</span>
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
    <section className="pt-14 pb-12 text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-flame/25 bg-white/70 px-4 py-1.5 text-xs font-semibold text-magenta backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-flame" />
        Free · No account · No paywall
      </span>

      <h1 className="mt-6 text-[64px] leading-[0.95] font-extrabold tracking-[-0.035em] sm:text-[78px]">
        <span className="text-gradient">CV COVER</span>
      </h1>

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-stone">
        The all-in-one website for your job search
      </p>

      <p className="font-handwritten mx-auto mt-7 max-w-lg text-xl leading-snug text-graphite">
        Tired of always the same AI-generated cover letters? Ours are
        proof-read, original and low detection. Made with love, just like grandma used to do them.
        <span className="mt-1 block text-lg text-magenta">— made with love</span>
      </p>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-hairline py-10 text-center text-xs text-stone">
      Built for the Into the Scrape-Verse hackathon. Powered by Bright Data
      Scraper Studio.
    </footer>
  );
}
