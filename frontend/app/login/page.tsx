"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const isReset = params.get("mode") === "reset";
  const { signInWithMagicLink, signInWithPassword, signInWithGoogle, loading } = useAuth();

  const [tab, setTab] = useState<"magic" | "password">("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    await signInWithMagicLink(email);
    setSent(true);
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    await signInWithPassword(email, password);
    router.push("/app");
  }

  if (isReset) {
    return (
      <AuthShell title="Reset your password">
        {sent ? (
          <p className="text-sm text-stone">
            If an account exists for <strong>{email}</strong>, a reset link is on its way.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
            className="space-y-4"
          >
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
            <button type="submit" className="btn-primary w-full">
              Send reset link
            </button>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-stone">
          <Link href="/login" className="font-semibold text-magenta">
            Back to log in
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Log in">
      <div className="mb-5 flex gap-2 rounded-lg bg-shell p-1">
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
            Check <strong>{email}</strong> for a sign-in link.
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
              {loading ? "Sending..." : "Send magic link"}
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
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </label>
          <div className="text-right">
            <Link href="/login?mode=reset" className="text-xs text-stone hover:text-magenta">
              Forgot password?
            </Link>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
      )}

      <Divider />

      <button
        type="button"
        onClick={() => signInWithGoogle().then(() => router.push("/app"))}
        className="btn-ghost w-full"
      >
        Continue with Google
      </button>

      <p className="mt-6 text-center text-sm text-stone">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-magenta">
          Sign up free
        </Link>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-6">
      <div className="card w-full">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
        <div className="mt-6">{children}</div>
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

function Divider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-hairline" />
      <span className="text-xs text-stone">or</span>
      <div className="h-px flex-1 bg-hairline" />
    </div>
  );
}
