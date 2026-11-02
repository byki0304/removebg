"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { HomeButton } from "@/components/layout/HomeButton";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { useLocale } from "@/providers/LocaleProvider";

interface AuthScreenProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  testId?: string;
}

/** Shared frame for login / signup / guest screens: language toggle top-right, glass card with HomeButton inside. */
export function AuthScreen({ title, subtitle, children, testId }: AuthScreenProps) {
  const { t } = useLocale();
  return (
    <div className="app-backdrop flex min-h-dvh flex-col px-4 safe-top safe-bottom">
      <div className="flex h-16 shrink-0 items-center justify-between mlandscape:h-12">
        <span className="text-[17px] font-extrabold neon-text mlandscape:text-[15px]">{t("app_logo")}</span>
        <LanguageToggle />
      </div>

      <div className="flex flex-1 items-center justify-center py-6 mlandscape:py-3">
        <motion.section
          data-testid={testId}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="glass-panel w-full max-w-[440px] rounded-[20px] p-6 mportrait:max-w-[480px] mportrait:p-5 mlandscape:max-w-[520px] mlandscape:p-5"
        >
          <div className="flex items-start justify-end">
            <HomeButton placement="left" />
          </div>
          <h1 className="-mt-2 text-[24px] font-extrabold tracking-tight text-ink mlandscape:text-[20px]">{title}</h1>
          {subtitle && <p className="mt-1 text-[14px] text-ink-dim">{subtitle}</p>}
          <div className="mt-5 mlandscape:mt-4">{children}</div>
        </motion.section>
      </div>
    </div>
  );
}
