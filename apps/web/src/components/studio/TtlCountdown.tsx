"use client";

import { FILE_TTL_HOURS } from "@spritecut/shared";
import { useEffect, useState } from "react";
import { useLocale } from "@/providers/LocaleProvider";

export function TtlCountdown({ since }: { since: number }) {
  const { t } = useLocale();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const remainingMs = Math.max(0, since + FILE_TTL_HOURS * 3600_000 - now);
  const h = Math.floor(remainingMs / 3600_000);
  const m = Math.floor((remainingMs % 3600_000) / 60_000);
  return <span className="text-[12px] text-ink-dim tabular-nums">{t("ws_ttl_countdown", { h, m })}</span>;
}
