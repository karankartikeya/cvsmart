"use client";

import { useState } from "react";
import Link from "next/link";
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

    try {
      const res = await generateCoverLetter({
        job_urls: jobUrls,
        company_url: companyUrl,
        candidate_name: candidateName,
        resume,
      });
      setResult(res);
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : "Something went wrong");
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

function Footer() {
  return (
    <footer className="border-t border-black/8 py-10 text-center text-xs text-stone">
      Built for the Into the Scrape-Verse hackathon. Powered by Bright Data
      Scraper Studio.
    </footer>
  );
}
