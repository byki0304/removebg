"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/providers/LocaleProvider";
import { APP_NAV_ITEMS } from "./navItems";

export function BottomNav() {
  const { t } = useLocale();
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      data-testid="bottom-nav"
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 hidden border-t border-neon-cyan/20 bg-obsidian/90 backdrop-blur-md mobile:block"
    >
      <ul className="mx-auto grid max-w-[720px] grid-cols-4 mportrait:h-16 mlandscape:h-14">
        {APP_NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                className={`flex flex-1 items-center justify-center gap-1 text-[12px] font-semibold mportrait:flex-col mlandscape:gap-1.5 mlandscape:text-[13px] ${
                  active ? "text-neon-cyan" : "text-ink-dim"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="whitespace-nowrap">{t(labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
