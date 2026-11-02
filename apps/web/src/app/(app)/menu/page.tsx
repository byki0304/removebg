"use client";

import { motion } from "framer-motion";
import { History, Scissors, Swords, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { TranslationKey } from "@spritecut/shared";
import { profileLoginId } from "@/lib/displayName";
import { useLocale } from "@/providers/LocaleProvider";
import { useSession } from "@/providers/SessionProvider";

interface MenuCard {
  href: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  icon: LucideIcon;
  accent: string;
  primary?: boolean;
}

const CARDS: MenuCard[] = [
  { href: "/workspace", titleKey: "menu_workspace", descKey: "menu_workspace_desc", icon: Scissors, accent: "#00f0ff", primary: true },
  { href: "/simulator", titleKey: "menu_simulator", descKey: "menu_simulator_desc", icon: Swords, accent: "#9d00ff" },
  { href: "/history", titleKey: "menu_history", descKey: "menu_history_desc", icon: History, accent: "#ff0055" },
  { href: "/mypage", titleKey: "mypage_title", descKey: "menu_mypage_desc", icon: UserRound, accent: "#8be9ff" },
];

export default function MenuPage() {
  const { t } = useLocale();
  const { profile } = useSession();
  const isGuest = profile?.account_type === "guest";
  const name = profileLoginId(profile);

  return (
    <div data-testid="menu-screen" className="flex flex-col gap-6 mlandscape:gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-[24px] font-extrabold tracking-tight mlandscape:text-[20px]">
          {name ? t("menu_welcome", { name }) : t("menu_title")}
        </h1>
        {isGuest && (
          <span className="rounded-full border border-electric-purple/60 bg-electric-purple/15 px-2.5 py-1 text-[12px] font-bold text-[#d7a6ff]">
            {t("guest_badge")}
          </span>
        )}
      </div>

      <div className="grid gap-4 desktop:grid-cols-[1.3fr_1fr] mlandscape:grid-cols-2 mlandscape:gap-3 mportrait:grid-cols-1">
        {CARDS.map(({ href, titleKey, descKey, icon: Icon, accent, primary }, index) => (
          <motion.div
            key={href}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className={primary ? "desktop:row-span-3" : ""}
          >
            <Link
              href={href}
              className="glass-panel group flex h-full min-h-[120px] flex-col justify-between gap-4 rounded-2xl p-5 transition hover:-translate-y-0.5 mlandscape:min-h-[96px] mlandscape:flex-row mlandscape:items-center mlandscape:p-4"
              style={{ borderColor: `${accent}55` }}
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style={{ background: `${accent}1f`, color: accent, boxShadow: `0 0 16px ${accent}40` }}
              >
                <Icon className="h-6 w-6" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className={`font-bold text-ink ${primary ? "text-[22px] mlandscape:text-[17px]" : "text-[17px]"}`}>
                  {t(titleKey)}
                </span>
                <span className="text-[14px] leading-snug text-ink-dim">{t(descKey)}</span>
              </span>
            </Link>
          </motion.div>
        ))}
      </div>

      <p className="text-[13px] text-ink-dim">{t("ttl_warning")}</p>
    </div>
  );
}
