"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LanguagePills } from "@/components/layout/LanguagePills";
import { hasActiveSession } from "@/lib/authService";
import { hasPlayedIntro } from "@/lib/introState";
import { useLocale } from "@/providers/LocaleProvider";

export default function LandingPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!hasPlayedIntro()) {
      router.replace("/intro");
      return;
    }
    setReady(true);
  }, [router]);

  const handleStart = async () => {
    setStarting(true);
    const loggedIn = await hasActiveSession().catch(() => false);
    router.push(loggedIn ? "/menu" : "/auth/login");
  };

  if (!ready) return <div className="min-h-dvh bg-obsidian" />;

  return (
    <div className="app-backdrop relative flex min-h-dvh flex-col items-center px-6 safe-top safe-bottom" data-testid="landing-screen">
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-8 mlandscape:gap-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-3 text-center"
        >
          <h1 className="text-[clamp(40px,8vmin,84px)] font-black leading-none tracking-tight neon-text">{t("app_logo")}</h1>
          <p className="max-w-[520px] text-[15px] text-ink-dim mlandscape:text-[14px]">{t("landing_tagline")}</p>
        </motion.div>

        <motion.button
          type="button"
          data-testid="start-button"
          onClick={handleStart}
          disabled={starting}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="btn-primary h-14 min-w-[220px] rounded-full px-10 text-[18px] mlandscape:h-12"
        >
          {t("landing_start")}
        </motion.button>
      </div>

      <div className="pb-8 mlandscape:pb-4">
        <LanguagePills />
      </div>
    </div>
  );
}
