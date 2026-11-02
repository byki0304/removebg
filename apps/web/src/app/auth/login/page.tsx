"use client";

import { DEFAULT_COUNTRY_CODE, type TranslationKey } from "@spritecut/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { FormError, MobileNumberInput, PasswordField, SubmitButton, TextField } from "@/components/auth/FormFields";
import { loginWithEmail, loginWithGoogle, loginWithMobile } from "@/lib/authService";
import { useLocale } from "@/providers/LocaleProvider";
import { useSession } from "@/providers/SessionProvider";

type LoginTab = "email" | "mobile";

export default function LoginPage() {
  const { t } = useLocale();
  const { refresh } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<LoginTab>("email");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorKey(null);
    setLoading(true);
    const result =
      tab === "email" ? await loginWithEmail(email, password) : await loginWithMobile(countryCode, mobile, password);
    setLoading(false);
    if (!result.ok) {
      setErrorKey(result.errorKey);
      return;
    }
    await refresh();
    router.replace("/menu");
  };

  const handleGoogle = async () => {
    setErrorKey(null);
    const result = await loginWithGoogle();
    if (!result.ok) setErrorKey(result.errorKey);
  };

  const tabClass = (active: boolean) =>
    `h-11 flex-1 rounded-lg text-[14px] font-semibold transition ${
      active ? "bg-neon-cyan/15 text-neon-cyan shadow-[inset_0_0_0_1px_rgba(0,240,255,0.5)]" : "text-ink-dim hover:text-ink"
    }`;

  return (
    <AuthScreen title={t("auth_login_title")} testId="login-card">
      <div role="tablist" className="mb-4 flex gap-1 rounded-xl bg-obsidian/60 p-1">
        <button type="button" role="tab" aria-selected={tab === "email"} className={tabClass(tab === "email")} onClick={() => setTab("email")}>
          {t("auth_tab_email")}
        </button>
        <button type="button" role="tab" aria-selected={tab === "mobile"} className={tabClass(tab === "mobile")} onClick={() => setTab("mobile")}>
          {t("auth_tab_mobile")}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mlandscape:gap-3" noValidate>
        {tab === "email" ? (
          <TextField
            label={t("auth_email")}
            type="email"
            autoComplete="email"
            placeholder={t("auth_email_placeholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        ) : (
          <MobileNumberInput
            countryCode={countryCode}
            number={mobile}
            onCountryCodeChange={setCountryCode}
            onNumberChange={setMobile}
          />
        )}
        <PasswordField
          label={t("auth_password")}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <FormError message={errorKey ? t(errorKey) : null} />
        <SubmitButton loading={loading} disabled={!password}>
          {t("auth_login_button")}
        </SubmitButton>
      </form>

      <div className="mt-3 text-center">
        <Link href="/auth/signup" data-testid="signup-link" className="text-[14px] font-semibold text-neon-cyan underline-offset-4 hover:underline">
          {t("auth_signup_link")}
        </Link>
      </div>

      <div className="my-4 flex items-center gap-3 text-[12px] text-ink-dim mlandscape:my-3">
        <span className="h-px flex-1 bg-ink-dim/25" />
        {t("auth_or")}
        <span className="h-px flex-1 bg-ink-dim/25" />
      </div>

      <div className="grid gap-2.5 mlandscape:grid-cols-2">
        <button type="button" onClick={handleGoogle} data-testid="google-login-button" className="btn-ghost flex h-12 items-center justify-center gap-2 rounded-xl text-[15px] font-semibold mlandscape:h-11">
          <GoogleMark />
          {t("auth_google")}
        </button>
        <Link href="/auth/guest" className="btn-ghost flex h-12 items-center justify-center rounded-xl text-[15px] font-semibold mlandscape:h-11">
          {t("auth_guest")}
        </Link>
      </div>
    </AuthScreen>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
