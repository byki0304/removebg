"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { hudConfig, type HudProfile } from "./hudConfig";
import { resolveLayoutMode, type LayoutMode } from "./layoutModes";

interface LayoutContextValue {
  mode: LayoutMode;
  hud: HudProfile;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

function isEditingText(): boolean {
  const el = document.activeElement;
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
}

/**
 * Structural layout switching is CSS-driven via <html data-layout>, so it applies
 * on the same frame as the resize. This context exposes the same mode to JS for
 * behavior-level decisions (video orientation, bubble placement, canvas sizing).
 */
export function LayoutProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<LayoutMode>("desktop");

  useEffect(() => {
    let lastWidth = window.innerWidth;
    let current = resolveLayoutMode(window.innerWidth, window.innerHeight);

    const apply = (next: LayoutMode) => {
      current = next;
      document.documentElement.setAttribute("data-layout", next);
      setMode(next);
    };

    const update = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      // On-screen keyboards shrink the height only; keep the profile stable while typing.
      if (width === lastWidth && isEditingText()) return;
      lastWidth = width;
      const next = resolveLayoutMode(width, height);
      if (next !== current || document.documentElement.getAttribute("data-layout") !== next) apply(next);
    };

    const portraitQuery = window.matchMedia("(orientation: portrait)");
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    portraitQuery.addEventListener("change", update);
    apply(current);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      portraitQuery.removeEventListener("change", update);
    };
  }, []);

  return <LayoutContext.Provider value={{ mode, hud: hudConfig[mode] }}>{children}</LayoutContext.Provider>;
}

export function useLayoutMode(): LayoutMode {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error("useLayoutMode must be used within LayoutProvider");
  return ctx.mode;
}

export function useHud(): HudProfile {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error("useHud must be used within LayoutProvider");
  return ctx.hud;
}
