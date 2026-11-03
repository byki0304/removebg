import type { TranslationKey } from "@removebg/shared";
import { History, LayoutGrid, Scissors, Swords, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
}

export const APP_NAV_ITEMS: NavItem[] = [
  { href: "/menu", labelKey: "nav_menu", icon: LayoutGrid },
  { href: "/workspace", labelKey: "nav_convert", icon: Scissors },
  { href: "/simulator", labelKey: "nav_simulator", icon: Swords },
  { href: "/history", labelKey: "nav_history", icon: History },
];

export const SCREEN_TITLE_KEYS: Record<string, TranslationKey> = {
  "/menu": "menu_title",
  "/workspace": "ws_title",
  "/simulator": "simulator_title",
  "/history": "history_title",
  "/mypage": "mypage_title",
};
