"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function AuthNav() {
  const { user, signOut } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" className="btn-text">
          Log in
        </Link>
        <Link href="/signup" className="btn-primary">
          Sign up free
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-sm text-stone sm:inline">{user.email}</span>
      <Link href="/pricing" className="btn-text">
        Manage plan
      </Link>
      <button type="button" onClick={() => signOut()} className="btn-ghost">
        Log out
      </button>
    </div>
  );
}
