"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { downloadAllAsZip, downloadLetterPdf } from "@/lib/download";
import type { ContactDetails, CoverLetterResponse, CoverLetterResult } from "@/lib/types";
import LoadingAnimation, { type AnimationPhase } from "./LoadingAnimation";

interface ResultModalProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  result: CoverLetterResponse | null;
  candidateName: string;
  onClose: () => void;
}

export default function ResultModal({
  open,
  loading,
  error,
  result,
  candidateName,
  onClose,
}: ResultModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape, but not while a generation is still running, so a stray
  // keypress cannot discard work in progress.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  // Stop the page behind the modal from scrolling while it is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-plum/45 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={loading ? "Generating cover letters" : "Your cover letters"}
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_24px_60px_rgba(43,26,23,0.28)]"
      >
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onClose={onClose} />
        ) : result ? (
          <ResultState
            key={result.results.map((r) => r.job_url).join("|")}
            result={result}
            candidateName={candidateName}
            onClose={onClose}
          />
        ) : null}
      </div>
    </div>
  );
}

// Each stage names what the backend is doing and which animation fits it:
// searching while the posting is scraped, printing once drafting starts.
const LOADING_STEPS: { label: string; phase: AnimationPhase }[] = [
  { label: "Reading the job posting", phase: "searching" },
  { label: "Matching it against your CV", phase: "searching" },
  { label: "Drafting your letter", phase: "printing" },
  { label: "Checking it does not read like AI", phase: "printing" },
];

