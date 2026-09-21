"use client";

import Link from "next/link";
import AuthNav from "@/components/AuthNav";

export default function Nav() {
  return (
    <header className="sticky top-0 z-10 border-b border-hairline bg-cream/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="text-[16px] font-extrabold tracking-tight text-ink">
          Cover<span className="text-magenta">It</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link href="/pricing" className="btn-text hidden sm:inline-block">
            Pricing
          </Link>
          <Link href="/app" className="btn-text hidden sm:inline-block">
            Generate
          </Link>
        </nav>
        <AuthNav />
      </div>
    </header>
  );
}
