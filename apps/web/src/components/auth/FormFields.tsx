"use client";

import { DEFAULT_COUNTRY_CODE } from "@removebg/shared";
import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type InputHTMLAttributes } from "react";
import { useLocale } from "@/providers/LocaleProvider";

const fieldBase = "field h-12 rounded-xl text-[15px] mlandscape:h-11";
const fieldClass = `${fieldBase} w-full px-4`;

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function TextField({ label, id, ...rest }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-[13px] font-semibold text-ink-dim">
        {label}
      </label>
      <input id={inputId} className={fieldClass} {...rest} />
    </div>
  );
}

export function PasswordField({ label, id, ...rest }: TextFieldProps) {
  const { t } = useLocale();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-[13px] font-semibold text-ink-dim">
        {label}
      </label>
      <div className="relative">
        <input id={inputId} type={visible ? "text" : "password"} className={`${fieldClass} pr-12`} {...rest} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t("pw_hide") : t("pw_show")}
          data-inset-control
          className="absolute inset-y-0 right-1 flex w-11 items-center justify-center text-ink-dim hover:text-neon-cyan"
        >
          {visible ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      </div>
    </div>
  );
}

interface MobileNumberInputProps {
  countryCode: string;
  number: string;
  onCountryCodeChange: (value: string) => void;
  onNumberChange: (value: string) => void;
  autoFocus?: boolean;
}

/** Country code on the left (default +82), national number on the right. Hyphens/spaces are accepted as typed. */
export function MobileNumberInput({
  countryCode,
  number,
  onCountryCodeChange,
  onNumberChange,
  autoFocus,
}: MobileNumberInputProps) {
  const { t } = useLocale();
  const ccId = useId();
  const numberId = useId();
  return (
    <div className="flex flex-col gap-1.5" data-testid="mobile-number-input">
      <div className="flex gap-2 text-[13px] font-semibold text-ink-dim">
        <label htmlFor={ccId} className="w-[84px] shrink-0">
          {t("auth_mobile_country")}
        </label>
        <label htmlFor={numberId}>{t("auth_mobile_number")}</label>
      </div>
      <div className="flex gap-2">
        <input
          id={ccId}
          value={countryCode}
          onChange={(e) => onCountryCodeChange(e.target.value.replace(/[^\d+\s-]/g, ""))}
          onBlur={() => {
            if (!countryCode.replace(/[\s+-]/g, "")) onCountryCodeChange(DEFAULT_COUNTRY_CODE);
          }}
          inputMode="tel"
          autoComplete="tel-country-code"
          maxLength={6}
          className={`${fieldBase} w-[84px] shrink-0 px-2 text-center`}
        />
        <input
          id={numberId}
          value={number}
          onChange={(e) => onNumberChange(e.target.value.replace(/[^\d\s-]/g, ""))}
          placeholder="10 1234 5678"
          inputMode="tel"
          autoComplete="tel-national"
          autoFocus={autoFocus}
          maxLength={20}
          className={`${fieldBase} w-0 min-w-0 flex-1 px-4`}
        />
      </div>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-vivid-magenta/40 bg-vivid-magenta/10 px-3 py-2 text-[13px] text-[#ff9fbd]">
      {message}
    </p>
  );
}

export function SubmitButton({ children, loading, disabled }: { children: string; loading?: boolean; disabled?: boolean }) {
  const { t } = useLocale();
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className="btn-primary h-12 w-full rounded-xl text-[16px] mlandscape:h-11"
    >
      {loading ? t("auth_processing") : children}
    </button>
  );
}
