"use client";

/**
 * Loading visual for the generation modal.
 *
 * Currently a CSS placeholder. To swap in a Lottie animation, install
 * @lottiefiles/dotlottie-react and replace the body of this component with
 * the player pointing at the .lottie or .json asset. Everything else in the
 * modal stays untouched.
 */
export default function LoadingAnimation() {
  return (
    <div className="relative flex h-28 w-28 items-center justify-center" aria-hidden="true">
      <span className="absolute inset-0 rounded-full border-4 border-sky-tint" />
      <span className="loading-arc absolute inset-0 rounded-full border-4 border-transparent" />
      <svg width="40" height="48" viewBox="0 0 40 48" fill="none">
        <rect
          x="2"
          y="2"
          width="36"
          height="44"
          rx="4"
          fill="white"
          stroke="var(--color-notion-blue)"
          strokeWidth="2.5"
        />
        {[14, 21, 28, 35].map((y, i) => (
          <line
            key={y}
            x1="9"
            y1={y}
            x2={i === 3 ? 24 : 31}
            y2={y}
            stroke="var(--color-notion-blue)"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.35"
            style={{
              animation: `line-fill 2s ease-in-out ${i * 0.25}s infinite`,
            }}
          />
        ))}
      </svg>

      <style>{`
        .loading-arc {
          border-top-color: var(--color-notion-blue);
          animation: spin-arc 1s linear infinite;
        }
        @keyframes spin-arc {
          to { transform: rotate(360deg); }
        }
        @keyframes line-fill {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .loading-arc { animation-duration: 3s; }
          line { animation: none !important; opacity: 0.5 !important; }
        }
      `}</style>
    </div>
  );
}
