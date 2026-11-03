import { useId } from "react";

/**
 * RemoveBg AI mark: a neon subject half and a transparent (checkerboard) half split by a magenta
 * cut line, with background pixels flying off. Keep in sync with `public/brand/logo-mark.svg`.
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}-subject`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00F0FF" />
          <stop offset="1" stopColor="#9D00FF" />
        </linearGradient>
        <pattern id={`${id}-checker`} width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#22252F" />
          <rect width="4" height="4" fill="#353948" />
          <rect x="4" y="4" width="4" height="4" fill="#353948" />
        </pattern>
        <clipPath id={`${id}-tile`}>
          <rect width="48" height="48" rx="12" />
        </clipPath>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g clipPath={`url(#${id}-tile)`}>
        <rect width="48" height="48" fill={`url(#${id}-checker)`} />
        <path d="M0 0H31L17 48H0Z" fill={`url(#${id}-subject)`} />
        <path d="M7 9h9v9H7z M4 19h15v12H4z M4 31h6v6H4z M13 31h6v6h-6z" fill="#FFFFFF" />
        <path d="M9 12h2v2H9z M12 12h2v2h-2z" fill="#0B0C10" />
        <rect x="36" y="9" width="4" height="4" fill="#FF0055" />
        <rect x="40" y="19" width="3" height="3" fill="#00F0FF" />
        <rect x="35" y="30" width="3" height="3" fill="#9D00FF" />
      </g>
      <path d="M31 -1L17 49" stroke="#FF0055" strokeWidth="2.6" strokeLinecap="round" filter={`url(#${id}-glow)`} />
      <rect x="0.75" y="0.75" width="46.5" height="46.5" rx="11.25" fill="none" stroke="#FFFFFF" strokeOpacity="0.14" strokeWidth="1.5" />
    </svg>
  );
}

type LogoSize = "sm" | "md" | "lg";

const SIZES: Record<LogoSize, { mark: number; text: string; badge: string; gap: string }> = {
  sm: { mark: 28, text: "text-[17px] mlandscape:text-[15px]", badge: "text-[12px] px-1 py-px", gap: "gap-2" },
  md: { mark: 36, text: "text-[22px]", badge: "text-[12px] px-1.5 py-0.5", gap: "gap-2.5" },
  lg: { mark: 72, text: "text-[clamp(38px,7.5vmin,80px)]", badge: "text-[max(12px,0.32em)] px-[0.3em] py-[0.08em]", gap: "gap-4" },
};

/** Wordmark "RemoveBg AI" with the mark. The visible name is the same in every language. */
export function BrandLogo({ size = "sm", className = "" }: { size?: LogoSize; className?: string }) {
  const s = SIZES[size];
  return (
    <span className={`inline-flex items-center ${s.gap} ${className}`} data-testid="brand-logo">
      <LogoMark size={s.mark} className="shrink-0 drop-shadow-[0_0_10px_rgba(0,240,255,0.35)]" />
      <span aria-hidden className={`inline-flex items-center gap-[0.25em] font-black leading-none tracking-tight whitespace-nowrap ${s.text}`}>
        <span>
          <span className="text-ink">Remove</span>
          <span className="bg-gradient-to-r from-neon-cyan to-vivid-magenta bg-clip-text text-transparent">Bg</span>
        </span>
        <span className={`rounded-md border border-neon-cyan/50 bg-neon-cyan/10 font-extrabold tracking-wider text-neon-cyan ${s.badge}`}>AI</span>
      </span>
      <span className="sr-only">RemoveBg AI</span>
    </span>
  );
}
