"use client";

import { Mail, Smartphone } from "lucide-react";
import Link from "next/link";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { useLocale } from "@/providers/LocaleProvider";

export default function SignupChoicePage() {
  const { t } = useLocale();
  const choiceClass =
    "btn-ghost flex h-14 items-center justify-center gap-2.5 rounded-xl text-[16px] font-bold mlandscape:h-12";

  return (
    <AuthScreen title={t("signup_title")} subtitle={t("signup_choose_desc")} testId="signup-choice-card">
      <div className="grid gap-3 mlandscape:grid-cols-2">
        <Link href="/auth/signup/email" className={choiceClass} data-testid="signup-email-choice">
          <Mail className="h-5 w-5 text-neon-cyan" />
          {t("signup_email")}
        </Link>
        <Link href="/auth/signup/mobile" className={choiceClass} data-testid="signup-mobile-choice">
          <Smartphone className="h-5 w-5 text-neon-cyan" />
          {t("signup_mobile")}
        </Link>
      </div>
      <div className="mt-5 text-center">
        <Link href="/auth/login" className="text-[14px] text-ink-dim underline-offset-4 hover:text-neon-cyan hover:underline">
          {t("signup_have_account")}
        </Link>
      </div>
    </AuthScreen>
  );
}
