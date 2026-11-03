import { HOSTED_BODY_BUDGET_BYTES, MAX_DIMENSION } from "@removebg/shared";

export interface PreparedUpload {
  file: File;
  resized: boolean;
}

export class UploadTooLargeError extends Error {}

const MIN_SIDE = 256;
const MAX_ATTEMPTS = 6;
const EXTENSIONS: Record<string, string> = { "image/png": "png", "image/webp": "webp", "image/jpeg": "jpg" };

interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

async function decode(file: File): Promise<Decoded> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function isOpaque(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  const { data } = ctx.getImageData(0, 0, width, height);
  for (let i = 3; i < data.length; i += 4) if (data[i] !== 255) return false;
  return true;
}

/**
 * Encodes the canvas with the best format that fits the budget: lossless PNG, then high-quality WebP
 * (keeps alpha), then JPEG for fully opaque images. Returns the smallest attempt when nothing fits.
 */
async function encodeWithinBudget(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  budget: number,
): Promise<{ blob: Blob | null; smallest: number }> {
  let smallest = Infinity;
  const attempts: Array<() => Promise<Blob | null>> = [
    () => toBlob(canvas, "image/png"),
    async () => {
      const blob = await toBlob(canvas, "image/webp", 0.92);
      return blob?.type === "image/webp" ? blob : null;
    },
    async () => (isOpaque(ctx, canvas.width, canvas.height) ? toBlob(canvas, "image/jpeg", 0.9) : null),
  ];
  for (const attempt of attempts) {
    const blob = await attempt();
    if (!blob) continue;
    if (blob.size <= budget) return { blob, smallest: blob.size };
    smallest = Math.min(smallest, blob.size);
  }
  return { blob: null, smallest };
}

function renamed(name: string, type: string): string {
  return `${name.replace(/\.[^.]+$/, "")}.${EXTENSIONS[type] ?? "png"}`;
}

/**
 * Shrinks images in the browser so the upload (and the lossless result) fit the hosted function body limit.
 * Files already under the budget are sent untouched.
 */
export async function prepareUpload(
  file: File,
  { budget = HOSTED_BODY_BUDGET_BYTES, pixelArt = false }: { budget?: number; pixelArt?: boolean } = {},
): Promise<PreparedUpload> {
  if (file.size <= budget) return { file, resized: false };

  const decoded = await decode(file).catch(() => {
    throw new UploadTooLargeError();
  });
  try {
    let scale = Math.min(1, MAX_DIMENSION / Math.max(decoded.width, decoded.height));
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const width = Math.max(1, Math.round(decoded.width * scale));
      const height = Math.max(1, Math.round(decoded.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) break;
      ctx.imageSmoothingEnabled = !pixelArt;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(decoded.source, 0, 0, width, height);

      const { blob, smallest } = await encodeWithinBudget(canvas, ctx, budget);
      canvas.width = canvas.height = 0;
      if (blob) return { file: new File([blob], renamed(file.name, blob.type), { type: blob.type }), resized: true };

      if (Math.max(width, height) <= MIN_SIDE) break;
      scale *= Math.min(0.9, Math.max(0.5, Math.sqrt(budget / smallest) * 0.95));
    }
  } finally {
    decoded.release();
  }
  throw new UploadTooLargeError();
}
