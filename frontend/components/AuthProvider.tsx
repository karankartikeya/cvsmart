"use client";

import { useCallback, useMemo, useState } from "react";
import { AuthContext, type AuthUser } from "@/lib/auth";

const MOCK_STORAGE_KEY = "coverit_mock_user";

// Mock-only implementation so the UI is reviewable before the Supabase
// project exists. Every method just simulates latency and stores the
// "session" in localStorage. Replace the bodies with real
// @supabase/ssr calls in Phase 2 without touching any consuming page.
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(MOCK_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const persist = useCallback((next: AuthUser | null) => {
    setUser(next);
    if (typeof window === "undefined") return;
    if (next) {
      window.localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(next));
    } else {
      window.localStorage.removeItem(MOCK_STORAGE_KEY);
    }
  }, []);

  const fakeSignIn = useCallback(
    async (email: string) => {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 400));
      const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      persist({ id: "mock-" + email, email, trialEndsAt, isSubscribed: false, tier: "none" });
      setLoading(false);
    },
    [persist]
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      signInWithMagicLink: fakeSignIn,
      signInWithPassword: fakeSignIn,
      signInWithGoogle: () => fakeSignIn("google-user@example.com"),
      signUp: fakeSignIn,
      signOut: async () => persist(null),
    }),
    [user, loading, fakeSignIn, persist]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
