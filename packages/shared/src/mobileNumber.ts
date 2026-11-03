export const DEFAULT_COUNTRY_CODE = "+82";
export const MOBILE_AUTH_EMAIL_DOMAIN = "phone.removebgai.local";

export interface NormalizedMobile {
  countryCode: string;
  national: string;
  e164: string;
}

export class InvalidMobileError extends Error {
  constructor() {
    super("INVALID_MOBILE");
    this.name = "InvalidMobileError";
  }
}

/**
 * Hyphens and spaces are ignored everywhere; a leading trunk "0" is dropped
 * so that "010-1234-5678" and "10 1234 5678" resolve to the same account.
 */
export function normalizeMobile(countryCodeRaw: string, numberRaw: string): NormalizedMobile {
  const cc = countryCodeRaw.replace(/[\s+-]/g, "");
  let national = numberRaw.replace(/[\s-]/g, "");
  if (!/^\d{1,4}$/.test(cc) || !/^\d+$/.test(national)) throw new InvalidMobileError();
  if (national.startsWith("0")) national = national.slice(1);
  if (national.length < 6 || national.length > 13) throw new InvalidMobileError();
  const e164 = `+${cc}${national}`;
  if (e164.length < 9 || e164.length > 16) throw new InvalidMobileError();
  return { countryCode: `+${cc}`, national, e164 };
}

export function tryNormalizeMobile(countryCodeRaw: string, numberRaw: string): NormalizedMobile | null {
  try {
    return normalizeMobile(countryCodeRaw, numberRaw);
  } catch {
    return null;
  }
}

export function mobileToAuthEmail(e164: string): string {
  return `p${e164.replace("+", "")}@${MOBILE_AUTH_EMAIL_DOMAIN}`;
}

export function isMobileAuthEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith(`@${MOBILE_AUTH_EMAIL_DOMAIN}`);
}

export function formatMobileForDisplay(countryCode: string, national: string): string {
  const grouped = national.replace(/^(\d{2})(\d{3,4})(\d{4})$/, "$1 $2 $3");
  return `${countryCode} ${grouped}`;
}
