"use client";

import { useEffect, useState } from "react";
import { Lottie } from "lottie-react";

export type AnimationPhase = "searching" | "printing";

const SOURCES: Record<AnimationPhase, string> = {
  searching: "/animations/searching.json",
  printing: "/animations/printing.json",
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/**
 * Loading visual for the generation modal.
 *
 * Two animations map onto what the backend is actually doing: searching while
 * the job posting is scraped, printing once the letter is being drafted.
 */
export default function LoadingAnimation({ phase }: { phase: AnimationPhase }) {
  const reducedMotion = usePrefersReducedMotion();

  // A looping animation with no pause control fails WCAG 2.2.2, so honour the
  // reduced-motion preference by holding on the first frame instead.
  return (
    <div className="h-32 w-32" aria-hidden="true">
      <Lottie
        // Remount on phase change so the new animation starts from frame 0.
        key={phase}
        src={SOURCES[phase]}
        autoplay={!reducedMotion}
        loop={!reducedMotion}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
