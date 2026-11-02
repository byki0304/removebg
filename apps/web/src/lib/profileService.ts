import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/** Stamp the login time; Google users get their profile row on first login. */
export async function ensureOAuthProfile(admin: SupabaseClient, user: User): Promise<void> {
  const now = new Date().toISOString();
  const { data: existing } = await admin.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (existing) {
    await admin.from("profiles").update({ last_login_at: now }).eq("id", user.id);
    return;
  }
  if (user.app_metadata?.provider === "google") {
    await admin.from("profiles").insert({ id: user.id, account_type: "google", email: user.email ?? null, last_login_at: now });
  }
}
