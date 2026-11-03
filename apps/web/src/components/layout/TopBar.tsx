"use client";

import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { logout } from "@/lib/authService";
import { useLocale } from "@/providers/LocaleProvider";
import { useSession } from "@/providers/SessionProvider";
import { HomeButton } from "./HomeButton";
import { LanguageToggle } from "./LanguageToggle";
import { APP_NAV_ITEMS, SCREEN_TITLE_KEYS } from "./navItems";

/**
 * One DOM, three layout profiles (CSS variants keyed on <html data-layout>):
 * - desktop:          1 row  [Home][Logo][Title] [nav] ...... [Ko|En|Ja][My Page][Log out]
 * - mobilePortrait:   2 rows [Home][Logo][Title] / [Ko|En|Ja][My Page][Log out]
 * - mobileLandscape:  1 compact row
 */
export function TopBar() {
  const { t } = useLocale();
  const { refresh } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const titleKey = SCREEN_TITLE_KEYS[pathname] ?? "menu_title";
  const onMyPage = pathname === "/mypage";

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    await refresh();
    router.replace("/");
  };

  const actionButton =
    "flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-[14px] font-semibold whitespace-nowrap desktop:h-9 desktop:px-3.5 mlandscape:h-10 mlandscape:text-[13px]";
  const actionIcon = "h-4 w-4 max-[400px]:hidden";

  return (
    <header
      data-testid="top-bar"
      className="safe-top fixed inset-x-0 top-0 z-30 border-b border-neon-cyan/20 bg-obsidian/85 backdrop-blur-md"
    >
      <div
        className="mx-auto flex max-w-[1600px] px-4 mportrait:flex-col mportrait:gap-2 mportrait:py-2 desktop:h-16 desktop:items-center desktop:gap-4 desktop:px-6 mlandscape:h-[52px] mlandscape:items-center mlandscape:gap-3"
      >
        <div data-testid="top-bar-row-primary" className="flex min-w-0 items-center gap-3 mportrait:h-11">
          <HomeButton placement="bottom-start" />
          <Link href="/menu" className="shrink-0" aria-label={t("app_logo")}>
            <BrandLogo size="sm" />
          </Link>
          <span className="truncate text-[14px] text-ink-dim mlandscape:text-[13px] desktop:max-[1359px]:hidden">· {t(titleKey)}</span>
        </div>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 desktop:flex" aria-label="Primary">
          {APP_NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                title={t(labelKey)}
                aria-current={active ? "page" : undefined}
                className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium whitespace-nowrap transition max-[1179px]:px-2.5 ${
                  active ? "bg-neon-cyan/15 text-neon-cyan" : "text-ink-dim hover:text-ink"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="max-[1179px]:sr-only">{t(labelKey)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden flex-1 mlandscape:block" />

        <div
          data-testid="top-bar-row-actions"
          className="flex shrink-0 items-center justify-end gap-2 mportrait:h-11 max-[400px]:gap-1.5"
        >
          <LanguageToggle />
          <Link
            href="/mypage"
            aria-current={onMyPage ? "page" : undefined}
            data-testid="mypage-button"
            className={`${actionButton} ${onMyPage ? "border border-neon-cyan bg-neon-cyan/15 text-neon-cyan" : "btn-ghost"}`}
          >
            <UserRound className={actionIcon} />
            {t("nav_mypage")}
          </Link>
          <button
            type="button"
            data-testid="logout-button"
            onClick={handleLogout}
            disabled={loggingOut}
            className={`${actionButton} border border-vivid-magenta/50 text-[#ff8fb0] hover:bg-vivid-magenta/10 hover:shadow-[0_0_14px_rgba(255,0,85,0.45)]`}
          >
            <LogOut className={actionIcon} />
            {t("nav_logout")}
          </button>
        </div>
      </div>
    </header>
  );
}
