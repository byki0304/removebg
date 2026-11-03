import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { resolveLayoutMode } from "@/layout/layoutModes";
import { basicBackgroundMatting, estimateBorderColor } from "../basicMatting";
import { cleanGhostPixels, decontaminateColors, findOpaqueBounds, type RgbaImage } from "../postProcess";
import { processImage } from "../processImage";

function solidImage(width: number, height: number, rgb: [number, number, number]): RgbaImage {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
    data[i + 3] = 255;
  }
  return { data, width, height };
}

function paintRect(img: RgbaImage, x0: number, y0: number, w: number, h: number, rgb: [number, number, number]) {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      const i = (y * img.width + x) * 4;
      img.data.set([...rgb, 255], i);
    }
}

describe("postProcess", () => {
  it("removes white halo with the decontamination formula", () => {
    // 50% red over white background: I = 0.5*255 + 0.5*255 for G/B
    const img: RgbaImage = { data: new Uint8Array([255, 128, 128, 128]), width: 1, height: 1 };
    decontaminateColors(img, [255, 255, 255]);
    expect(img.data[0]).toBe(255);
    expect(img.data[1]).toBeLessThanOrEqual(2);
    expect(img.data[2]).toBeLessThanOrEqual(2);
  });

  it("clears ghost pixels below alpha 5", () => {
    const img: RgbaImage = { data: new Uint8Array([10, 20, 30, 4, 10, 20, 30, 5]), width: 2, height: 1 };
    cleanGhostPixels(img);
    expect([...img.data.slice(0, 4)]).toEqual([0, 0, 0, 0]);
    expect(img.data[7]).toBe(5);
  });
});

describe("basic matting", () => {
  it("removes a solid background but keeps interior background-colored pixels", () => {
    const img = solidImage(40, 40, [255, 255, 255]);
    paintRect(img, 10, 10, 20, 20, [20, 40, 200]);
    paintRect(img, 18, 18, 4, 4, [255, 255, 255]); // white "eye" enclosed by the object
    basicBackgroundMatting(img, estimateBorderColor(img));
    expect(img.data[3]).toBe(0);
    expect(img.data[(20 * 40 + 20) * 4 + 3]).toBe(255);
    expect(findOpaqueBounds(img)).toEqual({ left: 10, top: 10, width: 20, height: 20 });
  });
});

describe("processImage", () => {
  it("auto-trims with 2px padding and reports the trim offset", async () => {
    const img = solidImage(64, 48, [255, 255, 255]);
    paintRect(img, 20, 10, 16, 12, [200, 30, 60]);
    const png = await sharp(Buffer.from(img.data), { raw: { width: 64, height: 48, channels: 4 } }).png().toBuffer();
    delete process.env.AI_ENGINE_URL;
    const result = await processImage(png, { autoTrim: true, padding: 2, defringing: true, outputFormat: "png", aiMode: "ultra" });
    expect(result.engine).toBe("basic");
    expect([result.width, result.height]).toEqual([20, 16]);
    expect([result.offsetX, result.offsetY]).toEqual([18, 8]);
    const meta = await sharp(result.buffer).metadata();
    expect(meta.hasAlpha).toBe(true);
  });

  it("keeps original canvas size when auto-trim is off", async () => {
    const img = solidImage(30, 30, [255, 255, 255]);
    paintRect(img, 5, 5, 10, 10, [0, 0, 0]);
    const png = await sharp(Buffer.from(img.data), { raw: { width: 30, height: 30, channels: 4 } }).png().toBuffer();
    const result = await processImage(png, { autoTrim: false, padding: 2, defringing: true, outputFormat: "webp", aiMode: "ultra" });
    expect([result.width, result.height]).toEqual([30, 30]);
    expect(result.contentType).toBe("image/webp");
  });

  it("downscales the result and its geometry to fit maxOutputBytes", async () => {
    const size = 1024;
    const noise = new Uint8Array(size * size * 4);
    for (let i = 0; i < noise.length; i++) noise[i] = (i * 2654435761) >>> 24;
    for (let i = 3; i < noise.length; i += 4) noise[i] = 255;
    const png = await sharp(Buffer.from(noise), { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
    const options = { autoTrim: false, padding: 0, defringing: false, outputFormat: "png", aiMode: "ultra" } as const;

    const full = await processImage(png, options);
    const limit = Math.floor(full.buffer.length / 4);
    const result = await processImage(png, options, { maxOutputBytes: limit });

    expect(full.downscaled).toBe(false);
    expect(result.downscaled).toBe(true);
    expect(result.buffer.length).toBeLessThanOrEqual(limit);
    const meta = await sharp(result.buffer).metadata();
    expect([meta.width, meta.height]).toEqual([result.width, result.height]);
    expect(result.sourceWidth).toBe(result.width);
    expect(result.width).toBeLessThan(size);
  });
});

describe("layout modes", () => {
  it.each([
    [1440, 900, "desktop"],
    [1024, 768, "desktop"],
    [390, 844, "mobilePortrait"],
    [768, 1024, "mobilePortrait"],
    [844, 390, "mobileLandscape"],
    [1180, 500, "mobileLandscape"],
  ] as const)("%ix%i -> %s", (w, h, expected) => {
    expect(resolveLayoutMode(w, h)).toBe(expected);
  });
});
