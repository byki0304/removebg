import { apiOk } from "@/lib/apiResponse";
import { ensureOAuthProfile } from "@/lib/profileService";
import { getRequestUser, getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return apiOk();
  const user = await getRequestUser(request);
  if (!user) return apiOk();

  await ensureOAuthProfile(admin, user);
  return apiOk();
}
