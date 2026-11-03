"use client";

import { motion } from "framer-motion";
import { LogoMark } from "@/components/brand/BrandLogo";

const TOTAL = 6;
const at = (seconds: number) => seconds / TOTAL;

/** Pixel-art hero used across the intro; drawn on a 16x16 grid. */
function HeroSprite({ size }: { size: number }) {
  const pixels: Array<[number, number, string]> = [];
  const rows = [
    "......KKKK......",
    ".....KCCCCK.....",
    "....KCCCCCCK....",
    "....KSSSSSSK....",
    "....KSWSSWSK....",
    "....KSSSSSSK....",
    ".....KSSSSK.....",
    "...KKPPPPPPKK...",
    "..KPPPMPPMPPPK..",
    "..KSKPPPPPPKSK..",
    "..KSKPPPPPPKSK..",
    "....KPPKKPPK....",
    "....KBBK.KBBK...",
    "....KBBK.KBBK...",
    "...KKKKK.KKKKK..",
    "................",
  ];
  const palette: Record<string, string> = {
    K: "#0b0c10",
    C: "#00f0ff",
    S: "#ffd9b8",
    W: "#0b0c10",
    P: "#9d00ff",
    M: "#ff0055",
    B: "#3a3f5c",
  };
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (palette[ch]) pixels.push([x, y, palette[ch]]);
    }),
  );
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden>
      {pixels.map(([x, y, fill]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />
      ))}
    </svg>
  );
}

const PARTICLES = Array.from({ length: 22 }, (_, i) => {
  const angle = (i / 22) * Math.PI * 2;
  const distance = 120 + (i % 5) * 28;
  return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, color: i % 3 === 0 ? "#ff0055" : i % 3 === 1 ? "#00f0ff" : "#9d00ff" };
});

