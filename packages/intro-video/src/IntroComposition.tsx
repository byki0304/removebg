import type { CSSProperties } from "react";
import { AbsoluteFill, Audio, Easing, Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export const INTRO_FPS = 30;
export const INTRO_FRAMES = 6 * INTRO_FPS;

const COLORS = {
  obsidian: "#0B0C10",
  cyan: "#00F0FF",
  magenta: "#FF0055",
  purple: "#9D00FF",
  ink: "#E8ECF5",
  inkDim: "#9AA3B8",
};

const HERO_ROWS = [
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
const HERO_PALETTE: Record<string, string> = {
  K: "#0b0c10",
  C: COLORS.cyan,
  S: "#ffd9b8",
  W: "#0b0c10",
  P: COLORS.purple,
  M: COLORS.magenta,
  B: "#3a3f5c",
};

const PARTICLES = Array.from({ length: 28 }, (_, i) => {
  const angle = (i / 28) * Math.PI * 2 + random(`a${i}`) * 0.4;
  return {
    angle,
    distance: 0.9 + random(`d${i}`) * 0.9,
    size: 0.9 + random(`s${i}`) * 1.2,
    color: [COLORS.magenta, COLORS.cyan, COLORS.purple][i % 3],
  };
});

function HeroSprite({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
      {HERO_ROWS.flatMap((row, y) =>
        [...row].map((ch, x) => (HERO_PALETTE[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={HERO_PALETTE[ch]} /> : null)),
      )}
    </svg>
  );
}

function GrassTiles({ tile, count }: { tile: number; count: number }) {
  return (
    <div style={{ display: "flex" }}>
      {Array.from({ length: count }, (_, i) => (
        <svg key={i} width={tile} height={tile} viewBox="0 0 8 8" shapeRendering="crispEdges">
          <rect width={8} height={8} fill="#5b3a1e" />
          <rect width={8} height={3} fill="#3fa34d" />
          <rect x={(i * 3) % 7} y={3} width={1} height={1} fill="#3fa34d" />
          <rect x={(i * 5 + 2) % 7} y={0} width={2} height={1} fill="#7ddc6a" />
          <rect x={(i * 2 + 4) % 7} y={5} width={1} height={1} fill="#7a5230" />
        </svg>
      ))}
    </div>
  );
}

export function IntroComposition() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const vmin = Math.min(width, height) / 100;
  const portrait = height > width;

  /** Keyframes in seconds → interpolated value at the current frame. */
  const kf = (seconds: number[], values: number[], easing?: (t: number) => number) =>
    interpolate(
      frame,
      seconds.map((s) => s * fps),
      values,
      { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing },
    );

  const scanScale = kf([0.1, 0.6], [0, 1], Easing.out(Easing.cubic));
  const scanOpacity = kf([0.1, 0.3, 0.9, 1.2], [0, 1, 1, 0]);

  const cardSize = (portrait ? 62 : 46) * vmin;
  const cardOpacity = kf([1.0, 1.3, 3.4, 4.1], [0, 1, 1, 0]);
  const cardScale = kf([1.0, 1.3, 2.6, 3.4, 4.1], [0.85, 1, 1, 0.9, 0.7], Easing.out(Easing.quad));
  const cardDrop = kf([2.6, 3.4], [0, 1], Easing.bounce) * (portrait ? 18 : 14) * vmin;
  const cut = kf([1.6, 2.4], [0, 100], Easing.inOut(Easing.cubic));
  const cutterOpacity = kf([1.55, 1.6, 2.4, 2.5], [0, 1, 1, 0]);
  const checkerOpacity = kf([2.5, 2.9], [0.9, 0]);
  const burst = kf([2.2, 3.0], [0, 1], Easing.out(Easing.cubic));
  const particleOpacity = kf([2.2, 2.3, 3.0], [0, 1, 0]);

  const glow = kf([2.4, 2.8, 3.2, 3.6, 4.2, 5.6], [0, 1, 0.4, 1, 0.3, 0]);
  const tilesY = kf([2.5, 3.0], [1, 0], Easing.out(Easing.back(1.4)));
  const tilesOpacity = kf([2.5, 3.0, 4.0, 4.6], [0, 1, 1, 0]);

  const logoOpacity = kf([4.0, 4.3, 5.5, 5.95], [0, 1, 1, 0]);
  const logoScale = kf([4.0, 4.3], [1.2, 1], Easing.out(Easing.cubic));
  const glitchActive = frame >= 4.0 * fps && frame <= 4.5 * fps;
  const glitchX = glitchActive ? (random(`g${frame}`) - 0.5) * 2.4 * vmin : 0;
  const glitchSlice = glitchActive ? random(`h${frame}`) * 100 : 0;
  const subtitleOpacity = kf([4.4, 4.8, 5.5, 5.95], [0, 1, 1, 0]);
  const subtitleY = kf([4.4, 4.8], [1.2, 0]) * vmin;
  const finalFade = kf([5.5, 6.0], [0, 1]);

  const logoFont = (portrait ? 11 : 10) * vmin;
  const logoText: CSSProperties = {
    fontFamily: "'Segoe UI', Inter, Arial, sans-serif",
    fontWeight: 900,
    fontSize: logoFont,
    letterSpacing: "-0.02em",
    whiteSpace: "nowrap",
  };

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.obsidian, overflow: "hidden" }}>
      <Audio src={staticFile("sweep.wav")} />

      <AbsoluteFill
        style={{
          opacity: glow,
          background: `radial-gradient(circle at 50% 55%, ${COLORS.magenta}59, transparent 45%), radial-gradient(circle at 50% 45%, ${COLORS.purple}59, transparent 55%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "50%",
          height: Math.max(2, 0.3 * vmin),
          background: COLORS.cyan,
          boxShadow: `0 0 ${3 * vmin}px ${0.8 * vmin}px ${COLORS.cyan}b3`,
          transform: `scaleX(${scanScale})`,
          opacity: scanOpacity,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: (portrait ? 16 : 20) * vmin,
          opacity: tilesOpacity,
          transform: `translateY(${tilesY * 20 * vmin}px)`,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <GrassTiles tile={(portrait ? 16 : 20) * vmin} count={Math.ceil(width / ((portrait ? 16 : 20) * vmin)) + 1} />
      </div>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            position: "relative",
            width: cardSize,
            height: cardSize,
            opacity: cardOpacity,
            transform: `translateY(${cardDrop}px) scale(${cardScale})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 2 * vmin,
              opacity: checkerOpacity,
              backgroundColor: "#2a2d3a",
              backgroundImage: "conic-gradient(#3a3e4f 25%, transparent 0 50%, #3a3e4f 0 75%, transparent 0)",
              backgroundSize: `${4 * vmin}px ${4 * vmin}px`,
            }}
          />
          <div style={{ position: "absolute", inset: 0, borderRadius: 2 * vmin, background: "#ffffff", clipPath: `inset(0 0 0 ${cut}%)` }} />
          <div
            style={{
              position: "absolute",
              top: -1 * vmin,
              bottom: -1 * vmin,
              left: `${cut}%`,
              width: Math.max(3, 0.4 * vmin),
              background: COLORS.magenta,
              boxShadow: `0 0 ${2.4 * vmin}px ${0.6 * vmin}px ${COLORS.magenta}cc`,
              opacity: cutterOpacity,
            }}
          />
          <div style={{ position: "relative", filter: `drop-shadow(0 0 ${2.2 * vmin}px ${COLORS.cyan}8c)` }}>
            <HeroSprite size={cardSize * 0.66} />
          </div>
          {PARTICLES.map((p, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: p.size * vmin,
                height: p.size * vmin,
                background: p.color,
                boxShadow: `0 0 ${1.2 * vmin}px ${p.color}`,
                opacity: particleOpacity,
                transform: `translate(${Math.cos(p.angle) * p.distance * cardSize * 0.6 * burst}px, ${
                  Math.sin(p.angle) * p.distance * cardSize * 0.6 * burst
                }px)`,
              }}
            />
          ))}
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 2 * vmin }}>
        <Img
          src={staticFile("logo-mark.svg")}
          style={{ width: 16 * vmin, height: 16 * vmin, opacity: logoOpacity, transform: `scale(${logoScale})` }}
        />
        <div style={{ position: "relative", opacity: logoOpacity, transform: `scale(${logoScale})` }}>
          <span
            style={{
              ...logoText,
              position: "absolute",
              inset: 0,
              color: COLORS.magenta,
              mixBlendMode: "screen",
              transform: `translateX(${-glitchX}px)`,
              clipPath: glitchActive ? `inset(${glitchSlice}% 0 ${Math.max(0, 70 - glitchSlice)}% 0)` : undefined,
              opacity: glitchActive ? 0.9 : 0,
            }}
          >
            RemoveBg AI
          </span>
          <span
            style={{
              ...logoText,
              position: "absolute",
              inset: 0,
              color: COLORS.cyan,
              mixBlendMode: "screen",
              transform: `translateX(${glitchX}px)`,
              opacity: glitchActive ? 0.9 : 0,
            }}
          >
            RemoveBg AI
          </span>
          <span
            style={{
              ...logoText,
              position: "relative",
              backgroundImage: `linear-gradient(90deg, ${COLORS.cyan}, ${COLORS.magenta})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              filter: `drop-shadow(0 0 ${1.6 * vmin}px ${COLORS.cyan}80)`,
            }}
          >
            RemoveBg AI
          </span>
        </div>
        <div
          style={{
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
            color: COLORS.inkDim,
            fontFamily: "'Segoe UI', Inter, Arial, sans-serif",
            fontWeight: 600,
            fontSize: (portrait ? 3.4 : 2.4) * vmin,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            textAlign: "center",
            padding: `0 ${4 * vmin}px`,
          }}
        >
          Precision AI Background Removal
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ backgroundColor: COLORS.obsidian, opacity: finalFade }} />
    </AbsoluteFill>
  );
}
