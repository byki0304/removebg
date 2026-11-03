// Generates every install icon (mobile + desktop) from the RemoveBg AI mark.
// Output: assets/icons/** (source of truth) and the copies the web app serves (apps/web/public/icons, app/apple-icon.png, app/favicon.ico).
// Usage: npm run icons
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "assets", "icons");
const WEB_PUBLIC_ICONS = path.join(ROOT, "apps", "web", "public", "icons");
const WEB_APP_DIR = path.join(ROOT, "apps", "web", "src", "app");

const C = {
  bg: "#0B0C10",
  cyan: "#00F0FF",
  purple: "#9D00FF",
  magenta: "#FF0055",
  checkA: "#22252F",
  checkB: "#353948",
};

// The cut line x = 31 - 14y/48, extended far past the 48x48 tile so scaled-down (full-bleed) layouts stay covered.
const SUBJECT = "M-40 -40H42.667L5.333 88H-40Z";
const CUT_LINE = "M42.667 -40L5.333 88";
const BODY = "M7 9h9v9H7z M4 19h15v12H4z M4 31h6v6H4z M13 31h6v6h-6z";
const EYES = "M9 12h2v2H9z M12 12h2v2h-2z";

// ---------- SVG building blocks (48-unit design grid) ----------

function defs(detail) {
  const cell = detail === "small" ? 12 : 4;
  return `
    <linearGradient id="subject" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="48" y2="48">
      <stop offset="0" stop-color="${C.cyan}"/><stop offset="1" stop-color="${C.purple}"/>
    </linearGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.cyan}" stop-opacity="0.85"/>
      <stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0.12"/>
      <stop offset="1" stop-color="${C.magenta}" stop-opacity="0.85"/>
    </linearGradient>
    <pattern id="checker" width="${cell * 2}" height="${cell * 2}" patternUnits="userSpaceOnUse">
      <rect width="${cell * 2}" height="${cell * 2}" fill="${C.checkA}"/>
      <rect width="${cell}" height="${cell}" fill="${C.checkB}"/>
      <rect x="${cell}" y="${cell}" width="${cell}" height="${cell}" fill="${C.checkB}"/>
    </pattern>
    <pattern id="scan" width="2" height="2" patternUnits="userSpaceOnUse">
      <rect width="2" height="0.6" fill="#FFFFFF" fill-opacity="0.08"/>
    </pattern>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="${detail === "small" ? 0.8 : 1.6}" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="pxglow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="0.7" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="drop" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0.9" stdDeviation="1.3" flood-color="#000000" flood-opacity="0.5"/>
    </filter>`;
}

function background(detail) {
  return `<rect x="-40" y="-40" width="128" height="128" fill="url(#checker)"/>
    <path d="${SUBJECT}" fill="url(#subject)"/>
    ${detail === "full" ? `<path d="${SUBJECT}" fill="url(#scan)"/>` : ""}`;
}

function character(detail, eyes) {
  const shadow = detail === "full" ? `<path d="${BODY}" fill="${C.bg}" fill-opacity="0.3" transform="translate(1.2 1.2)"/>` : "";
  return `${shadow}<path d="${BODY}" fill="#FFFFFF"/>${eyes ? `<path d="${EYES}" fill="${C.bg}"/>` : ""}`;
}

function pixels(detail) {
  const sq = (x, y, s, color, opacity = 1) =>
    `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${color}" fill-opacity="${opacity}"/>`;
  if (detail === "small") return sq(35, 8, 6, C.magenta);
  return `<g filter="url(#pxglow)">
    ${sq(36, 9, 4, C.magenta)}${sq(41.5, 7.6, 2, C.magenta, 0.55)}${sq(44.6, 6.8, 1, C.magenta, 0.3)}
    ${sq(39, 19, 3, C.cyan)}${sq(43.2, 18.6, 1.6, C.cyan, 0.5)}
    ${sq(34, 30, 3, C.purple)}${sq(38.2, 29.6, 1.6, C.purple, 0.5)}${sq(40.8, 29.2, 0.9, C.purple, 0.3)}
  </g>`;
}

