"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// TODO(Phase 2): wire to supabase.auth.updateUser({ password }) once the
// Supabase project exists. Reached via the link in a real password-reset email.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await new Promise((r) => setTimeout(r, 300));
    setDone(true);
    setTimeout(() => router.push("/login"), 1500);
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-6">
      <div className="card w-full">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Set a new password</h1>
        {done ? (
          <p className="mt-6 text-sm text-stone">Password updated. Redirecting to log in...</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">New password</span>
              <input
                required
                minLength={8}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
              />
            </label>
            <button type="submit" className="btn-primary w-full">
              Update password
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
