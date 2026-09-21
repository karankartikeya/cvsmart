"use client";

import Scanner from "./Scanner";

// Hero backdrop wrapper around the reactbits.dev Scanner component (see
// Scanner.tsx), tuned to the site's neon dark palette. Kept as a thin
// adapter around Scanner's low-level props so the pages that use it
// (`/`, `/pricing`) only deal with a simple intensity/heightClass API.
export default function MoltenMetalBackground({
  intensity = "medium",
  heightClass = "h-[420px]",
}: {
  intensity?: "low" | "medium" | "high";
  heightClass?: string;
}) {
  const speed = intensity === "high" ? 0.7 : intensity === "low" ? 0.3 : 0.5;
  const glow = intensity === "high" ? 0.3 : intensity === "low" ? 0.14 : 0.22;

  return (
    <div className={`absolute inset-0 -z-10 overflow-hidden ${heightClass}`}>
      <Scanner
        className="h-full w-full"
        color1="#5b8cff"
        color2="#7c5cff"
        color3="#22d3ee"
        speed={speed}
        sweepSpeed={0.25}
        sweepWidth={1.6}
        sweepFalloff={6}
        scale={1.5}
        frequency={2}
        ripple={0.22}
        bandDensity={11}
        lineSharpness={5.5}
        glow={glow}
        scanDirection="vertical"
        colorSpread={0.7}
        brightness={1}
        contrast={1.15}
        softness={1.4}
        vignette={0.45}
        scanline
        grain
        grainIntensity={0.04}
        opacity={0.55}
        mouseInteraction
        mouseRadius={0.5}
        mouseStrength={0.5}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cream/40 to-cream" />
    </div>
  );
}
