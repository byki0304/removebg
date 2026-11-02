// Renders the intro (landscape + portrait MP4) and the poster into apps/web/public/intro.
import { execSync } from "node:child_process";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkgDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.resolve(pkgDir, "..", "..", "apps", "web", "public", "intro");
mkdirSync(outDir, { recursive: true });
mkdirSync(path.join(pkgDir, "public"), { recursive: true });

/** Self-synthesized neon sweep (sawtooth 110→880→220 Hz through an opening low-pass), 6 s, 44.1 kHz mono. */
function writeSweep(file) {
  const rate = 44100;
  const seconds = 6;
  const n = rate * seconds;
  const data = Buffer.alloc(44 + n * 2);
  let phase = 0;
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const freq = t < 2.2 ? 110 * Math.pow(8, t / 2.2) : 880 * Math.pow(0.25, Math.min(1, (t - 2.2) / 2.3));
    phase = (phase + freq / rate) % 1;
    const saw = 2 * phase - 1;
    const cutoff = 400 * Math.pow(10, Math.min(1, t / 2.4));
    lp += (1 - Math.exp((-2 * Math.PI * cutoff) / rate)) * (saw - lp);
    const env = t < 0.4 ? t / 0.4 : Math.max(0, 1 - (t - 0.4) / 5.1);
    const sample = Math.max(-1, Math.min(1, lp * env * env * 0.5));
    data.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }
  data.write("RIFF", 0);
  data.writeUInt32LE(36 + n * 2, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(rate, 24);
  data.writeUInt32LE(rate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(n * 2, 40);
  writeFileSync(file, data);
}

writeSweep(path.join(pkgDir, "public", "sweep.wav"));

const run = (args) => execSync(`npx remotion ${args}`, { cwd: pkgDir, stdio: "inherit" });
const quality = "--codec=h264 --crf=26 --audio-codec=aac --audio-bitrate=96k --pixel-format=yuv420p";

run(`render src/index.ts IntroLandscape "${path.join(outDir, "intro_landscape.mp4")}" ${quality}`);
run(`render src/index.ts IntroPortrait "${path.join(outDir, "intro_portrait.mp4")}" ${quality}`);
const posterPng = path.join(pkgDir, "out", "poster.png");
run(`still src/index.ts IntroLandscape "${posterPng}" --frame=150`);
const sharp = createRequire(path.join(outDir, "..", "..", "package.json"))("sharp");
await sharp(posterPng).webp({ quality: 82 }).toFile(path.join(outDir, "poster.webp"));

for (const name of ["intro_landscape.mp4", "intro_portrait.mp4", "poster.webp"]) {
  const kb = Math.round(statSync(path.join(outDir, name)).size / 1024);
  console.log(`[intro] ${name}: ${kb} KB${name.endsWith(".mp4") && kb > 2048 ? "  (over the 2 MB target)" : ""}`);
}
