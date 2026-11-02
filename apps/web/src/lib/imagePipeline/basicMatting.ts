import type { Rgb, RgbaImage } from "./postProcess";

const SOFT_EDGE_START = 18;
const SOFT_EDGE_END = 64;
const BORDER_SAMPLE_WIDTH = 2;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 255;
}

export function estimateBorderColor(image: RgbaImage): Rgb {
  const { data, width, height } = image;
  const r: number[] = [];
  const g: number[] = [];
  const b: number[] = [];
  const push = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    r.push(data[i]);
    g.push(data[i + 1]);
    b.push(data[i + 2]);
  };
  for (let d = 0; d < BORDER_SAMPLE_WIDTH; d++) {
    for (let x = 0; x < width; x++) {
      push(x, Math.min(d, height - 1));
      push(x, Math.max(height - 1 - d, 0));
    }
    for (let y = 0; y < height; y++) {
      push(Math.min(d, width - 1), y);
      push(Math.max(width - 1 - d, 0), y);
    }
  }
  return [median(r), median(g), median(b)];
}

export function hasMeaningfulTransparency(image: RgbaImage): boolean {
  const { data } = image;
  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 250) transparent++;
  return transparent / (data.length / 4) > 0.02;
}

/**
 * Fallback matting for when the AI engine is unreachable. Flood-fills the background
 * from the image border by color distance so that interior regions matching the
 * background color (eyes, highlights) are preserved, and ramps alpha at soft edges.
 */
export function basicBackgroundMatting(image: RgbaImage, background: Rgb): void {
  const { data, width, height } = image;
  const total = width * height;
  const distance = new Float32Array(total);
  for (let p = 0; p < total; p++) {
    const i = p * 4;
    const dr = data[i] - background[0];
    const dg = data[i + 1] - background[1];
    const db = data[i + 2] - background[2];
    distance[p] = Math.sqrt(dr * dr + dg * dg + db * db);
  }

  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;
  const enqueue = (p: number) => {
    if (visited[p] || distance[p] >= SOFT_EDGE_END) return;
    visited[p] = 1;
    queue[tail++] = p;
  };
  for (let x = 0; x < width; x++) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }
  while (head < tail) {
    const p = queue[head++];
    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) enqueue(p - 1);
    if (x < width - 1) enqueue(p + 1);
    if (y > 0) enqueue(p - width);
    if (y < height - 1) enqueue(p + width);
  }

  for (let p = 0; p < total; p++) {
    if (!visited[p]) continue;
    const d = distance[p];
    const ramp = d <= SOFT_EDGE_START ? 0 : (d - SOFT_EDGE_START) / (SOFT_EDGE_END - SOFT_EDGE_START);
    const i = p * 4 + 3;
    data[i] = Math.min(data[i], Math.round(ramp * 255));
  }
}
