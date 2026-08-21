"use client";

import { Lottie } from "lottie-react";

export type AnimationPhase = "searching" | "printing";

const SOURCES: Record<AnimationPhase, string> = {
  searching: "/animations/searching.json",
  printing: "/animations/printing.json",
};

/**
 * Loading visual for the generation modal.
 *
 * Two animations map onto what the backend is actually doing: searching while
 * the job posting is scraped, printing once the letter is being drafted.
 */
export default function LoadingAnimation({ phase }: { phase: AnimationPhase }) {
  return (
    <div className="h-32 w-32" aria-hidden="true">
      <Lottie
        // Remount on phase change so the new animation starts from frame 0.
        key={phase}
        src={SOURCES[phase]}
        autoplay
        loop
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
