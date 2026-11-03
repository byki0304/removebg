import "server-only";
import type { JobOptions } from "@removebg/shared";
import { MAX_DIMENSION } from "@removebg/shared";
import sharp from "sharp";
import { basicBackgroundMatting, estimateBorderColor, hasMeaningfulTransparency } from "./basicMatting";
import { countGifFrames, isGifBuffer } from "./gifInfo";
import {
  binarizeAlpha,
  cleanGhostPixels,
  decontaminateColors,
  findOpaqueBounds,
  type Rgb,
  type RgbaImage,
} from "./postProcess";

export type EngineName = "ai" | "basic";

export class OutputTooLargeError extends Error {}

export interface ProcessResult {
  buffer: Buffer;
  contentType: string;
  engine: EngineName;
  gifFrames: number | null;
  width: number;
  height: number;
  /** Size of the normalized source the result was cut from (after the 4096px cap). */
  sourceWidth: number;
  sourceHeight: number;
  /** Position of the result's (0,0) in source coordinates; negative when padding was added. */
  offsetX: number;
  offsetY: number;
  /** True when the result was shrunk to fit `maxOutputBytes`; geometry is reported at the shrunk scale. */
  downscaled: boolean;
}

export interface ProcessLimits {
  /** Hosted platforms cap response bodies; larger lossless results are downscaled until they fit. */
  maxOutputBytes?: number;
}

const AI_ENGINE_TIMEOUT_MS = 90_000;
const MAX_DOWNSCALE_ATTEMPTS = 6;

async function decodeRgba(input: Buffer): Promise<RgbaImage> {
  const { data, info } = await sharp(input, { page: 0, animated: false })
    .rotate()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength), width: info.width, height: info.height };
}

async function encodePng(image: RgbaImage): Promise<Buffer> {
  return sharp(Buffer.from(image.data), { raw: { width: image.width, height: image.height, channels: 4 } })
    .png()
    .toBuffer();
}

async function requestAiEngine(png: Buffer, options: JobOptions): Promise<RgbaImage | null> {
  const engineUrl = process.env.AI_ENGINE_URL;
  if (!engineUrl) return null;
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(png)], { type: "image/png" }), "input.png");
  form.append("apply_defringing", String(options.defringing));
  form.append("ai_mode", options.aiMode);
  try {
    const res = await fetch(`${engineUrl.replace(/\/$/, "")}/remove-bg`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(AI_ENGINE_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return decodeRgba(Buffer.from(await res.arrayBuffer()));
  } catch {
    return null;
  }
}

function encodeOutput(image: RgbaImage, options: JobOptions, size?: { width: number; height: number }): Promise<Buffer> {
  let pipeline = sharp(Buffer.from(image.data), { raw: { width: image.width, height: image.height, channels: 4 } });
  if (size) pipeline = pipeline.resize(size.width, size.height, { kernel: options.aiMode === "pixel" ? "nearest" : "lanczos3" });
  return options.outputFormat === "webp"
    ? pipeline.webp({ lossless: true }).toBuffer()
    : pipeline.png({ compressionLevel: 9 }).toBuffer();
}

export async function processImage(input: Buffer, options: JobOptions, limits: ProcessLimits = {}): Promise<ProcessResult> {
  const gifFrames = isGifBuffer(input) ? countGifFrames(input) : null;
  const source = await decodeRgba(input);

  let engine: EngineName = "ai";
  let image = await requestAiEngine(await encodePng(source), options);

  if (!image) {
    engine = "basic";
    image = source;
    if (!hasMeaningfulTransparency(image)) {
      const background: Rgb = estimateBorderColor(image);
      basicBackgroundMatting(image, background);
      if (options.defringing) decontaminateColors(image, background);
    }
  }

  if (options.aiMode === "pixel") binarizeAlpha(image);
  cleanGhostPixels(image);

  let pipeline = sharp(Buffer.from(image.data), { raw: { width: image.width, height: image.height, channels: 4 } });
  let width = image.width;
  let height = image.height;
  let offsetX = 0;
  let offsetY = 0;

  if (options.autoTrim) {
    const bounds = findOpaqueBounds(image);
    if (bounds) {
      const pad = Math.max(0, Math.min(64, Math.round(options.padding)));
      offsetX = bounds.left - pad;
      offsetY = bounds.top - pad;
      pipeline = pipeline.extract(bounds).extend({
        top: pad,
        bottom: pad,
        left: pad,
        right: pad,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      });
      width = bounds.width + pad * 2;
      height = bounds.height + pad * 2;
    }
  }

  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  const trimmed: RgbaImage = { data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength), width: info.width, height: info.height };
  let buffer = await encodeOutput(trimmed, options);
  let scale = 1;

  const maxBytes = limits.maxOutputBytes;
  for (let attempt = 0; maxBytes && buffer.length > maxBytes && attempt < MAX_DOWNSCALE_ATTEMPTS; attempt++) {
    scale *= Math.min(0.9, Math.max(0.5, Math.sqrt(maxBytes / buffer.length) * 0.95));
    const size = { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
    buffer = await encodeOutput(trimmed, options, size);
  }
  if (maxBytes && buffer.length > maxBytes) throw new OutputTooLargeError();

  return {
    buffer,
    contentType: options.outputFormat === "webp" ? "image/webp" : "image/png",
    engine,
    gifFrames,
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    sourceWidth: Math.round(source.width * scale),
    sourceHeight: Math.round(source.height * scale),
    offsetX: Math.round(offsetX * scale),
    offsetY: Math.round(offsetY * scale),
    downscaled: scale < 1,
  };
}
