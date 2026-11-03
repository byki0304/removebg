export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
/** Publishable key (sb_publishable_…) or legacy anon JWT — both are client-safe. */
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const isUiPreview = process.env.NEXT_PUBLIC_UI_PREVIEW === "1";

/**
 * Desktop (Electron) builds ship without the service role key. Admin-only auth routes are then
 * delegated to the hosted web deployment at this URL.
 */
export function cloudDelegateUrl(): string | null {
  const url = process.env.REMOVEBG_CLOUD_URL;
  return url && !process.env.SUPABASE_SERVICE_ROLE_KEY ? url.replace(/\/$/, "") : null;
}

export const PROTECTED_PATH_PREFIXES = ["/menu", "/workspace", "/simulator", "/history", "/mypage"];
