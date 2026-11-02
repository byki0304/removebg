export interface RgbaImage {
  data: Uint8Array;
  width: number;
  height: number;
}

export type Rgb = [number, number, number];

export const ALPHA_GHOST_THRESHOLD = 5;
const EPSILON = 1e-5;

/** F_clean = clip((I - (1 - alpha) * B) / max(alpha, epsilon), 0, 255) applied to semi-transparent pixels only. */
export function decontaminateColors(image: RgbaImage, background: Rgb): void {
  const { data } = image;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0 || a === 255) continue;
    const alpha = a / 255;
    const inv = 1 - alpha;
    const denom = Math.max(alpha, EPSILON);
    for (let c = 0; c < 3; c++) {
      const value = (data[i + c] - inv * background[c]) / denom;
      data[i + c] = value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
    }
  }
}

/** alpha < 5 becomes fully transparent with RGB zeroed for clean edges and better PNG compression. */
export function cleanGhostPixels(image: RgbaImage, threshold = ALPHA_GHOST_THRESHOLD): void {
  const { data } = image;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < threshold) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    }
  }
}

/** Pixel-art mode: hard edges only (alpha < 128 -> 0, else 255). */
export function binarizeAlpha(image: RgbaImage): void {
  const { data } = image;
  for (let i = 3; i < data.length; i += 4) data[i] = data[i] < 128 ? 0 : 255;
}

export interface Bounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function findOpaqueBounds(image: RgbaImage): Bounds | null {
  const { data, width, height } = image;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (data[row + x * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}
