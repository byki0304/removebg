"use client";

import {
  isValidEmail,
  isValidNickname,
  isValidPassword,
  mobileToAuthEmail,
  normalizeNickname,
  tryNormalizeMobile,
  type Locale,
  type TranslationKey,
} from "@spritecut/shared";
import { getSupabaseBrowser } from "./supabase/client";

export type AuthResult = { ok: true } | { ok: false; errorKey: TranslationKey };

const fail = (errorKey: TranslationKey): AuthResult => ({ ok: false, errorKey });

async function postJson(url: string, body: unknown): Promise<{ status: number; data: { errorKey?: TranslationKey } }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function markSessionStart(): Promise<void> {
  await fetch("/api/auth/session-start", { method: "POST" }).catch(() => undefined);
}

async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return fail("auth_backend_missing");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return fail("err_login_failed");
  await markSessionStart();
  return { ok: true };
}

export async function loginWithEmail(email: string, password: string): Promise<AuthResult> {
  if (!isValidEmail(email)) return fail("err_invalid_email");
  return signInWithPassword(email.trim().toLowerCase(), password);
}

export async function loginWithMobile(countryCode: string, number: string, password: string): Promise<AuthResult> {
  const mobile = tryNormalizeMobile(countryCode, number);
  if (!mobile) return fail("err_invalid_mobile");
  return signInWithPassword(mobileToAuthEmail(mobile.e164), password);
}

function validatePasswords(password: string, confirm: string): AuthResult | null {
  if (!isValidPassword(password)) return fail("err_password_rule");
  if (password !== confirm) return fail("err_password_mismatch");
  return null;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  confirm: string,
  locale: Locale,
): Promise<AuthResult> {
  if (!isValidEmail(email)) return fail("err_invalid_email");
  const invalid = validatePasswords(password, confirm);
  if (invalid) return invalid;
  if (!getSupabaseBrowser()) return fail("auth_backend_missing");

  const normalizedEmail = email.trim().toLowerCase();
  const { status, data } = await postJson("/api/auth/signup-email", { email: normalizedEmail, password, locale });
  if (status !== 200) return fail(data.errorKey ?? "err_generic");
  return signInWithPassword(normalizedEmail, password);
}

export async function signUpWithMobile(
  countryCode: string,
  number: string,
  password: string,
  confirm: string,
  locale: Locale,
): Promise<AuthResult> {
  const mobile = tryNormalizeMobile(countryCode, number);
  if (!mobile) return fail("err_invalid_mobile");
  const invalid = validatePasswords(password, confirm);
  if (invalid) return invalid;
  if (!getSupabaseBrowser()) return fail("auth_backend_missing");

  const { status, data } = await postJson("/api/auth/signup-mobile", { countryCode, number, password, locale });
  if (status !== 200) return fail(data.errorKey ?? "err_generic");
  return signInWithPassword(mobileToAuthEmail(mobile.e164), password);
}

export async function loginWithGoogle(): Promise<AuthResult> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return fail("auth_backend_missing");
  const desktop = window.spritecutDesktop;
  if (desktop) {
    // Google blocks OAuth inside embedded windows: use the system browser and return via deep link.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: desktop.oauthRedirectUrl, skipBrowserRedirect: true },
    });
    if (error || !data.url) return fail("err_generic");
    await desktop.openExternal(data.url);
    return { ok: true };
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl}/auth/callback` },
  });
  return error ? fail("err_generic") : { ok: true };
}

export async function startAsGuest(nicknameRaw: string, locale: Locale): Promise<AuthResult> {
  const nickname = normalizeNickname(nicknameRaw);
  if (!isValidNickname(nickname)) return fail("err_nickname_rule");
  const supabase = getSupabaseBrowser();
  if (!supabase) return fail("auth_backend_missing");

  const check = await fetch(`/api/auth/guest?nickname=${encodeURIComponent(nickname)}`);
  const checkData = (await check.json().catch(() => ({}))) as { available?: boolean };
  if (!checkData.available) return fail("err_nickname_taken");

  const { error } = await supabase.auth.signInAnonymously();
  if (error) return fail("err_generic");

  const { status, data } = await postJson("/api/auth/guest", { nickname, locale });
  if (status !== 200) {
    await supabase.auth.signOut();
    return fail(data.errorKey ?? "err_generic");
  }
  return { ok: true };
}

export async function logout(): Promise<void> {
  const supabase = getSupabaseBrowser();
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  await supabase?.auth.signOut();
}

export async function changePassword(
  authEmail: string,
  currentPassword: string,
  nextPassword: string,
  confirm: string,
): Promise<AuthResult> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return fail("auth_backend_missing");
  const invalid = validatePasswords(nextPassword, confirm);
  if (invalid) return invalid;
  const { error: reauthError } = await supabase.auth.signInWithPassword({ email: authEmail, password: currentPassword });
  if (reauthError) return fail("err_current_password");
  const { error } = await supabase.auth.updateUser({ password: nextPassword });
  return error ? fail("err_generic") : { ok: true };
}

export async function hasActiveSession(): Promise<boolean> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return process.env.NEXT_PUBLIC_UI_PREVIEW === "1";
  const { data } = await supabase.auth.getUser();
  if (!data.user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type, guest_session_active")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile) return false;
  return profile.account_type !== "guest" || profile.guest_session_active === true;
}
