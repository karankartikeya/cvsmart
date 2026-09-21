"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { createCheckoutSession } from "@/lib/billing";
import MoltenMetalBackground from "@/components/MoltenMetalBackground";

const TIERS = [
  {
    id: "basic" as const,
    name: "Basic",
    price: "$9",
    tagline: "For active job seekers",
    features: [
      "Unlimited cover letter generations",
      "Up to 3 job postings per generation",
      "PDF download",
      "Email support",
    ],
  },
  {
    id: "premium" as const,
    name: "Premium",
    price: "$19",
    tagline: "For the all-out job search",
    features: [
      "Unlimited cover letter generations",
      "Unlimited job postings per generation",
      "PDF + ZIP bulk download",
      "Priority generation queue",
      "Priority support",
    ],
    highlighted: true,
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const [pending, setPending] = useState<string | null>(null);

  async function handleSubscribe(tier: "basic" | "premium") {
    if (!user) return;
    setPending(tier);
    try {
      await createCheckoutSession(tier);
    } finally {
      setPending(null);
    }
  }

  return (
    <div>
      <section className="relative overflow-hidden pt-16 pb-10 text-center">
        <MoltenMetalBackground heightClass="h-full" intensity="low" />
        <div className="relative mx-auto max-w-2xl px-6">
          <h1 className="text-[44px] font-extrabold tracking-[-0.03em] sm:text-[54px]">
            Simple, <span className="text-gradient">honest</span> pricing
          </h1>
          <p className="mt-4 text-base text-graphite">
            Start free with 5 generations. Sign up for a 30-day trial with full access.
            Upgrade whenever you're ready.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-2">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`card relative flex flex-col ${
                tier.highlighted ? "border-2 border-transparent" : ""
              }`}
              style={
                tier.highlighted
                  ? {
                      backgroundImage:
                        "linear-gradient(var(--color-pure-white), var(--color-pure-white)), var(--gradient-sunset)",
                      backgroundOrigin: "border-box",
                      backgroundClip: "padding-box, border-box",
                    }
                  : undefined
              }
            >
              {tier.highlighted && (
                <span className="pill absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-coral to-gold text-xs font-bold text-white">
                  Most popular
                </span>
              )}
              <h2 className="text-xl font-bold text-ink">{tier.name}</h2>
              <p className="mt-1 text-sm text-stone">{tier.tagline}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-ink">{tier.price}</span>
                <span className="text-sm text-stone">/month</span>
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-graphite">
                    <span className="mt-0.5 text-magenta">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {user ? (
                <button
                  type="button"
                  onClick={() => handleSubscribe(tier.id)}
                  disabled={pending === tier.id}
                  className={`mt-8 w-full ${tier.highlighted ? "btn-primary" : "btn-ghost"}`}
                >
                  {pending === tier.id ? "Redirecting..." : `Choose ${tier.name}`}
                </button>
              ) : (
                <Link
                  href="/signup"
                  className={`mt-8 block w-full text-center ${
                    tier.highlighted ? "btn-primary" : "btn-ghost"
                  }`}
                >
                  Sign up to subscribe
                </Link>
              )}
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-stone">
          Not ready to commit?{" "}
          <Link href="/app" className="font-semibold text-magenta">
            Try 5 free generations
          </Link>{" "}
          first.
        </p>
      </section>
    </div>
  );
}
