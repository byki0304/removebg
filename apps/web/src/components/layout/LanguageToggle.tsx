"use client";

import { LOCALE_TOGGLE_LABELS, SUPPORTED_LOCALES } from "@spritecut/shared";
import { useLocale } from "@/providers/LocaleProvider";

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <div
      role="radiogroup"
      aria-label="Language"
      data-testid="language-toggle"
      className="flex shrink-0 items-center rounded-full border border-neon-cyan/35 bg-obsidian/70 p-0.5"
    >
      {SUPPORTED_LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setLocale(code)}
            className={`h-9 min-w-[40px] rounded-full px-2 text-[13px] font-bold transition desktop:h-7 desktop:min-w-[36px] ${
              active ? "bg-neon-cyan text-obsidian shadow-[0_0_10px_rgba(0,240,255,0.55)]" : "text-ink-dim hover:text-ink"
            }`}
          >
            {LOCALE_TOGGLE_LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}
