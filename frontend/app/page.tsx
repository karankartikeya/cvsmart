import Link from "next/link";
import MoltenMetalBackground from "@/components/MoltenMetalBackground";

export default function LandingPage() {
  return (
    <div>
      <section className="relative overflow-hidden pt-14 pb-16 text-center">
        <MoltenMetalBackground heightClass="h-full" intensity="high" />
        <div className="relative mx-auto max-w-3xl px-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-flame/25 bg-shell/70 px-4 py-1.5 text-xs font-semibold text-gold backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-flame" />
            5 free generations · No card required
          </span>

          <h1 className="mt-6 text-[64px] leading-[0.95] font-extrabold tracking-[-0.035em] sm:text-[78px]">
            <span className="text-gradient">Cover</span>
            <span className="text-magenta">It</span>
          </h1>

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-stone">
            Cover letters, made easy
          </p>

          <p className="font-handwritten mx-auto mt-7 max-w-lg text-xl leading-snug text-graphite">
            Tired of always the same AI-generated cover letters? Ours are
            proof-read, original and low detection. Made with love, just like
            grandma used to do them.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/app" className="btn-primary text-base">
              Try it free
            </Link>
            <Link href="/pricing" className="btn-ghost text-base">
              See pricing
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-20">
        <div className="grid gap-5 sm:grid-cols-3">
          <FeatureCard
            title="Upload once"
            body="Drop your CV, paste your LinkedIn, and reuse it for every job you apply to."
          />
          <FeatureCard
            title="Grounded in the posting"
            body="Every letter cites real details from the job ad and your own experience — not generic filler."
          />
          <FeatureCard
            title="Free to start"
            body="Generate your first 5 cover letters with zero signup. Create an account for a free 30-day trial."
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="card">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm text-stone">{body}</p>
    </div>
  );
}
