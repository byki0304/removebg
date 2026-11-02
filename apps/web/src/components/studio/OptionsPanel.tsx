"use client";

import type { JobOptions, TranslationKey } from "@spritecut/shared";
import { useLocale } from "@/providers/LocaleProvider";
import { useStudioStore } from "@/store/studioStore";

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-obsidian/60 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`min-h-10 flex-1 rounded-lg px-2 text-[13px] font-semibold transition ${
            value === option.value ? "bg-neon-cyan/15 text-neon-cyan shadow-[inset_0_0_0_1px_rgba(0,240,255,0.5)]" : "text-ink-dim hover:text-ink"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Section({ labelKey, children }: { labelKey: TranslationKey; children: React.ReactNode }) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold text-ink-dim">{t(labelKey)}</span>
      {children}
    </div>
  );
}

export function OptionsPanel() {
  const { t } = useLocale();
  const options = useStudioStore((s) => s.options);
  const setOptions = useStudioStore((s) => s.setOptions);

  return (
    <div className="flex flex-col gap-4" data-testid="options-panel">
      <h2 className="text-[16px] font-bold">{t("ws_options")}</h2>

      <Section labelKey="ws_canvas_mode">
        <div className="flex flex-col gap-2">
          {[
            { value: true, label: t("option_auto_trim") },
            { value: false, label: t("option_original_canvas") },
          ].map((option) => (
            <label
              key={String(option.value)}
              className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-[14px] transition ${
                options.autoTrim === option.value ? "border-neon-cyan/70 bg-neon-cyan/10" : "border-ink-dim/25 hover:border-ink-dim/50"
              }`}
            >
              <input
                type="radio"
                name="canvas-mode"
                checked={options.autoTrim === option.value}
                onChange={() => setOptions({ autoTrim: option.value })}
                className="accent-[#00f0ff]"
              />
              {option.label}
            </label>
          ))}
        </div>
      </Section>

      {options.autoTrim && (
        <Section labelKey="ws_padding">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={16}
              value={options.padding}
              onChange={(e) => setOptions({ padding: Number(e.target.value) })}
              className="flex-1 accent-[#00f0ff]"
            />
            <span className="w-12 text-right text-[14px] font-semibold tabular-nums">{options.padding}px</span>
          </div>
        </Section>
      )}

      <Section labelKey="ws_ai_mode">
        <Segmented<JobOptions["aiMode"]>
          value={options.aiMode}
          onChange={(aiMode) => setOptions({ aiMode })}
          options={[
            { value: "ultra", label: t("ws_ai_ultra") },
            { value: "standard", label: t("ws_ai_standard") },
            { value: "pixel", label: t("ws_ai_pixel") },
          ]}
        />
      </Section>

      <Section labelKey="ws_format">
        <Segmented<JobOptions["outputFormat"]>
          value={options.outputFormat}
          onChange={(outputFormat) => setOptions({ outputFormat })}
          options={[
            { value: "png", label: "PNG" },
            { value: "webp", label: "WebP" },
          ]}
        />
      </Section>

      <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[14px]">
        <input
          type="checkbox"
          checked={options.defringing}
          onChange={(e) => setOptions({ defringing: e.target.checked })}
          className="h-4 w-4 accent-[#00f0ff]"
        />
        {t("ws_defringing")}
      </label>
    </div>
  );
}
