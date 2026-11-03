"use client";

import type { JobOptions } from "@removebg/shared";
import { create } from "zustand";

export type QueueStatus = "queued" | "processing" | "completed" | "failed";

export interface QueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  status: QueueStatus;
  originalUrl: string;
  resultBlob?: Blob;
  resultUrl?: string;
  engine?: "ai" | "basic";
  gifFrames?: number | null;
  geometry?: ResultGeometry;
  /** Shrunk in the browser or on the server to fit the hosted body-size limit. */
  downscaled?: boolean;
  errorKey?: string;
  addedAt: number;
}

export interface ResultGeometry {
  sourceWidth: number;
  sourceHeight: number;
  offsetX: number;
  offsetY: number;
}

export function parseGeometry(headers: Headers): ResultGeometry | undefined {
  const size = headers.get("X-Source-Size")?.split("x").map(Number);
  const offset = headers.get("X-Trim-Offset")?.split(",").map(Number);
  if (!size || !offset || size.length !== 2 || offset.length !== 2 || [...size, ...offset].some(Number.isNaN)) return undefined;
  return { sourceWidth: size[0], sourceHeight: size[1], offsetX: offset[0], offsetY: offset[1] };
}

interface StudioState {
  options: JobOptions;
  items: QueueItem[];
  selectedId: string | null;
  setOptions: (patch: Partial<JobOptions>) => void;
  addFiles: (files: File[]) => void;
  updateItem: (id: string, patch: Partial<QueueItem>) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  select: (id: string | null) => void;
}

const DEFAULT_OPTIONS: JobOptions = {
  autoTrim: true,
  padding: 2,
  defringing: true,
  outputFormat: "png",
  aiMode: "ultra",
};

function revoke(item: QueueItem) {
  URL.revokeObjectURL(item.originalUrl);
  if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
}

export const useStudioStore = create<StudioState>((set, get) => ({
  options: DEFAULT_OPTIONS,
  items: [],
  selectedId: null,
  setOptions: (patch) => set({ options: { ...get().options, ...patch } }),
  addFiles: (files) =>
    set({
      items: [
        ...get().items,
        ...files.map<QueueItem>((file) => ({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          size: file.size,
          status: "queued",
          originalUrl: URL.createObjectURL(file),
          addedAt: Date.now(),
        })),
      ],
    }),
  updateItem: (id, patch) =>
    set({ items: get().items.map((item) => (item.id === id ? { ...item, ...patch } : item)) }),
  removeItem: (id) => {
    const target = get().items.find((item) => item.id === id);
    if (target) revoke(target);
    set({
      items: get().items.filter((item) => item.id !== id),
      selectedId: get().selectedId === id ? null : get().selectedId,
    });
  },
  clear: () => {
    get().items.forEach(revoke);
    set({ items: [], selectedId: null });
  },
  select: (id) => set({ selectedId: id }),
}));

export function resultFileName(name: string, format: JobOptions["outputFormat"]): string {
  const base = name.replace(/\.[^.]+$/, "");
  return `${base}.${format}`;
}
