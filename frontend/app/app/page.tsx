"use client";

import { useState } from "react";
import { track } from "@vercel/analytics";
import { generateCoverLetter } from "@/lib/api";
import type { CoverLetterResponse } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import StepSection from "@/components/StepSection";
import DropzoneUpload from "@/components/DropzoneUpload";
import JobUrlList from "@/components/JobUrlList";
import ResultModal from "@/components/ResultModal";
import UsagePill from "@/components/UsagePill";

export default function GeneratorPage() {
  const { user } = useAuth();
  const anonymousMaxJobUrls = 2;
  const [resume, setResume] = useState<File | null>(null);
  const [candidateName, setCandidateName] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [jobUrls, setJobUrls] = useState<string[]>([]);
  const [companyUrl, setCompanyUrl] = useState("");
  const [loading, setLoading] = useState(false);
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
    <div>
      <main className="mx-auto max-w-3xl px-6">
        <div className="pt-10 pb-4">
          <UsagePill />
        </div>
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
            description={
              !user
                ? `Free tier: up to ${anonymousMaxJobUrls} jobs per generation — sign up for more.`
                : undefined
            }
          >
            <JobUrlList
              jobUrls={jobUrls}
              onAdd={(url) => setJobUrls((prev) => [...prev, url])}
              onRemove={(i) => setJobUrls((prev) => prev.filter((_, idx) => idx !== i))}
              maxUrls={user ? undefined : anonymousMaxJobUrls}
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
