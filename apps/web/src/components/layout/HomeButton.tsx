"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Home } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLayoutMode } from "@/layout/LayoutProvider";
import { useLocale } from "@/providers/LocaleProvider";

const HINT_SEEN_KEY = "homeHintSeen";
const AUTO_HINT_MS = 4000;
const LONG_PRESS_MS = 450;

export type BubblePlacement = "left" | "bottom-end" | "bottom-start";

interface HomeButtonProps {
  /** Placement when there is room beside the button; mobile portrait falls back to below. */
  placement?: BubblePlacement;
  className?: string;
}

export function HomeButton({ placement = "left", className = "" }: HomeButtonProps) {
  const { t } = useLocale();
  const router = useRouter();
  const mode = useLayoutMode();
  const [autoHint, setAutoHint] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    if (localStorage.getItem(HINT_SEEN_KEY) === "1") return;
    setAutoHint(true);
    const timer = setTimeout(() => setAutoHint(false), AUTO_HINT_MS);
    return () => clearTimeout(timer);
  }, []);

  const effectivePlacement: BubblePlacement =
    placement === "left" && mode === "mobilePortrait" ? "bottom-end" : placement;
  const visible = autoHint || hovered || pressed;

  const handleClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    localStorage.setItem(HINT_SEEN_KEY, "1");
    router.push("/");
  };

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <button
        type="button"
        aria-label={t("nav_go_home")}
        data-testid="home-button"
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        onPointerDown={(e) => {
          if (e.pointerType !== "touch") return;
          pressTimer.current = setTimeout(() => {
            setPressed(true);
            suppressClick.current = true;
          }, LONG_PRESS_MS);
        }}
        onPointerUp={() => {
          if (pressTimer.current) clearTimeout(pressTimer.current);
          setTimeout(() => setPressed(false), 1200);
        }}
        onPointerCancel={() => {
          if (pressTimer.current) clearTimeout(pressTimer.current);
          setPressed(false);
        }}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-neon-cyan/50 bg-obsidian/70 text-neon-cyan shadow-[0_0_10px_rgba(0,240,255,0.35)] transition hover:bg-neon-cyan/10 hover:shadow-[0_0_18px_rgba(0,240,255,0.6)] desktop:h-9 desktop:w-9"
      >
        <Home className="h-[18px] w-[18px]" strokeWidth={2.2} />
      </button>
      <AnimatePresence>
        {visible && (
          <motion.span
            role="tooltip"
            data-placement={effectivePlacement}
            className="speech-bubble"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.18 }}
          >
            <span className="animate-bubble-float inline-block">{t("nav_go_home")}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
