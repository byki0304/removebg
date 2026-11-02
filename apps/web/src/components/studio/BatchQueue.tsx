"use client";

import type { TranslationKey } from "@spritecut/shared";
import JSZip from "jszip";
import { CheckCircle2, Download, Loader2, PackageOpen, Swords, Trash2, XCircle } from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/providers/LocaleProvider";
import { resultFileName, useStudioStore, type QueueItem, type QueueStatus } from "@/store/studioStore";
import { TtlCountdown } from "./TtlCountdown";

const STATUS_KEYS: Record<QueueStatus, TranslationKey> = {
  queued: "ws_status_queued",
  processing: "ws_status_processing",
  completed: "ws_status_completed",
  failed: "ws_status_failed",
};

function StatusIcon({ status }: { status: QueueStatus }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-[#4dffb5]" />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-vivid-magenta" />;
  if (status === "processing") return <Loader2 className="h-4 w-4 animate-spin text-neon-cyan" />;
  return <span className="h-2 w-2 rounded-full bg-ink-dim" />;
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function BatchQueue({ processing, onStart }: { processing: boolean; onStart: () => void }) {
  const { t } = useLocale();
  const { items, options, selectedId, select, removeItem, clear } = useStudioStore();
  const done = items.filter((i) => i.status === "completed" || i.status === "failed").length;
  const completed = items.filter((i): i is QueueItem & { resultBlob: Blob } => i.status === "completed" && !!i.resultBlob);
  const pending = items.some((i) => i.status === "queued");
  const progress = items.length ? Math.round((done / items.length) * 100) : 0;
  const oldest = items.length ? Math.min(...items.map((i) => i.addedAt)) : null;

  const downloadZip = async () => {
    const zip = new JSZip();
    completed.forEach((item) => zip.file(resultFileName(item.name, options.outputFormat), item.resultBlob));
    triggerDownload(await zip.generateAsync({ type: "blob" }), "spritecut_result.zip");
  };

  return (
    <div className="flex h-full flex-col gap-3" data-testid="batch-queue">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[16px] font-bold">
          {t("ws_queue")} <span className="text-ink-dim">({items.length})</span>
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={clear}
            disabled={!items.length || processing}
            className="btn-ghost h-10 rounded-lg px-3 text-[13px] font-semibold disabled:opacity-40"
          >
            {t("ws_clear")}
          </button>
          <button
            type="button"
            onClick={onStart}
            disabled={!pending || processing}
            data-testid="start-processing"
            className="btn-primary h-10 rounded-lg px-4 text-[13px]"
          >
            {t("ws_start")}
          </button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[12px] text-ink-dim">
            <span>{t("ws_progress")}</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-obsidian">
            <div className="h-full bg-gradient-to-r from-neon-cyan to-electric-purple transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <ul className="flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto">
        {items.length === 0 && <li className="py-6 text-center text-[14px] text-ink-dim">{t("ws_queue_empty")}</li>}
        {items.map((item) => (
          <li
            key={item.id}
            className={`flex items-center gap-3 rounded-xl border p-2 transition ${
              selectedId === item.id ? "border-neon-cyan/70 bg-neon-cyan/5" : "border-ink-dim/20"
            }`}
          >
            <button type="button" onClick={() => select(item.id)} className="checkerboard h-12 w-12 shrink-0 overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.resultUrl ?? item.originalUrl} alt="" className="h-full w-full object-contain" />
            </button>
            <button type="button" onClick={() => select(item.id)} className="flex min-w-0 flex-1 flex-col items-start text-left">
              <span className="w-full truncate text-[14px] font-medium">{item.name}</span>
              <span className="flex items-center gap-1.5 text-[12px] text-ink-dim">
                <StatusIcon status={item.status} />
                {t(STATUS_KEYS[item.status])}
                {item.gifFrames && item.gifFrames > 1 ? " · GIF → Frame 0" : ""}
              </span>
            </button>
            {item.status === "completed" && item.resultBlob && (
              <button
                type="button"
                aria-label={t("ws_download")}
                onClick={() => triggerDownload(item.resultBlob!, resultFileName(item.name, options.outputFormat))}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-neon-cyan hover:bg-neon-cyan/10"
              >
                <Download className="h-[18px] w-[18px]" />
              </button>
            )}
            <button
              type="button"
              aria-label="Remove"
              onClick={() => removeItem(item.id)}
              disabled={item.status === "processing"}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-dim hover:bg-vivid-magenta/10 hover:text-vivid-magenta disabled:opacity-30"
            >
              <Trash2 className="h-[18px] w-[18px]" />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 border-t border-ink-dim/15 pt-3">
        {oldest && <TtlCountdown since={oldest} />}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/simulator"
            className={`btn-ghost flex h-11 items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold ${
              completed.length ? "" : "pointer-events-none opacity-40"
            }`}
          >
            <Swords className="h-4 w-4" />
            {t("ws_open_simulator")}
          </Link>
          <button
            type="button"
            onClick={downloadZip}
            disabled={!completed.length}
            className="btn-primary flex h-11 items-center justify-center gap-1.5 rounded-xl text-[13px]"
          >
            <PackageOpen className="h-4 w-4" />
            {t("ws_download_zip")}
          </button>
        </div>
      </div>
    </div>
  );
}
