"use client";

import { createContext, useContext } from "react";

// Placeholder auth shape matching what Supabase will provide in Phase 2.
// No real session/network calls yet — swap the provider's internals for
// @supabase/ssr once the project credentials exist.
export type AuthUser = {
  id: string;
  email: string;
  trialEndsAt: string | null;
  isSubscribed: boolean;
  tier: "none" | "basic" | "premium";
};

export type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signInWithMagicLink: (email: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
