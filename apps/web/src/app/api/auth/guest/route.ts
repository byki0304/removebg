import { DEFAULT_LOCALE, FILE_TTL_HOURS, isLocale, isValidNickname, normalizeNickname } from "@spritecut/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import { apiError, apiOk } from "@/lib/apiResponse";
import { getSupabaseAdmin, getSupabaseServer } from "@/lib/supabase/server";

async function isNicknameAvailable(admin: SupabaseClient, nickname: string): Promise<boolean> {
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("account_type", "guest")
    .eq("guest_session_active", true)
    .ilike("nickname", nickname.replace(/[\\%_]/g, (c) => `\\${c}`));
  return (count ?? 0) === 0;
}

export async function GET(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return apiError(503, "auth_backend_missing");
  const nickname = normalizeNickname(new URL(request.url).searchParams.get("nickname") ?? "");
  if (!isValidNickname(nickname)) return apiError(400, "err_nickname_rule");
  return apiOk({ available: await isNicknameAvailable(admin, nickname) });
}

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  const supabase = await getSupabaseServer();
  if (!admin || !supabase) return apiError(503, "auth_backend_missing");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.is_anonymous) return apiError(401, "err_generic");

  const body = (await request.json().catch(() => null)) as { nickname?: string; locale?: string } | null;
  const nickname = normalizeNickname(body?.nickname ?? "");
  if (!isValidNickname(nickname)) return apiError(400, "err_nickname_rule");

  const { error } = await admin.from("profiles").insert({
    id: user.id,
    account_type: "guest",
    nickname,
    guest_session_active: true,
    guest_expires_at: new Date(Date.now() + FILE_TTL_HOURS * 3600 * 1000).toISOString(),
    preferred_locale: isLocale(body?.locale) ? body.locale : DEFAULT_LOCALE,
  });
  if (error) {
    if (error.code === "23505") return apiError(409, "err_nickname_taken");
    return apiError(500, "err_generic");
  }
  return apiOk();
}