function cut(detail) {
  const width = detail === "small" ? 4 : 2.6;
  const core = detail === "full" ? `<path d="${CUT_LINE}" stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="0.7"/>` : "";
  return `<path d="${CUT_LINE}" stroke="${C.magenta}" stroke-width="${width}" filter="url(#glow)"/>${core}`;
}

function scene(detail, { eyes = true, withBackground = true, withForeground = true } = {}) {
  return `${withBackground ? background(detail) : ""}${
    withForeground ? character(detail, eyes) + pixels(detail) + cut(detail) : ""
  }`;
}

function svgDoc(size, viewBox, body, extraDefs = "", detail = "full") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${viewBox}">
  <defs>${defs(detail)}${extraDefs}</defs>${body}</svg>`;
}

function detailFor(size) {
  return size <= 32 ? "small" : "full";
}

/** Rounded app tile with transparent padding (desktop, PWA "any", Android legacy). */
function tileSvg(size, { padRatio = 0, radius = 11, shadow = false } = {}) {
  const detail = detailFor(size);
  const pad = size * padRatio;
  const scale = (size - pad * 2) / 48;
  const rim =
    detail === "full"
      ? `<rect x="0.6" y="0.6" width="46.8" height="46.8" rx="${radius - 0.6}" fill="none" stroke="url(#rim)" stroke-width="1.2"/>`
      : `<rect x="0.75" y="0.75" width="46.5" height="46.5" rx="${radius - 0.75}" fill="none" stroke="#FFFFFF" stroke-opacity="0.2" stroke-width="1.5"/>`;
  const body = `<g transform="translate(${pad} ${pad}) scale(${scale})">
    ${shadow ? `<rect width="48" height="48" rx="${radius}" fill="${C.bg}" filter="url(#drop)"/>` : ""}
    <g clip-path="url(#tile)">${scene(detail, { eyes: size > 32 })}</g>
    ${rim}
  </g>`;
  return svgDoc(size, `0 0 ${size} ${size}`, body, `<clipPath id="tile"><rect width="48" height="48" rx="${radius}"/></clipPath>`, detail);
}

/** Square full-bleed artwork; the OS applies its own mask. `k` shrinks the subject into the platform safe zone. */
function bleedSvg(size, k, options = {}) {
  const detail = detailFor(size);
  const transform = `translate(24 24) scale(${k}) translate(-24 -24)`;
  const body = `<g transform="${transform}">${scene(detail, { eyes: size > 32, ...options })}</g>`;
  return svgDoc(size, "0 0 48 48", body, "", detail);
}

/** Circular launcher icon (Android ic_launcher_round). */
function roundSvg(size) {
  const detail = detailFor(size);
  const body = `<g clip-path="url(#circle)"><g transform="translate(24 24) scale(0.8) translate(-24 -24)">${scene(detail, {
    eyes: size > 32,
  })}</g></g><circle cx="24" cy="24" r="23.4" fill="none" stroke="#FFFFFF" stroke-opacity="0.16" stroke-width="1.2"/>`;
  return svgDoc(size, "0 0 48 48", body, `<clipPath id="circle"><circle cx="24" cy="24" r="24"/></clipPath>`, detail);
}

/** Single-colour silhouette used as an alpha mask (Android 13 themed icons, PWA "monochrome"). */
function monochromeSvg(size, k) {
  const transform = `translate(24 24) scale(${k}) translate(-24 -24)`;
  const body = `<g transform="${transform}" fill="#FFFFFF">
    <path d="${BODY} ${EYES}" fill-rule="evenodd"/>
    <rect x="36" y="9" width="4" height="4"/><rect x="39" y="19" width="3" height="3"/><rect x="34" y="30" width="3" height="3"/>
    <path d="M31 0L17 48" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round"/>
  </g>`;
  return svgDoc(size, "0 0 48 48", body);
}

// ---------- raster + container writers ----------

async function png(svg, file, { flatten = false } = {}) {
  let img = sharp(Buffer.from(svg));
  if (flatten) img = img.flatten({ background: C.bg });
  const buffer = await img.png({ compressionLevel: 9 }).toBuffer();
  if (file) write(file, buffer);
  return buffer;
}

function write(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
}

/** ICO with BMP (DIB) frames below 256px and a PNG frame at 256px ??the layout NSIS and old Windows shells accept. */
async function buildIco(svgForSize, sizes) {
  const frames = [];
  for (const size of sizes) {
    const svg = svgForSize(size);
    if (size >= 256) {
      frames.push({ size, data: await png(svg) });
      continue;
    }
    const { data } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const header = Buffer.alloc(40);
    header.writeUInt32LE(40, 0);
    header.writeInt32LE(size, 4);
    header.writeInt32LE(size * 2, 8);
    header.writeUInt16LE(1, 12);
    header.writeUInt16LE(32, 14);
    header.writeUInt32LE(size * size * 4, 20);
    const bgra = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const src = ((size - 1 - y) * size + x) * 4;
        const dst = (y * size + x) * 4;
        bgra[dst] = data[src + 2];
        bgra[dst + 1] = data[src + 1];
        bgra[dst + 2] = data[src];
        bgra[dst + 3] = data[src + 3];
      }
    }
    const andMask = Buffer.alloc(Math.ceil(size / 32) * 4 * size);
    frames.push({ size, data: Buffer.concat([header, bgra, andMask]) });
  }

  const head = Buffer.alloc(6);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(frames.length, 4);
  const dir = Buffer.alloc(16 * frames.length);
  let offset = head.length + dir.length;
  frames.forEach((frame, i) => {
    const o = i * 16;
    dir.writeUInt8(frame.size >= 256 ? 0 : frame.size, o);
    dir.writeUInt8(frame.size >= 256 ? 0 : frame.size, o + 1);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(frame.data.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += frame.data.length;
  });
  return Buffer.concat([head, dir, ...frames.map((f) => f.data)]);
}

async function buildIcns(svgForSize) {
  const types = [
    ["icp4", 16],
    ["icp5", 32],
    ["ic11", 32],
    ["ic12", 64],
    ["ic07", 128],
    ["ic13", 256],
    ["ic08", 256],
    ["ic14", 512],
    ["ic09", 512],
    ["ic10", 1024],
  ];
  const cache = new Map();
  const chunks = [];
  for (const [type, size] of types) {
    if (!cache.has(size)) cache.set(size, await png(svgForSize(size)));
    const data = cache.get(size);
    const head = Buffer.alloc(8);
    head.write(type, 0, "ascii");
    head.writeUInt32BE(data.length + 8, 4);
    chunks.push(head, data);
  }
  const body = Buffer.concat(chunks);
  const head = Buffer.alloc(8);
  head.write("icns", 0, "ascii");
  head.writeUInt32BE(body.length + 8, 4);
  return Buffer.concat([head, body]);
}

// ---------- icon sets ----------

const desktopTile = (size) => tileSvg(size, { padRatio: 0.03 });
const macTile = (size) => tileSvg(size, { padRatio: 100 / 1024, radius: 10.7, shadow: size >= 128 });
const pwaTile = (size) => tileSvg(size, { padRatio: 0.04 });

async function generateSources() {
  const dir = path.join(OUT, "source");
  write(path.join(dir, "icon-tile.svg"), desktopTile(1024));
  write(path.join(dir, "icon-tile-small.svg"), desktopTile(32));
  write(path.join(dir, "icon-fullbleed.svg"), bleedSvg(1024, 0.86));
  write(path.join(dir, "icon-maskable.svg"), bleedSvg(1024, 0.75));
  write(path.join(dir, "icon-monochrome.svg"), monochromeSvg(1024, 0.75));
}

async function generateDesktop() {
  const dir = path.join(OUT, "desktop");
  for (const size of [16, 24, 32, 48, 64, 128, 256, 512, 1024]) {
    await png(desktopTile(size), path.join(dir, "linux", `${size}x${size}.png`));
  }
  write(path.join(dir, "windows", "icon.ico"), await buildIco(desktopTile, [16, 24, 32, 48, 64, 128, 256]));
  write(path.join(dir, "mac", "icon.icns"), await buildIcns(macTile));
  await png(macTile(1024), path.join(dir, "mac", "icon-1024.png"));
}

async function generateMobile() {
  const dir = path.join(OUT, "mobile");

  // iOS / iPadOS: opaque full-bleed square, iOS rounds the corners itself.
  await png(bleedSvg(1024, 0.86), path.join(dir, "ios", "AppIcon.appiconset", "AppIcon-1024.png"), { flatten: true });
  write(
    path.join(dir, "ios", "AppIcon.appiconset", "Contents.json"),
    `${JSON.stringify(
      {
        images: [{ filename: "AppIcon-1024.png", idiom: "universal", platform: "ios", size: "1024x1024" }],
        info: { author: "xcode", version: 1 },
      },
      null,
      2,
    )}\n`,
  );
  for (const size of [180, 167, 152, 120]) {
    await png(bleedSvg(size, 0.86), path.join(dir, "ios", `apple-touch-icon-${size}.png`), { flatten: true });
  }

  // Android: adaptive layers (108dp, 66dp safe zone), legacy square + round, themed monochrome, Play Store.
  const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [name, scale] of Object.entries(densities)) {
    const res = path.join(dir, "android", "res", `mipmap-${name}`);
    const legacy = Math.round(48 * scale);
    const layer = Math.round(108 * scale);
    await png(tileSvg(legacy, { padRatio: 2 / 48, radius: 9 }), path.join(res, "ic_launcher.png"));
    await png(roundSvg(legacy), path.join(res, "ic_launcher_round.png"));
    await png(bleedSvg(layer, 0.58, { withForeground: false }), path.join(res, "ic_launcher_background.png"));
    await png(bleedSvg(layer, 0.58, { withBackground: false }), path.join(res, "ic_launcher_foreground.png"));
    await png(monochromeSvg(layer, 0.58), path.join(res, "ic_launcher_monochrome.png"));
  }
  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome" />
</adaptive-icon>
`;
  write(path.join(dir, "android", "res", "mipmap-anydpi-v26", "ic_launcher.xml"), adaptiveXml);
  write(path.join(dir, "android", "res", "mipmap-anydpi-v26", "ic_launcher_round.xml"), adaptiveXml);
  await png(bleedSvg(512, 0.86), path.join(dir, "android", "play-store-512.png"), { flatten: true });

  // PWA (Add to Home Screen / Install app) ??served by the web app's manifest.
  const pwa = path.join(dir, "pwa");
  for (const size of [192, 512]) {
    await png(pwaTile(size), path.join(pwa, `icon-${size}.png`));
    await png(bleedSvg(size, 0.75), path.join(pwa, `maskable-${size}.png`), { flatten: true });
  }
  await png(monochromeSvg(512, 0.75), path.join(pwa, "monochrome-512.png"));
}

function syncWeb() {
  fs.rmSync(WEB_PUBLIC_ICONS, { recursive: true, force: true });
  fs.cpSync(path.join(OUT, "mobile", "pwa"), WEB_PUBLIC_ICONS, { recursive: true });
  fs.copyFileSync(path.join(OUT, "mobile", "ios", "apple-touch-icon-180.png"), path.join(WEB_APP_DIR, "apple-icon.png"));
}

async function main() {
  for (const sub of ["source", "desktop", "mobile"]) fs.rmSync(path.join(OUT, sub), { recursive: true, force: true });
  await generateSources();
  await generateDesktop();
  await generateMobile();
  write(path.join(WEB_APP_DIR, "favicon.ico"), await buildIco(desktopTile, [16, 32, 48]));
  syncWeb();
  console.log(`[icons] written to ${path.relative(ROOT, OUT)} and synced to apps/web`);
}

await main();
