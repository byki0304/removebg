"use client";

import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-backdrop min-h-dvh">
      <TopBar />
      <main
        className="mx-auto max-w-[1600px] px-4 desktop:px-6"
        style={{
          paddingTop: "calc(var(--topbar-h) + env(safe-area-inset-top) + 16px)",
          paddingBottom: "calc(var(--bottomnav-h) + env(safe-area-inset-bottom) + 20px)",
        }}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
