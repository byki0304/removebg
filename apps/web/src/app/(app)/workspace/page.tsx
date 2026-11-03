"use client";

import { AlertTriangle, X } from "lucide-react";
import { useCallback, useState } from "react";
import { BatchQueue } from "@/components/studio/BatchQueue";
import { DropZone } from "@/components/studio/DropZone";
import { OptionsPanel } from "@/components/studio/OptionsPanel";
import { prepareUpload, UploadTooLargeError } from "@/lib/imagePipeline/prepareUpload";
import { recordJob } from "@/lib/jobService";
import { useLocale } from "@/providers/LocaleProvider";
import { parseGeometry, useStudioStore } from "@/store/studioStore";

const CONCURRENCY = 2;

export default function WorkspacePage() {
  const { t } = useLocale();
  const { items, addFiles, updateItem, selectedId } = useStudioStore();
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const selected = items.find((i) => i.id === selectedId) ?? items[0];
  const usedBasicEngine = items.some((i) => i.engine === "basic");

  const pushError = useCallback((message: string) => setErrors((prev) => [...prev.slice(-3), message]), []);

  const startProcessing = async () => {
    setProcessing(true);
    const options = useStudioStore.getState().options;
    const queue = useStudioStore.getState().items.filter((i) => i.status === "queued");

    const worker = async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        updateItem(item.id, { status: "processing" });
        try {
          const upload = window.removebgDesktop
            ? { file: item.file, resized: false }
            : await prepareUpload(item.file, { pixelArt: options.aiMode === "pixel" });
          const form = new FormData();
          form.append("file", upload.file);
          form.append("options", JSON.stringify(options));
          const res = await fetch("/api/remove-bg", { method: "POST", body: form });
          if (res.status === 413) throw new UploadTooLargeError();
          if (!res.ok) throw new Error(String(res.status));
          const blob = await res.blob();
          const frames = res.headers.get("X-Gif-Frames");
          updateItem(item.id, {
            status: "completed",
            resultBlob: blob,
            resultUrl: URL.createObjectURL(blob),
            engine: res.headers.get("X-Engine") === "ai" ? "ai" : "basic",
            gifFrames: frames ? Number(frames) : null,
            geometry: parseGeometry(res.headers),
            downscaled: upload.resized || res.headers.get("X-Downscaled") === "1",
          });
          void recordJob(item.name, options, true);
        } catch (error) {
          if (error instanceof UploadTooLargeError) pushError(t("err_file_size", { name: item.name }));
          updateItem(item.id, { status: "failed" });
          void recordJob(item.name, options, false);
        }
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    setProcessing(false);
  };

  const currentBytes = items.reduce((sum, i) => sum + i.size, 0);

  return (
    <div
      data-testid="workspace-screen"
      className="grid gap-4 desktop:grid-cols-[280px_minmax(0,1fr)_340px] desktop:items-start mlandscape:grid-cols-2 mportrait:grid-cols-1"
    >
      <aside className="glass-panel rounded-2xl p-4 desktop:sticky desktop:top-[calc(var(--topbar-h)+16px)] mportrait:order-2 mlandscape:order-2">
        <OptionsPanel />
      </aside>

      <section className="flex min-w-0 flex-col gap-4 mportrait:order-1 mlandscape:order-1">
        <DropZone
          currentCount={items.length}
          currentBytes={currentBytes}
          onFiles={addFiles}
          onError={pushError}
        />

        {errors.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {errors.map((message, i) => (
              <div key={`${message}-${i}`} className="flex items-center gap-2 rounded-lg border border-vivid-magenta/40 bg-vivid-magenta/10 px-3 py-2 text-[13px] text-[#ff9fbd]">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="flex-1">{message}</span>
                <button type="button" aria-label="Dismiss" onClick={() => setErrors((prev) => prev.filter((_, j) => j !== i))}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {usedBasicEngine && (
          <p className="rounded-lg border border-electric-purple/40 bg-electric-purple/10 px-3 py-2 text-[13px] text-[#d7a6ff]">
            {t("ws_engine_basic")}
          </p>
        )}

        {selected && (
          <div className="glass-panel grid gap-3 rounded-2xl p-3 desktop:grid-cols-2 mlandscape:grid-cols-1 mportrait:grid-cols-1">
            <figure className="flex flex-col gap-2">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-obsidian">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selected.originalUrl} alt={selected.name} className="max-h-full max-w-full object-contain" />
              </div>
            </figure>
            <figure className="flex flex-col gap-2">
              <div className="checkerboard flex aspect-square items-center justify-center overflow-hidden rounded-xl">
                {selected.resultUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={selected.resultUrl} alt="" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="rounded-md bg-obsidian/80 px-2 py-1 text-[12px] text-ink-dim">{t("ws_status_queued")}</span>
                )}
              </div>
            </figure>
          </div>
        )}

        <p className="text-[13px] text-ink-dim">{t("ttl_warning")}</p>
      </section>

      <aside className="glass-panel rounded-2xl p-4 desktop:sticky desktop:top-[calc(var(--topbar-h)+16px)] desktop:max-h-[calc(100dvh-var(--topbar-h)-32px)] mportrait:order-3 mlandscape:order-3 mlandscape:col-span-2">
        <BatchQueue processing={processing} onStart={startProcessing} />
      </aside>
    </div>
  );
}
