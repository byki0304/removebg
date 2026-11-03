"use client";

import type { TranslationKey } from "@removebg/shared";
import { Download, Eraser, ImagePlus, Paintbrush, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrushCanvas, type BrushCanvasHandle, type BrushMode } from "@/components/studio/BrushCanvas";
import { useLocale } from "@/providers/LocaleProvider";
import { useStudioStore, type ResultGeometry } from "@/store/studioStore";

type BackgroundMode = "checkerboard" | "black" | "white" | "magenta" | "grass" | "dungeon";

const BACKGROUNDS: Array<{ mode: BackgroundMode; labelKey: TranslationKey; className: string; swatch: string }> = [
  { mode: "checkerboard", labelKey: "sim_bg_checkerboard", className: "checkerboard", swatch: "checkerboard" },
  { mode: "black", labelKey: "sim_bg_black", className: "bg-black", swatch: "bg-black" },
  { mode: "white", labelKey: "sim_bg_white", className: "bg-white", swatch: "bg-white" },
  { mode: "magenta", labelKey: "sim_bg_magenta", className: "bg-[#ff00ff]", swatch: "bg-[#ff00ff]" },
  { mode: "grass", labelKey: "sim_bg_grass", className: "bg-grass-tile", swatch: "bg-grass-tile" },
  { mode: "dungeon", labelKey: "sim_bg_dungeon", className: "bg-dungeon-tile", swatch: "bg-dungeon-tile" },
];

interface Asset {
  id: string;
  name: string;
  resultUrl: string;
  originalUrl?: string;
  geometry?: ResultGeometry;
}

export default function SimulatorPage() {
  const { t } = useLocale();
  const items = useStudioStore((s) => s.items);
  const selectedId = useStudioStore((s) => s.selectedId);
  const [external, setExternal] = useState<Asset[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [background, setBackground] = useState<BackgroundMode>("checkerboard");
  const [brushMode, setBrushMode] = useState<BrushMode>("erase");
  const [brushSize, setBrushSize] = useState(24);
  const canvasRef = useRef<BrushCanvasHandle>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const assets = useMemo<Asset[]>(
    () => [
      ...items
        .filter((i) => i.status === "completed" && i.resultUrl)
        .map((i) => ({ id: i.id, name: i.name, resultUrl: i.resultUrl!, originalUrl: i.originalUrl, geometry: i.geometry })),
      ...external,
    ],
    [items, external],
  );

  useEffect(() => {
    if (activeId && assets.some((a) => a.id === activeId)) return;
    const preferred = assets.find((a) => a.id === selectedId) ?? assets[0];
    setActiveId(preferred?.id ?? null);
  }, [assets, activeId, selectedId]);

  const active = assets.find((a) => a.id === activeId) ?? null;
  const bg = BACKGROUNDS.find((b) => b.mode === background)!;

  const saveEdited = async () => {
    const blob = await canvasRef.current?.toBlob();
    if (!blob || !active) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${active.name.replace(/\.[^.]+$/, "")}_edited.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const toolButton = (activeState: boolean) =>
    `flex h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-[14px] font-semibold transition ${
      activeState ? "bg-neon-cyan/15 text-neon-cyan shadow-[inset_0_0_0_1px_rgba(0,240,255,0.6)]" : "btn-ghost"
    }`;

  return (
    <div data-testid="simulator-screen" className="grid gap-4 desktop:grid-cols-[minmax(0,1fr)_320px] mlandscape:grid-cols-[minmax(0,1fr)_280px]">
      <section className="flex min-w-0 flex-col gap-3">
        <div
          className={`${bg.className} flex items-center justify-center overflow-hidden rounded-2xl border border-neon-cyan/25 p-4 desktop:h-[calc(100dvh-var(--topbar-h)-180px)] desktop:min-h-[360px] mportrait:aspect-square mlandscape:h-[calc(100dvh-var(--topbar-h)-var(--bottomnav-h)-150px)] mlandscape:min-h-[200px]`}
        >
          {active ? (
            <BrushCanvas
              key={active.id}
              ref={canvasRef}
              resultUrl={active.resultUrl}
              originalUrl={active.originalUrl}
              geometry={active.geometry}
              mode={brushMode}
              brushSize={brushSize}
            />
          ) : (
            <p className="max-w-[360px] rounded-xl bg-obsidian/85 p-4 text-center text-[14px] text-ink-dim">{t("sim_no_image")}</p>
          )}
        </div>

        <div className="grid grid-cols-6 gap-2 mportrait:grid-cols-3 mlandscape:grid-cols-3" role="radiogroup" aria-label={t("simulator_title")}>
          {BACKGROUNDS.map(({ mode, labelKey, swatch }) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={background === mode}
              onClick={() => setBackground(mode)}
              className={`flex h-11 items-center justify-center gap-2 rounded-xl border px-2 text-[13px] font-semibold transition ${
                background === mode ? "border-neon-cyan bg-neon-cyan/10 text-neon-cyan" : "border-ink-dim/25 text-ink-dim hover:text-ink"
              }`}
            >
              <span className={`${swatch} h-4 w-4 shrink-0 rounded border border-white/30`} />
              <span className="truncate">{t(labelKey)}</span>
            </button>
          ))}
        </div>
      </section>

      <aside className="glass-panel flex flex-col gap-4 rounded-2xl p-4">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-ink-dim">{t("sim_select_asset")}</span>
          <select
            value={activeId ?? ""}
            onChange={(e) => setActiveId(e.target.value)}
            className="field h-11 rounded-xl px-3 text-[14px]"
            disabled={!assets.length}
          >
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => fileInput.current?.click()} className="btn-ghost flex h-11 items-center justify-center gap-1.5 rounded-xl text-[14px] font-semibold">
            <ImagePlus className="h-4 w-4" />
            {t("sim_load_image")}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".png,.webp"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              const asset = { id: crypto.randomUUID(), name: file.name, resultUrl: URL.createObjectURL(file) };
              setExternal((prev) => [...prev, asset]);
              setActiveId(asset.id);
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setBrushMode("restore")} className={toolButton(brushMode === "restore")}>
            <Paintbrush className="h-4 w-4" />
            {t("sim_brush_restore")}
          </button>
          <button type="button" onClick={() => setBrushMode("erase")} className={toolButton(brushMode === "erase")}>
            <Eraser className="h-4 w-4" />
            {t("sim_brush_erase")}
          </button>
        </div>

        <label className="flex flex-col gap-2">
          <span className="flex justify-between text-[13px] font-semibold text-ink-dim">
            {t("sim_brush_size")}
            <span className="tabular-nums text-ink">{brushSize}px</span>
          </span>
          <input type="range" min={5} max={100} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="accent-[#00f0ff]" />
        </label>

        <div className="mt-auto grid grid-cols-2 gap-2">
          <button type="button" onClick={() => canvasRef.current?.reset()} disabled={!active} className="btn-ghost flex h-11 items-center justify-center gap-1.5 rounded-xl text-[14px] font-semibold disabled:opacity-40">
            <RotateCcw className="h-4 w-4" />
            {t("sim_reset")}
          </button>
          <button type="button" onClick={saveEdited} disabled={!active} className="btn-primary flex h-11 items-center justify-center gap-1.5 rounded-xl text-[14px]">
            <Download className="h-4 w-4" />
            {t("sim_download_edited")}
          </button>
        </div>
      </aside>
    </div>
  );
}
