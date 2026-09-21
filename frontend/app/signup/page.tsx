"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const { signUp, signInWithGoogle, loading } = useAuth();
  const [tab, setTab] = useState<"magic" | "password">("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    await signUp(email);
    setSent(true);
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    await signUp(email, password);
    router.push("/app");
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-6">
      <div className="card w-full">
        <span className="pill bg-shell text-xs font-semibold text-magenta">
          1 month full access, free — no card required
        </span>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">
          Create your account
        </h1>

        <div className="mt-6 mb-5 flex gap-2 rounded-lg bg-shell p-1">
          <TabButton active={tab === "magic"} onClick={() => setTab("magic")}>
            Magic link
          </TabButton>
          <TabButton active={tab === "password"} onClick={() => setTab("password")}>
            Password
          </TabButton>
        </div>

        {tab === "magic" ? (
          sent ? (
            <p className="text-sm text-stone">
              Check <strong>{email}</strong> to finish creating your account.
            </p>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink">Email</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="you@example.com"
                />
              </label>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Sending..." : "Sign up with email"}
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handlePassword} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">Email</span>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">Password</span>
              <input
                required
                minLength={8}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
              />
            </label>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        )}

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-hairline" />
          <span className="text-xs text-stone">or</span>
          <div className="h-px flex-1 bg-hairline" />
        </div>

        <button
          type="button"
          onClick={() => signInWithGoogle().then(() => router.push("/app"))}
          className="btn-ghost w-full"
        >
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-stone">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-magenta">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
        active ? "bg-cream text-gold shadow-sm" : "text-stone hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
