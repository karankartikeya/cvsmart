import { NextResponse } from "next/server";

// TODO(Phase 2): exchange the Supabase auth code for a session via
// @supabase/ssr's exchangeCodeForSession() before redirecting. Currently a
// no-op passthrough since no real Supabase client exists yet.
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/app`);
}
