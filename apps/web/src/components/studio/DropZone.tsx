"use client";

import {
  ACCEPTED_EXTENSIONS,
  MAX_BATCH_BYTES,
  MAX_BATCH_FILES,
  isAcceptedFileName,
  maxBytesFor,
} from "@spritecut/shared";
import { UploadCloud } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { useLocale } from "@/providers/LocaleProvider";

interface DropZoneProps {
  currentCount: number;
  currentBytes: number;
  onFiles: (files: File[]) => void;
  onError: (message: string) => void;
}

export function DropZone({ currentCount, currentBytes, onFiles, onError }: DropZoneProps) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const accept = (list: FileList | null) => {
    if (!list) return;
    const files = [...list];
    const valid: File[] = [];
    for (const file of files) {
      if (!isAcceptedFileName(file.name)) {
        onError(t("err_file_type", { name: file.name }));
        continue;
      }
      if (file.size > maxBytesFor(file.name)) {
        onError(t("err_file_size", { name: file.name }));
        continue;
      }
      valid.push(file);
    }
    const totalBytes = currentBytes + valid.reduce((sum, f) => sum + f.size, 0);
    if (currentCount + valid.length > MAX_BATCH_FILES || totalBytes > MAX_BATCH_BYTES) {
      onError(t("err_batch_limit"));
      return;
    }
    if (valid.length) onFiles(valid);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    accept(e.dataTransfer.files);
  };

  return (
    <button
      type="button"
      data-testid="dropzone"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`relative flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-5 py-10 text-center transition mlandscape:py-6 ${
        dragging
          ? "border-vivid-magenta bg-vivid-magenta/10 shadow-[0_0_30px_rgba(255,0,85,0.45)]"
          : "border-neon-cyan/45 bg-obsidian/50 hover:border-neon-cyan hover:shadow-[0_0_24px_rgba(0,240,255,0.35)]"
      }`}
    >
      <UploadCloud className={`h-10 w-10 ${dragging ? "text-vivid-magenta" : "text-neon-cyan"}`} />
      <span className="text-[15px] font-semibold text-ink">{t("dropzone_prompt")}</span>
      <span className="text-[12px] tracking-wide text-ink-dim">{t("dropzone_formats")}</span>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept={ACCEPTED_EXTENSIONS.join(",")}
        onChange={(e) => {
          accept(e.target.files);
          e.target.value = "";
        }}
      />
    </button>
  );
}
