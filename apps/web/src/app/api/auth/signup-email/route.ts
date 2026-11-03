import { isLocale, isValidEmail, isValidPassword, DEFAULT_LOCALE } from "@removebg/shared";
import { apiError, apiOk, isDuplicateUserError } from "@/lib/apiResponse";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return apiError(503, "auth_backend_missing");

  const body = (await request.json().catch(() => null)) as { email?: string; password?: string; locale?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  if (!isValidEmail(email)) return apiError(400, "err_invalid_email");
  if (!isValidPassword(password)) return apiError(400, "err_password_rule");

  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) {
    return isDuplicateUserError(error?.message) ? apiError(409, "err_already_registered") : apiError(500, "err_generic");
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    account_type: "email",
    email,
    preferred_locale: isLocale(body?.locale) ? body.locale : DEFAULT_LOCALE,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return apiError(500, "err_generic");
  }
  return apiOk();
}
