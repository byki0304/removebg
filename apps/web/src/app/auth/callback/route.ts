import { NextResponse } from "next/server";
import { cloudDelegateUrl } from "@/lib/env";
import { ensureOAuthProfile } from "@/lib/profileService";
import { getSupabaseAdmin, getSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const supabase = await getSupabaseServer();
  const loginUrl = new URL("/auth/login", url.origin);
  if (!code || !supabase) return NextResponse.redirect(loginUrl);

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(loginUrl);

  // The DB trigger creates the Google profile; this only stamps last_login_at when possible.
  const admin = getSupabaseAdmin();
  const delegate = cloudDelegateUrl();
  if (admin) {
    await ensureOAuthProfile(admin, data.user);
  } else if (delegate) {
    await fetch(`${delegate}/api/auth/session-start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    }).catch(() => null);
  }

  return NextResponse.redirect(new URL("/menu", url.origin));
}
