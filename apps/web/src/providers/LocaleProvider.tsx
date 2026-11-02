"use client";

import {
  DEFAULT_LOCALE,
  isLocale,
  translate,
  type Locale,
  type TranslationKey,
} from "@spritecut/shared";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isMemberProfile, useSession } from "./SessionProvider";

const STORAGE_KEY = "locale";
const REMOTE_SAVE_DEBOUNCE_MS = 300;

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function applyLocale(locale: Locale) {
  document.documentElement.lang = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Storage may be unavailable (private mode); the in-memory state still works.
  }
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { profile } = useSession();
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const restoredForUser = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) setLocaleState(stored);
  }, []);

  // Members get the language they had before logging out, restored once per login.
  useEffect(() => {
    if (!profile) {
      restoredForUser.current = null;
      return;
    }
    if (restoredForUser.current === profile.id) return;
    restoredForUser.current = profile.id;
    if (isMemberProfile(profile) && isLocale(profile.preferred_locale)) {
      setLocaleState(profile.preferred_locale);
      applyLocale(profile.preferred_locale);
    }
  }, [profile]);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      applyLocale(next);
      if (!isMemberProfile(profile) || !profile) return;
      const profileId = profile.id;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const supabase = getSupabaseBrowser();
        void supabase
          ?.from("profiles")
          .update({ preferred_locale: next, updated_at: new Date().toISOString() })
          .eq("id", profileId);
      }, REMOTE_SAVE_DEBOUNCE_MS);
    },
    [profile],
  );

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
