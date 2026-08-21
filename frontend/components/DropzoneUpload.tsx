"use client";

import { useState } from "react";

export default function DropzoneUpload({
  resume,
  setResume,
}: {
  resume: File | null;
  setResume: (f: File | null) => void;
}) {
  const [active, setActive] = useState(false);

  return (
    <label
      className={`dropzone${active ? " dropzone-active" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) setResume(file);
      }}
    >
      {resume ? (
        <>
          <span className="text-sm font-medium text-ink">{resume.name}</span>
          <span className="btn-ghost pointer-events-none text-xs">Change</span>
        </>
      ) : (
        <>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="text-sm">Drag and drop your CV, or click to browse</span>
        </>
      )}
      <input
        required
        type="file"
        accept=".pdf,.txt,.md"
        className="hidden"
        onChange={(e) => setResume(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
