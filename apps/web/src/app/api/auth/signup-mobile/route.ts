import {
  DEFAULT_LOCALE,
  isLocale,
  isValidPassword,
  mobileToAuthEmail,
  tryNormalizeMobile,
} from "@spritecut/shared";
import { apiError, apiOk, isDuplicateUserError } from "@/lib/apiResponse";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return apiError(503, "auth_backend_missing");

  const body = (await request.json().catch(() => null)) as {
    countryCode?: string;
    number?: string;
    password?: string;
    locale?: string;
  } | null;

  const mobile = tryNormalizeMobile(body?.countryCode ?? "", body?.number ?? "");
  const password = body?.password ?? "";
  if (!mobile) return apiError(400, "err_invalid_mobile");
  if (!isValidPassword(password)) return apiError(400, "err_password_rule");

  // No SMS: the mobile number is mapped to an internal email so it works as an ID + password login.
  const { data, error } = await admin.auth.admin.createUser({
    email: mobileToAuthEmail(mobile.e164),
    password,
    email_confirm: true,
    user_metadata: { mobile_e164: mobile.e164 },
  });
  if (error || !data.user) {
    return isDuplicateUserError(error?.message) ? apiError(409, "err_already_registered") : apiError(500, "err_generic");
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    account_type: "mobile",
    mobile_country_code: mobile.countryCode,
    mobile_national: mobile.national,
    mobile_e164: mobile.e164,
    preferred_locale: isLocale(body?.locale) ? body.locale : DEFAULT_LOCALE,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return profileError.code === "23505" ? apiError(409, "err_already_registered") : apiError(500, "err_generic");
  }
  return apiOk();
}