export function IntroFallback() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-obsidian" data-testid="intro-fallback">
      {/* 0.0-1.0s scan line */}
      <motion.div
        className="absolute left-0 right-0 top-1/2 h-[2px] bg-neon-cyan shadow-[0_0_24px_6px_rgba(0,240,255,0.7)]"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
        transition={{ duration: TOTAL, times: [0, at(0.6), at(0.9), at(1.2)], ease: "easeOut" }}
      />

      {/* Glow pulse 2.5-4.0s */}
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 55%, rgba(255,0,85,0.35), transparent 45%), radial-gradient(circle at 50% 45%, rgba(157,0,255,0.35), transparent 55%)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 1, 0.4, 1, 0.3, 0] }}
        transition={{ duration: TOTAL, times: [0, at(2.4), at(2.8), at(3.2), at(3.6), at(4.2), at(5.6)] }}
      />

      {/* Sprite card: white background gets cut away (1.0-2.5s), then lands on tiles (2.5-4.0s) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="relative flex items-center justify-center"
          style={{ width: "min(42vmin, 320px)", height: "min(42vmin, 320px)" }}
          initial={{ opacity: 0, scale: 0.85, y: 0 }}
          animate={{
            opacity: [0, 0, 1, 1, 1, 0],
            scale: [0.85, 0.85, 1, 1, 0.9, 0.7],
            y: [0, 0, 0, 0, 40, 40],
          }}
          transition={{ duration: TOTAL, times: [0, at(1.0), at(1.3), at(2.6), at(3.4), at(4.1)] }}
        >
          <div className="checkerboard absolute inset-0 rounded-2xl opacity-90" />
          <motion.div
            className="absolute inset-0 rounded-2xl bg-white"
            initial={{ clipPath: "inset(0 0 0 0)" }}
            animate={{ clipPath: ["inset(0 0 0 0)", "inset(0 0 0 0)", "inset(0 0 0 100%)"] }}
            transition={{ duration: TOTAL, times: [0, at(1.6), at(2.4)], ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-0 bottom-0 w-[3px] bg-vivid-magenta shadow-[0_0_18px_4px_rgba(255,0,85,0.8)]"
            initial={{ left: "0%", opacity: 0 }}
            animate={{ left: ["0%", "0%", "100%", "100%"], opacity: [0, 1, 1, 0] }}
            transition={{ duration: TOTAL, times: [0, at(1.6), at(2.4), at(2.5)], ease: "easeInOut" }}
          />
          <div className="relative drop-shadow-[0_0_18px_rgba(0,240,255,0.55)]">
            <HeroSprite size={200} />
          </div>
          {PARTICLES.map((p, i) => (
            <motion.span
              key={i}
              className="absolute h-2 w-2 rounded-sm"
              style={{ background: p.color, boxShadow: `0 0 10px ${p.color}` }}
              initial={{ x: 0, y: 0, opacity: 0 }}
              animate={{ x: [0, 0, p.x], y: [0, 0, p.y], opacity: [0, 1, 0] }}
              transition={{ duration: TOTAL, times: [0, at(2.2), at(3.0)], ease: "easeOut" }}
            />
          ))}
        </motion.div>
      </div>

      {/* Ground tiles appear for the landing */}
      <motion.div
        className="bg-grass-tile absolute inset-x-0 bottom-0 h-[18vh]"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: [0, 0, 1, 1, 0], y: [40, 40, 0, 0, 20] }}
        transition={{ duration: TOTAL, times: [0, at(2.5), at(3.0), at(4.0), at(4.6)] }}
      />

      {/* 4.0-5.5s logo glitch */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0, 1, 1, 0], scale: [1.2, 1.2, 1, 1, 1] }}
          transition={{ duration: TOTAL, times: [0, at(4.0), at(4.3), at(5.5), at(5.95)] }}
        >
          <LogoMark className="h-[clamp(56px,14vmin,128px)] w-[clamp(56px,14vmin,128px)]" />
        </motion.div>
        <motion.div
          className="relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0, 1, 1, 0], scale: [1.2, 1.2, 1, 1, 1] }}
          transition={{ duration: TOTAL, times: [0, at(4.0), at(4.3), at(5.5), at(5.95)] }}
        >
          <motion.span
            className="absolute inset-0 text-[clamp(40px,9vmin,96px)] font-black tracking-tight text-vivid-magenta mix-blend-screen"
            animate={{ x: [0, -6, 4, -2, 0, 0], opacity: [0, 0.9, 0.6, 0.9, 0, 0] }}
            transition={{ duration: TOTAL, times: [0, at(4.05), at(4.2), at(4.35), at(4.5), 1] }}
          >
            RemoveBg AI
          </motion.span>
          <motion.span
            className="absolute inset-0 text-[clamp(40px,9vmin,96px)] font-black tracking-tight text-neon-cyan mix-blend-screen"
            animate={{ x: [0, 6, -4, 2, 0, 0], opacity: [0, 0.9, 0.6, 0.9, 0, 0] }}
            transition={{ duration: TOTAL, times: [0, at(4.05), at(4.2), at(4.35), at(4.5), 1] }}
          >
            RemoveBg AI
          </motion.span>
          <span className="relative text-[clamp(40px,9vmin,96px)] font-black tracking-tight neon-text">RemoveBg AI</span>
        </motion.div>
        <motion.p
          className="text-[clamp(13px,2.2vmin,20px)] font-medium tracking-[0.25em] text-ink-dim uppercase"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: [0, 0, 1, 1, 0], y: [8, 8, 0, 0, 0] }}
          transition={{ duration: TOTAL, times: [0, at(4.4), at(4.8), at(5.5), at(5.95)] }}
        >
          Precision AI Background Removal
        </motion.p>
      </div>
    </div>
  );
}

/** Short synthesized neon sweep; only played when the user turns sound on. */
export function playIntroSweep(ctx: AudioContext) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(110, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 2.2);
  osc.frequency.exponentialRampToValueAtTime(220, now + 4.5);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(400, now);
  filter.frequency.exponentialRampToValueAtTime(4000, now + 2.4);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.4);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 5.5);
  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 5.6);
}
