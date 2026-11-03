"use client";

import type { TranslationKey } from "@removebg/shared";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { FormError, PasswordField, SubmitButton, TextField } from "@/components/auth/FormFields";
import { signUpWithEmail } from "@/lib/authService";
import { useLocale } from "@/providers/LocaleProvider";
import { useSession } from "@/providers/SessionProvider";

export default function EmailSignupPage() {
  const { t, locale } = useLocale();
  const { refresh } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [loading, setLoading] = useState(false);
  const mismatch = confirm.length > 0 && password !== confirm;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorKey(null);
    setLoading(true);
    const result = await signUpWithEmail(email, password, confirm, locale);
    setLoading(false);
    if (!result.ok) {
      setErrorKey(result.errorKey);
      return;
    }
    await refresh();
    router.replace("/menu");
  };

  return (
    <AuthScreen title={t("signup_email")} testId="signup-email-card">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mlandscape:gap-3" noValidate>
        <TextField
          label={t("auth_email")}
          type="email"
          autoComplete="email"
          placeholder={t("auth_email_placeholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
        <SubmitButton loading={loading} disabled={!email || !password || !confirm || mismatch}>
          {t("signup_submit")}
        </SubmitButton>
      </form>
    </AuthScreen>
  );
}
