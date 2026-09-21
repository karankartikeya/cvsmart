"use client";

import { useState } from "react";

export default function JobUrlList({
  jobUrls,
  onAdd,
  onRemove,
  maxUrls,
}: {
  jobUrls: string[];
  onAdd: (url: string) => void;
  onRemove: (index: number) => void;
  maxUrls?: number;
}) {
  const [draft, setDraft] = useState("");
  const atLimit = maxUrls !== undefined && jobUrls.length >= maxUrls;

  function handleAdd() {
    if (atLimit) return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setDraft("");
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="url"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="https://www.linkedin.com/jobs/view/3986111804"
          className="input"
          disabled={atLimit}
        />
        <button
          type="button"
          onClick={handleAdd}
          className="btn-primary shrink-0"
          disabled={atLimit}
        >
          + ADD
        </button>
      </div>
      {atLimit && (
        <p className="mt-1.5 text-xs text-magenta">
          Free tier limit reached ({maxUrls} job{maxUrls === 1 ? "" : "s"} per generation).{" "}
          <a href="/signup" className="font-semibold underline">
            Sign up
          </a>{" "}
          for more.
        </p>
      )}
      <p className="mt-1.5 text-xs text-stone">
        Works with LinkedIn, Greenhouse and join.com links. On LinkedIn you can
        paste the URL straight from the address bar, search results included.
      </p>
      {jobUrls.length > 0 && (
        <ol className="mt-3 space-y-2">
          {jobUrls.map((url, i) => (
            <li
              key={`${url}-${i}`}
              className="flex items-center justify-between gap-2 rounded-lg bg-shell px-3 py-2 text-sm"
            >
              <span className="truncate">
                <span className="mr-2 font-medium text-magenta">{i + 1}.</span>
                {url}
              </span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="shrink-0 text-stone transition-colors hover:text-coral"
                aria-label="Remove job URL"
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
