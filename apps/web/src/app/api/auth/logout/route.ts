import { apiOk } from "@/lib/apiResponse";
import { getSupabaseAdmin, getSupabaseServer } from "@/lib/supabase/server";

/**
 * Guests: deactivate the session so the nickname is released for reuse and the
 * guest's files can no longer be looked up. The rows stay until the 72h pg_cron cleanup.
 */
export async function POST() {
  const admin = getSupabaseAdmin();
  const supabase = await getSupabaseServer();
  if (!admin || !supabase) return apiOk();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiOk();

  await admin
    .from("profiles")
    .update({ guest_session_active: false, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .eq("account_type", "guest");

  return apiOk();
}
