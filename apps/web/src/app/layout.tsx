import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { LAYOUT_BOOTSTRAP_SCRIPT } from "@/layout/layoutModes";
import { AppProviders } from "@/providers/AppProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpriteCut AI Studio",
  description: "Precision AI background removal for game assets",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B0C10",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" data-layout="desktop" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LAYOUT_BOOTSTRAP_SCRIPT }} />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
