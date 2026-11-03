"use client";

import { DEFAULT_COUNTRY_CODE, type TranslationKey } from "@removebg/shared";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { FormError, MobileNumberInput, PasswordField, SubmitButton } from "@/components/auth/FormFields";
import { signUpWithMobile } from "@/lib/authService";
import { useLocale } from "@/providers/LocaleProvider";
import { useSession } from "@/providers/SessionProvider";

export default function MobileSignupPage() {
  const { t, locale } = useLocale();
  const { refresh } = useSession();
  const router = useRouter();
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [loading, setLoading] = useState(false);
  const mismatch = confirm.length > 0 && password !== confirm;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorKey(null);
    setLoading(true);
    const result = await signUpWithMobile(countryCode, mobile, password, confirm, locale);
    setLoading(false);
    if (!result.ok) {
      setErrorKey(result.errorKey);
      return;
    }
    await refresh();
    router.replace("/menu");
  };

  return (
    <AuthScreen title={t("signup_mobile")} testId="signup-mobile-card">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mlandscape:gap-3" noValidate>
        <MobileNumberInput
          countryCode={countryCode}
          number={mobile}
          onCountryCodeChange={setCountryCode}
          onNumberChange={setMobile}
        />
        <PasswordField
          label={t("auth_password")}
          autoComplete="new-password"
          placeholder={t("auth_password_placeholder")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordField
          label={t("auth_password_confirm")}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <FormError message={mismatch ? t("err_password_mismatch") : errorKey ? t(errorKey) : null} />
        <SubmitButton loading={loading} disabled={!mobile || !password || !confirm || mismatch}>
          {t("signup_submit")}
        </SubmitButton>
      </form>
    </AuthScreen>
  );
}
