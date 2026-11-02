"use client";

import { LOCALE_PILL_LABELS, SUPPORTED_LOCALES } from "@spritecut/shared";
import { useLocale } from "@/providers/LocaleProvider";

export function LanguagePills() {
  const { locale, setLocale } = useLocale();
  return (
    <div role="radiogroup" aria-label="Language" className="flex items-center justify-center gap-2" data-testid="language-pills">
      {SUPPORTED_LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={active}
            lang={code}
            onClick={() => setLocale(code)}
            className={`h-9 min-w-[76px] rounded-full px-4 text-[13px] font-semibold transition desktop:h-8 ${
              active
                ? "bg-neon-cyan text-obsidian shadow-[0_0_14px_rgba(0,240,255,0.6)]"
                : "border border-ink-dim/40 text-ink-dim hover:border-neon-cyan hover:text-ink"
            }`}
          >
            {LOCALE_PILL_LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}
