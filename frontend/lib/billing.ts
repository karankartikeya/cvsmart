"use client";

// TODO(Phase 4): replace with real calls to POST /api/billing/create-checkout-session
// and /api/billing/create-portal-session once Stripe is wired up on the backend.
export async function createCheckoutSession(tier: "basic" | "premium"): Promise<void> {
  await new Promise((r) => setTimeout(r, 300));
  alert(
    `Stripe Checkout for the ${tier} plan isn't wired up yet — this will redirect to Stripe once billing ships.`
  );
}

export async function createPortalSession(): Promise<void> {
  await new Promise((r) => setTimeout(r, 300));
  alert("Stripe Customer Portal isn't wired up yet.");
}
