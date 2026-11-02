"use client";

import { LOCALE_PILL_LABELS, type AccountType, type TranslationKey } from "@spritecut/shared";
import { CheckCircle2, KeyRound } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { FormError, PasswordField, SubmitButton } from "@/components/auth/FormFields";
import { changePassword } from "@/lib/authService";
import { profileLoginId } from "@/lib/displayName";
import { useLocale } from "@/providers/LocaleProvider";
import { useSession } from "@/providers/SessionProvider";

const ACCOUNT_LABEL_KEYS: Record<AccountType, TranslationKey> = {
  email: "account_email",
  mobile: "account_mobile",
  google: "account_google",
  guest: "account_guest",
};

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-ink-dim/15 py-3 last:border-b-0 mportrait:flex-col mportrait:items-start mportrait:gap-1">
      <dt className="w-[140px] shrink-0 text-[13px] font-semibold text-ink-dim">{label}</dt>
      <dd className="min-w-0 flex-1 break-all text-[15px]">{children}</dd>
    </div>
  );
}

export default function MyPage() {
  const { t, locale } = useLocale();
  const { user, profile } = useSession();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  if (!profile) return <div data-testid="mypage-screen" />;

  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const isGuest = profile.account_type === "guest";
  const hasPassword = profile.account_type === "email" || profile.account_type === "mobile";
  const mismatch = confirm.length > 0 && next !== confirm;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    setErrorKey(null);
    setSaved(false);
    setLoading(true);
    const result = await changePassword(user.email, current, next, confirm);
    setLoading(false);
    if (!result.ok) {
      setErrorKey(result.errorKey);
      return;
    }
    setSaved(true);
    setEditing(false);
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  return (
    <div data-testid="mypage-screen" className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
      <h1 className="text-[22px] font-extrabold mlandscape:text-[19px]">{t("mypage_title")}</h1>

      <dl className="glass-panel rounded-2xl px-5 py-2">
        <InfoRow label={t("mypage_account_type")}>
          <span className="rounded-full border border-neon-cyan/50 bg-neon-cyan/10 px-2.5 py-0.5 text-[13px] font-bold text-neon-cyan">
            {t(ACCOUNT_LABEL_KEYS[profile.account_type])}
          </span>
        </InfoRow>
        <InfoRow label={isGuest ? t("mypage_nickname") : t("mypage_id")}>
          <span data-testid="mypage-login-id">{profileLoginId(profile)}</span>
        </InfoRow>

        {hasPassword && (
          <InfoRow label={t("mypage_password")}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono tracking-[0.3em]">••••••••</span>
              <button
                type="button"
                onClick={() => {
                  setEditing((v) => !v);
                  setSaved(false);
                }}
                className="btn-ghost flex h-10 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold"
              >
                <KeyRound className="h-4 w-4" />
                {t("mypage_change_password")}
              </button>
            </div>
            <p className="mt-1 text-[12px] text-ink-dim">{t("mypage_password_hint")}</p>
          </InfoRow>
        )}
        {profile.account_type === "google" && (
          <InfoRow label={t("mypage_password")}>
            <span className="text-ink-dim">{t("mypage_google_account")}</span>
          </InfoRow>
        )}

        {isGuest ? (
          <InfoRow label={t("mypage_guest_expires")}>
            {profile.guest_expires_at ? formatter.format(new Date(profile.guest_expires_at)) : "-"}
          </InfoRow>
        ) : (
          <>
            <InfoRow label={t("mypage_joined")}>{formatter.format(new Date(profile.created_at))}</InfoRow>
            {profile.last_login_at && (
              <InfoRow label={t("mypage_last_login")}>{formatter.format(new Date(profile.last_login_at))}</InfoRow>
            )}
            <InfoRow label={t("mypage_locale")}>{LOCALE_PILL_LABELS[locale]}</InfoRow>
          </>
        )}
      </dl>

      {saved && (
        <p className="flex items-center gap-2 rounded-lg border border-[#4dffb5]/40 bg-[#4dffb5]/10 px-3 py-2 text-[14px] text-[#9dffd6]">
          <CheckCircle2 className="h-4 w-4" />
          {t("mypage_password_changed")}
        </p>
      )}

      {hasPassword && editing && (
        <form onSubmit={handleSubmit} className="glass-panel flex flex-col gap-4 rounded-2xl p-5" noValidate>
          <h2 className="text-[16px] font-bold">{t("mypage_change_password")}</h2>
          <PasswordField label={t("mypage_current_password")} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          <PasswordField
            label={t("mypage_new_password")}
            autoComplete="new-password"
            placeholder={t("auth_password_placeholder")}
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <PasswordField label={t("mypage_new_password_confirm")} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <FormError message={mismatch ? t("err_password_mismatch") : errorKey ? t(errorKey) : null} />
          <SubmitButton loading={loading} disabled={!current || !next || !confirm || mismatch}>
            {t("mypage_save")}
          </SubmitButton>
        </form>
      )}

      {isGuest && (
        <Link href="/auth/signup" className="btn-primary flex h-12 items-center justify-center rounded-xl text-[15px]">
          {t("mypage_guest_upsell")}
        </Link>
      )}
    </div>
  );
}