function LoadingState() {
  const [step, setStep] = useState(0);

  // The request gives no progress events, so step through the stages on a
  // timer to show that work is happening. The last one stays put until the
  // response lands.
  useEffect(() => {
    const timer = setInterval(() => {
      setStep((current) => Math.min(current + 1, LOADING_STEPS.length - 1));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center px-8 py-14 text-center">
      <LoadingAnimation phase={LOADING_STEPS[step].phase} />
      <h2 className="mt-6 text-[22px] font-bold tracking-[-0.01em] text-ink">
        Writing your cover letter
      </h2>
      <p className="mt-2 text-sm text-graphite">{LOADING_STEPS[step].label}...</p>

      <div className="mt-6 flex gap-1.5">
        {LOADING_STEPS.map((item, i) => (
          <span
            key={item.label}
            className="h-1.5 w-8 rounded-full transition-colors duration-500"
            style={{
              background: i <= step ? "var(--gradient-sunset)" : "rgba(43,26,23,0.1)",
            }}
          />
        ))}
      </div>

      <p className="mt-6 text-xs text-stone">This usually takes 15 to 40 seconds.</p>
    </div>
  );
}

function ErrorState({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="px-8 py-12 text-center">
      <h2 className="text-[22px] font-bold tracking-[-0.01em] text-ink">
        That did not work
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-graphite">{message}</p>
      <button type="button" onClick={onClose} className="btn-primary mt-8">
        Close
      </button>
    </div>
  );
}

// Ordered as they appear in the letterhead. `full_name` also signs the letter.
const CONTACT_FIELDS: {
  key: keyof ContactDetails;
  label: string;
  type: "text" | "email" | "tel";
}[] = [
  { key: "full_name", label: "Name", type: "text" },
  { key: "headline", label: "Headline", type: "text" },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Phone", type: "tel" },
  { key: "street", label: "Street", type: "text" },
  { key: "city", label: "Postcode & city", type: "text" },
  { key: "linkedin", label: "LinkedIn", type: "text" },
];

function ResultState({
  result,
  candidateName,
  onClose,
}: {
  result: CoverLetterResponse;
  candidateName: string;
  onClose: () => void;
}) {
  const [zipping, setZipping] = useState(false);
  // Letters stay editable in place: the PDF is rendered in the browser from
  // this state, so whatever is on screen is what gets downloaded.
  const [letters, setLetters] = useState(result.results);
  const [editing, setEditing] = useState<number | null>(null);
  // The letterhead is scraped out of the CV with regexes, so the email or
  // address it recovered is not always right. Keep it editable; it feeds every
  // letter's PDF.
  const [contact, setContact] = useState<ContactDetails>(
    result.contact ?? {
      full_name: candidateName,
      headline: "",
      street: "",
      city: "",
      phone: "",
      email: "",
      linkedin: "",
    }
  );
  const [editingContact, setEditingContact] = useState(false);
  const multiple = letters.length > 1;

  function updateLetter(index: number, patch: Partial<CoverLetterResult>) {
    setLetters((current) =>
      current.map((letter, i) => (i === index ? { ...letter, ...patch } : letter))
    );
  }

  async function handleZip() {
    setZipping(true);
    track("download_zip", { letters: letters.length });
    try {
      await downloadAllAsZip(contact.full_name || candidateName, letters, contact);
    } finally {
      setZipping(false);
    }
  }

  return (
    <>
      <header className="flex items-center justify-between border-b border-hairline px-6 py-4">
        <h2 className="text-[17px] font-semibold text-ink">
          {multiple ? `${letters.length} cover letters` : "Your cover letter"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-2xl leading-none text-stone transition-colors hover:text-coral"
        >
          ×
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <section className="mb-5 rounded-xl border border-hairline p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold text-ink">Your details</h3>
              <p className="mt-0.5 text-xs text-stone">
                Read from your CV — check the email before you send.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditingContact((open) => !open)}
              className="btn-ghost shrink-0 text-xs"
            >
              {editingContact ? "Done" : "Edit"}
            </button>
          </div>

          {editingContact ? (
            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-hairline pt-4 sm:grid-cols-2">
              {CONTACT_FIELDS.map(({ key, label, type }) => (
                <label key={key} className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-graphite">{label}</span>
                  <input
                    type={type}
                    value={contact[key]}
                    onChange={(e) =>
                      setContact((current) => ({ ...current, [key]: e.target.value }))
                    }
                    className="w-full rounded-lg border border-hairline px-3 py-2 text-[14px] text-ink outline-none focus:border-coral"
                  />
                </label>
              ))}
            </div>
          ) : (
            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 border-t border-hairline pt-4 text-[13px] sm:grid-cols-2">
              {CONTACT_FIELDS.filter(({ key }) => contact[key].trim()).map(
                ({ key, label }) => (
                  <div key={key} className="flex gap-2">
                    <dt className="shrink-0 text-stone">{label}</dt>
                    <dd className="truncate text-ink">{contact[key]}</dd>
                  </div>
                )
              )}
            </dl>
          )}
        </section>

        <div className="space-y-5">
          {letters.map((letter, i) => (
            <article
              key={`${letter.job_url}-${i}`}
              className="rounded-xl border border-hairline p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate text-[15px] font-semibold text-ink">
                    {letter.job_posting.role_title ?? "Cover letter"}
                  </h3>
                  {letter.job_posting.company_name && (
                    <p className="mt-0.5 text-xs text-stone">
                      {letter.job_posting.company_name}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(editing === i ? null : i)}
                    className="btn-ghost text-xs"
                  >
                    {editing === i ? "Done" : "Edit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      track("download_pdf");
                      downloadLetterPdf(contact.full_name || candidateName, letter, contact);
                    }}
                    className="btn-ghost text-xs"
                  >
                    Download PDF
                  </button>
                </div>
              </div>

              <div className="mt-4 border-t border-hairline pt-4">
                {editing === i ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={letter.subject}
                      onChange={(e) => updateLetter(i, { subject: e.target.value })}
                      placeholder="Subject line"
                      aria-label="Subject line"
                      className="w-full rounded-lg border border-hairline px-3 py-2 text-[14px] font-semibold text-ink outline-none focus:border-coral"
                    />
                    <textarea
                      value={letter.cover_letter}
                      onChange={(e) => updateLetter(i, { cover_letter: e.target.value })}
                      aria-label="Cover letter text"
                      rows={14}
                      className="font-editorial w-full resize-y rounded-lg border border-hairline px-3 py-2 text-[14px] leading-[1.65] text-ink outline-none focus:border-coral"
                    />
                    <p className="text-xs text-stone">
                      Edits apply to the PDF you download. Keep blank lines between
                      paragraphs.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto">
                    {letter.subject && (
                      <p className="mb-3 text-[14px] font-semibold text-ink">{letter.subject}</p>
                    )}
                    <div className="font-editorial whitespace-pre-wrap text-[14px] leading-[1.65] text-ink">
                      {letter.cover_letter}
                    </div>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-hairline px-6 py-4">
        <span className="text-xs text-stone">
          {multiple ? "Download individually or all at once." : "Saved as a PDF."}
        </span>
        {multiple && (
          <button
            type="button"
            onClick={handleZip}
            disabled={zipping}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {zipping ? "Preparing zip..." : "Download all as ZIP"}
          </button>
        )}
      </footer>
    </>
  );
}
