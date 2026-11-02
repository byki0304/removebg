"use client";

import type { ReactNode } from "react";
import { LayoutProvider } from "@/layout/LayoutProvider";
import { LocaleProvider } from "./LocaleProvider";
import { SessionProvider } from "./SessionProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LayoutProvider>
      <SessionProvider>
        <LocaleProvider>{children}</LocaleProvider>
      </SessionProvider>
    </LayoutProvider>
  );
}
