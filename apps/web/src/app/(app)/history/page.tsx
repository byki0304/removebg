"use client";

import type { JobRecord, JobStatus, TranslationKey } from "@spritecut/shared";
import { useEffect, useState } from "react";
import { fetchJobs } from "@/lib/jobService";
import { useLocale } from "@/providers/LocaleProvider";
import { useSession } from "@/providers/SessionProvider";

const STATUS_KEYS: Record<JobStatus, TranslationKey> = {
  QUEUED: "ws_status_queued",
  PROCESSING: "ws_status_processing",
  COMPLETED: "ws_status_completed",
  FAILED: "ws_status_failed",
  EXPIRED: "history_expired",
};

const STATUS_COLORS: Record<JobStatus, string> = {
  QUEUED: "text-ink-dim border-ink-dim/40",
  PROCESSING: "text-neon-cyan border-neon-cyan/50",
  COMPLETED: "text-[#4dffb5] border-[#4dffb5]/50",
  FAILED: "text-vivid-magenta border-vivid-magenta/50",
  EXPIRED: "text-ink-dim border-ink-dim/30",
};

export default function HistoryPage() {
  const { t, locale } = useLocale();
  const { profile } = useSession();
  const [jobs, setJobs] = useState<JobRecord[] | null>(null);

  useEffect(() => {
    if (!profile) return;
    void fetchJobs().then(setJobs);
  }, [profile]);

  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div data-testid="history-screen" className="flex flex-col gap-4">
      <h1 className="text-[22px] font-extrabold mlandscape:text-[19px]">{t("history_title")}</h1>
      <div className="glass-panel overflow-hidden rounded-2xl">
        {jobs === null || jobs.length === 0 ? (
          <p className="p-8 text-center text-[14px] text-ink-dim">{t("history_empty")}</p>
        ) : (
          <ul className="divide-y divide-ink-dim/15">
            {jobs.map((job) => (
              <li key={job.id} className="flex items-center gap-3 px-4 py-3 mportrait:flex-wrap">
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{job.original_file_name}</span>
                <span className="shrink-0 text-[13px] text-ink-dim tabular-nums">{formatter.format(new Date(job.created_at))}</span>
                <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[12px] font-semibold ${STATUS_COLORS[job.status]}`}>
                  {t(STATUS_KEYS[job.status])}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-[13px] text-ink-dim">{t("ttl_warning")}</p>
    </div>
  );
}
