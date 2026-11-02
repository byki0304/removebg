"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import type { ResultGeometry } from "@/store/studioStore";

export type BrushMode = "restore" | "erase";

export interface BrushCanvasHandle {
  reset: () => void;
  toBlob: () => Promise<Blob | null>;
}

interface BrushCanvasProps {
  resultUrl: string;
  originalUrl?: string;
  geometry?: ResultGeometry;
  mode: BrushMode;
  brushSize: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Restore (+) paints the original source pixels back (mapped through the trim offset);
 * Erase (-) clears alpha to 0. Brush size is in result-image pixels.
 */
export const BrushCanvas = forwardRef<BrushCanvasHandle, BrushCanvasProps>(function BrushCanvas(
  { resultUrl, originalUrl, geometry, mode, brushSize },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const working = useRef<ImageData | null>(null);
  const initial = useRef<ImageData | null>(null);
  const restoreSource = useRef<ImageData | null>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const frame = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await loadImage(resultUrl);
      if (cancelled || !canvasRef.current) return;
      const canvas = canvasRef.current;
      canvas.width = result.naturalWidth;
      canvas.height = result.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(result, 0, 0);
      working.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      initial.current = new ImageData(new Uint8ClampedArray(working.current.data), canvas.width, canvas.height);
      restoreSource.current = null;

      if (originalUrl) {
        const original = await loadImage(originalUrl).catch(() => null);
        if (cancelled || !original) return;
        const sw = geometry?.sourceWidth ?? original.naturalWidth;
        const sh = geometry?.sourceHeight ?? original.naturalHeight;
        const ox = geometry?.offsetX ?? 0;
        const oy = geometry?.offsetY ?? 0;
        const off = document.createElement("canvas");
        off.width = canvas.width;
        off.height = canvas.height;
        const offCtx = off.getContext("2d", { willReadFrequently: true })!;
        offCtx.drawImage(original, -ox, -oy, sw, sh);
        restoreSource.current = offCtx.getImageData(0, 0, off.width, off.height);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resultUrl, originalUrl, geometry]);

  const flush = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      if (working.current) canvasRef.current?.getContext("2d")?.putImageData(working.current, 0, 0);
    });
  }, []);

  const stamp = useCallback(
    (cx: number, cy: number) => {
      const img = working.current;
      if (!img) return;
      const { width, height, data } = img;
      const source = restoreSource.current ?? initial.current;
      const r = brushSize / 2;
      const x0 = Math.max(0, Math.floor(cx - r));
      const x1 = Math.min(width - 1, Math.ceil(cx + r));
      const y0 = Math.max(0, Math.floor(cy - r));
      const y1 = Math.min(height - 1, Math.ceil(cy + r));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x - cx;
          const dy = y - cy;
          if (dx * dx + dy * dy > r * r) continue;
          const i = (y * width + x) * 4;
          if (mode === "erase") {
            data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
          } else if (source) {
            data[i] = source.data[i];
            data[i + 1] = source.data[i + 1];
            data[i + 2] = source.data[i + 2];
            data[i + 3] = restoreSource.current ? 255 : source.data[i + 3];
          }
        }
      }
    },
    [brushSize, mode],
  );

  const toImageCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const paintTo = (point: { x: number; y: number }) => {
    const from = lastPoint.current ?? point;
    const distance = Math.hypot(point.x - from.x, point.y - from.y);
    const steps = Math.max(1, Math.ceil(distance / Math.max(1, brushSize / 4)));
    for (let s = 1; s <= steps; s++) {
      stamp(from.x + ((point.x - from.x) * s) / steps, from.y + ((point.y - from.y) * s) / steps);
    }
    lastPoint.current = point;
    flush();
  };

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (!initial.current) return;
      working.current = new ImageData(new Uint8ClampedArray(initial.current.data), initial.current.width, initial.current.height);
      flush();
    },
    toBlob: () => new Promise((resolve) => canvasRef.current?.toBlob(resolve, "image/png") ?? resolve(null)),
  }));

  return (
    <canvas
      ref={canvasRef}
      data-testid="brush-canvas"
      className="max-h-full max-w-full touch-none cursor-crosshair object-contain [image-rendering:pixelated]"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        lastPoint.current = null;
        paintTo(toImageCoords(e));
      }}
      onPointerMove={(e) => {
        if (e.buttons !== 1 && e.pointerType === "mouse") return;
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        paintTo(toImageCoords(e));
      }}
      onPointerUp={() => {
        lastPoint.current = null;
      }}
    />
  );
});
