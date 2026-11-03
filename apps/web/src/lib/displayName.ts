import { formatMobileForDisplay, type Profile } from "@removebg/shared";

/** The ID shown to the user: email, formatted mobile number, or guest nickname. Never the internal auth email. */
export function profileLoginId(profile: Profile | null): string {
  if (!profile) return "";
  switch (profile.account_type) {
    case "mobile":
      return profile.mobile_country_code && profile.mobile_national
        ? formatMobileForDisplay(profile.mobile_country_code, profile.mobile_national)
        : (profile.mobile_e164 ?? "");
    case "guest":
      return profile.nickname ?? "";
    default:
      return profile.email ?? "";
  }
}
