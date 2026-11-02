"use client";

import type { User } from "@supabase/supabase-js";
import type { Profile } from "@spritecut/shared";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isUiPreview } from "@/lib/env";
import { getSupabaseBrowser } from "@/lib/supabase/client";

interface SessionContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const PREVIEW_PROFILE: Profile = {
  id: "preview-user",
  account_type: "guest",
  email: null,
  mobile_country_code: null,
  mobile_national: null,
  mobile_e164: null,
  nickname: "PreviewGuest",
  preferred_locale: "ko",
  guest_session_active: true,
  guest_expires_at: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
  last_login_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (isUiPreview) {
      setProfile(PREVIEW_PROFILE);
      setUser({ id: PREVIEW_PROFILE.id } as User);
      setLoading(false);
      return;
    }
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data } = await supabase.auth.getUser();
    const currentUser = data.user ?? null;
    setUser(currentUser);
    if (currentUser) {
      const { data: row } = await supabase.from("profiles").select("*").eq("id", currentUser.id).maybeSingle();
      setProfile((row as Profile | null) ?? null);
    } else {
      setProfile(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") void load();
    });
    return () => data.subscription.unsubscribe();
  }, [load]);

  const value = useMemo(() => ({ user, profile, loading, refresh: load }), [user, profile, loading, load]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

export function isMemberProfile(profile: Profile | null): boolean {
  return !!profile && profile.account_type !== "guest";
}
