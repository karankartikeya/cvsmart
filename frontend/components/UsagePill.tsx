"use client";

import { useAuth } from "@/lib/auth";

// TODO(Phase 3): replace with a real call to GET /api/usage-status once the
// backend usage-limiter ships. For now this only reflects local mock auth
// state so the generator page's layout and copy can be reviewed.
export default function UsagePill() {
  const { user } = useAuth();

  if (user) {
    const trialActive = user.isSubscribed || (user.trialEndsAt && new Date(user.trialEndsAt) > new Date());
    const label = user.isSubscribed
      ? `${user.tier === "premium" ? "Premium" : "Basic"} plan`
      : trialActive
        ? "Free trial active"
        : "Trial ended";
    return (
      <span className="pill bg-shell text-xs font-semibold text-magenta">{label}</span>
    );
  }

  return (
    <span className="pill bg-shell text-xs font-semibold text-magenta">
      Free tier · limited generations
    </span>
  );
}
