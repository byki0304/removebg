"use client";

import { NICKNAME_MAX_LENGTH, type TranslationKey } from "@spritecut/shared";
import { Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { FormError, SubmitButton, TextField } from "@/components/auth/FormFields";
import { startAsGuest } from "@/lib/authService";
import { useLocale } from "@/providers/LocaleProvider";
import { useSession } from "@/providers/SessionProvider";

export default function GuestPage() {
  const { t, locale } = useLocale();
  const { refresh } = useSession();
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorKey(null);
    setLoading(true);
    const result = await startAsGuest(nickname, locale);
    setLoading(false);
    if (!result.ok) {
      setErrorKey(result.errorKey);
      return;
    }
    await refresh();
    router.replace("/menu");
  };

  return (
    <AuthScreen title={t("guest_title")} testId="guest-card">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mlandscape:gap-3" noValidate>
        <TextField
          label={t("guest_nickname")}
          placeholder={t("guest_nickname_placeholder")}
          value={nickname}
          maxLength={NICKNAME_MAX_LENGTH}
          autoComplete="nickname"
          required
          onChange={(e) => setNickname(e.target.value)}
        />
        <p className="flex gap-2 rounded-lg bg-electric-purple/10 px-3 py-2.5 text-[13px] leading-relaxed text-ink-dim">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-electric-purple" />
          {t("guest_notice")}
        </p>
        <FormError message={errorKey ? t(errorKey) : null} />
        <SubmitButton loading={loading} disabled={nickname.trim().length < 2}>
          {t("guest_start")}
        </SubmitButton>
      </form>
    </AuthScreen>
  );
}
