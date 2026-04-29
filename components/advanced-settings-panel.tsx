"use client";

import {
  ArrowLeft,
  Boxes,
  ChevronRight,
  Database,
  Gauge,
  Info,
  Layers,
  Lock,
  RotateCcw,
  Sliders,
  Sparkles,
  Thermometer,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_ADVANCED_SETTINGS,
  estimateTokens,
  getAdvancedBadges,
  getMaxOutputCapability,
  getModelTuningNote,
  getTemperatureCapability,
  isLiteLlmModel,
  normalizeAdvancedSettings,
  type AdvancedSettings,
} from "@/lib/advanced-settings";
import { cn } from "@/lib/utils";

type AdvancedSettingsPanelProps = {
  value?: Partial<AdvancedSettings> | null;
  onChange: (settings: AdvancedSettings) => void;
  modelId?: string | null;
  systemPrompt?: string;
  parentSettings?: Partial<AdvancedSettings> | null;
  className?: string;
  onBack?: () => void;
};

const updateSetting = <K extends keyof AdvancedSettings>(
  current: AdvancedSettings,
  key: K,
  value: AdvancedSettings[K]
) => normalizeAdvancedSettings({ ...current, [key]: value });

// ── Reusable section card ───────────────────────────────────
const SectionCard = ({
  icon: Icon,
  title,
  description,
  children,
  accent = "indigo",
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  children: React.ReactNode;
  accent?: "indigo" | "violet" | "emerald" | "amber" | "slate";
}) => {
  const accentMap: Record<string, string> = {
    indigo: "border-indigo-100 bg-indigo-50 text-indigo-600",
    violet: "border-violet-100 bg-violet-50 text-violet-600",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-600",
    amber: "border-amber-100 bg-amber-50 text-amber-600",
    slate: "border-slate-200 bg-slate-50 text-slate-600",
  };
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
            accentMap[accent]
          )}
        >
          <Icon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold tracking-tight text-slate-900">
            {title}
          </h4>
          {description && (
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
};

// ── Big expanded panel: lives in the right pane ─────────────
export const AdvancedSettingsPanel = ({
  value,
  onChange,
  modelId,
  systemPrompt = "",
  parentSettings,
  className,
  onBack,
}: AdvancedSettingsPanelProps) => {
  const settings = normalizeAdvancedSettings(value);
  const parent = normalizeAdvancedSettings(parentSettings);
  const capability = getTemperatureCapability(modelId);
  const maxOutCap = getMaxOutputCapability(modelId);
  const tuningNote = getModelTuningNote(modelId);
  const isLiteLlm = isLiteLlmModel(modelId);
  const badges = getAdvancedBadges(settings);
  const promptTokens = estimateTokens(systemPrompt);
  const budget = settings.contextBudgetTokens;
  const budgetPercent = budget ? Math.min(100, Math.round((promptTokens / budget) * 100)) : 0;
  const activeTemperature = settings.temperature ?? capability.defaultValue;

  return (
    <div
      className={cn(
        "flex flex-col gap-5 animate-in fade-in-0 slide-in-from-right-2 duration-200",
        className
      )}
      data-slot="advanced-settings-panel"
    >
      {/* Header */}
      <div className="relative flex items-start justify-between gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/40 p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-200/30 blur-3xl"
        />
        <div className="relative z-[1] flex items-start gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="group mt-0.5 inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              aria-label="Back to model selection"
              data-slot="advanced-settings-back"
            >
              <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
              Models
            </button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-100 bg-white text-indigo-600 shadow-sm">
                <Sliders size={14} />
              </span>
              <h3 className="text-base font-semibold tracking-tight text-slate-950">
                Advanced controls
              </h3>
            </div>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500">
              Tune generation, context, and prompt assembly for this node. New
              branches inherit these unless overridden.
            </p>
          </div>
        </div>

        <div className="relative z-[1] flex shrink-0 flex-wrap justify-end gap-1.5">
          {badges.length ? (
            badges.slice(0, 4).map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-indigo-200/70 bg-white px-2.5 py-1 text-[10px] font-semibold text-indigo-700 shadow-sm"
              >
                {badge}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 shadow-sm">
              All defaults
            </span>
          )}
        </div>
      </div>

      {/* Generation */}
      <SectionCard
        icon={Wand2}
        accent="violet"
        title="Generation"
        description="Sampling and output limits for this node's responses."
      >
        {tuningNote && (
          <div
            className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-[11px] leading-relaxed text-amber-800"
            data-slot="advanced-tuning-note"
          >
            <Info size={13} className="mt-0.5 shrink-0 text-amber-600" />
            <span>{tuningNote}</span>
          </div>
        )}

        {capability.supportsTemperature ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Thermometer size={14} className="text-slate-500" />
                <label className="text-xs font-semibold text-slate-700">
                  Temperature
                </label>
              </div>
              <button
                type="button"
                onClick={() => onChange(updateSetting(settings, "temperature", null))}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-700"
              >
                Use model default
              </button>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="range"
                min={capability.min}
                max={capability.max}
                step="0.1"
                value={activeTemperature}
                onChange={(event) =>
                  onChange(updateSetting(settings, "temperature", Number(event.target.value)))
                }
                className="min-w-0 flex-1 accent-indigo-600"
                data-slot="advanced-temperature-slider"
              />
              <span className="inline-flex h-8 min-w-[64px] items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold tabular-nums text-slate-800 shadow-sm">
                {settings.temperature === null ? "Auto" : settings.temperature.toFixed(1)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-slate-400">
              <span>Focused</span>
              <span>Balanced</span>
              <span>Creative</span>
            </div>
            {capability.isBestEffort && !tuningNote && (
              <p className="mt-2 text-[11px] leading-relaxed text-amber-700">
                LiteLLM temperature support depends on the selected provider.
                If a request fails, this value will be dropped automatically.
              </p>
            )}
          </div>
        ) : (
          <div
            className="rounded-xl border border-slate-200 bg-slate-50/80 p-4"
            data-slot="advanced-temperature-locked"
          >
            <div className="flex items-start gap-2.5">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
                <Lock size={13} />
              </span>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-700">
                  Temperature is fixed for this model
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                  {modelId
                    ? "Reasoning models manage sampling internally. Any value sent here will be ignored by the provider."
                    : "Pick a model to see its temperature range."}
                </p>
              </div>
            </div>
          </div>
        )}

        <label
          className={cn(
            "mt-4 block space-y-1.5",
            !maxOutCap.supportsMaxOutputTokens && "opacity-60"
          )}
        >
          <span className="flex items-center justify-between text-xs font-semibold text-slate-700">
            Max output tokens
            {!maxOutCap.supportsMaxOutputTokens && (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                <Lock size={10} />
                Not adjustable
              </span>
            )}
          </span>
          <Input
            type="number"
            min={1}
            max={32000}
            value={settings.maxOutputTokens ?? ""}
            disabled={!maxOutCap.supportsMaxOutputTokens}
            onChange={(event) =>
              onChange(updateSetting(settings, "maxOutputTokens", event.target.value ? Number(event.target.value) : null))
            }
            placeholder={maxOutCap.supportsMaxOutputTokens ? "Provider default" : "Provider-controlled"}
            className="h-10 rounded-lg text-sm"
            data-slot="advanced-max-output-input"
          />
          <span className="text-[11px] leading-relaxed text-slate-500">
            {maxOutCap.supportsMaxOutputTokens
              ? "Hard cap on response length. Leave blank to defer to the provider."
              : "This model decides its own response length."}
          </span>
        </label>

        {isLiteLlm && (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
            <Info size={12} className="mt-0.5 shrink-0 text-amber-600" />
            LiteLLM forwards these values to whichever upstream provider you've
            configured. Some providers ignore or reject them — the request is
            automatically retried without these fields if the call fails.
          </p>
        )}
      </SectionCard>

      {/* Context assembly */}
      <SectionCard
        icon={Layers}
        accent="indigo"
        title="Context assembly"
        description="How conversation history and external context get stitched into each request."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700">History mode</span>
            <select
              value={settings.historyMode}
              onChange={(event) =>
                onChange(updateSetting(settings, "historyMode", event.target.value as AdvancedSettings["historyMode"]))
              }
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
              data-slot="advanced-history-mode-select"
            >
              <option value="auto">Auto summary + recent</option>
              <option value="lastK">Last K messages</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700">Last K messages</span>
            <Input
              type="number"
              min={0}
              max={50}
              value={settings.lastKMessages}
              disabled={settings.historyMode !== "lastK"}
              onChange={(event) =>
                onChange(updateSetting(settings, "lastKMessages", Number(event.target.value)))
              }
              className="h-10 rounded-lg text-sm"
              data-slot="advanced-last-k-input"
            />
          </label>
        </div>

        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Database size={14} className="text-slate-500" />
              <label className="text-xs font-semibold text-slate-700">
                External context chunks
              </label>
            </div>
            <span className="inline-flex h-7 min-w-[40px] items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold tabular-nums text-slate-800 shadow-sm">
              {settings.externalContextTopK}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={settings.externalContextTopK}
            onChange={(event) =>
              onChange(updateSetting(settings, "externalContextTopK", Number(event.target.value)))
            }
            className="mt-3 w-full accent-indigo-600"
            data-slot="advanced-context-top-k-slider"
          />
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            Number of retrieved snippets pulled in from this canvas's knowledge base.
          </p>
        </div>
      </SectionCard>

      {/* Budget & prompt stack */}
      <SectionCard
        icon={Gauge}
        accent="emerald"
        title="Token budget & prompt stack"
        description="Cap how much context can land in a single request and preview how it's stacked."
      >
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-slate-700">Context budget (tokens)</span>
          <Input
            type="number"
            min={1}
            value={settings.contextBudgetTokens ?? ""}
            onChange={(event) =>
              onChange(updateSetting(settings, "contextBudgetTokens", event.target.value ? Number(event.target.value) : null))
            }
            placeholder="No limit"
            className="h-10 rounded-lg text-sm"
            data-slot="advanced-context-budget-input"
          />
        </label>

        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-slate-700">System prompt usage</span>
            <span className="font-medium tabular-nums text-slate-500">
              {promptTokens} tokens{budget ? ` / ${budget}` : ""}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                budget && promptTokens > budget
                  ? "bg-rose-500"
                  : "bg-gradient-to-r from-indigo-500 to-violet-500"
              )}
              style={{ width: budget ? `${budgetPercent}%` : `${Math.min(100, promptTokens / 20)}%` }}
            />
          </div>
          {budget && promptTokens > budget && (
            <p className="mt-2 text-[11px] leading-relaxed text-rose-600">
              System prompt alone exceeds the context budget. Consider raising the budget or trimming the prompt.
            </p>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-slate-100 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Boxes size={14} className="text-slate-500" />
              <span className="text-xs font-semibold text-slate-700">Prompt stack preview</span>
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              Top → Bottom
            </span>
          </div>
          <ol className="relative mt-3 space-y-1.5 pl-2 before:absolute before:left-[14px] before:top-3 before:bottom-3 before:w-px before:bg-gradient-to-b before:from-indigo-200 before:via-slate-200 before:to-transparent">
            {[
              "System Prompt",
              `External Context (${settings.externalContextTopK})`,
              "Branch Summary",
              settings.historyMode === "lastK" ? `Last ${settings.lastKMessages} Messages` : "Auto History",
              "Current User Message",
            ].map((item, index) => (
              <li
                key={item}
                className="relative flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 text-[12px] font-medium text-slate-700"
              >
                <span className="relative z-10 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white shadow-[0_0_0_1px_rgba(99,102,241,0.25)] text-[10px] font-semibold text-indigo-700 ring-2 ring-white">
                  {index + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </div>
      </SectionCard>

      {/* Footer actions */}
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(15,23,42,0.04)] backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <p className="text-[11px] leading-relaxed text-slate-500">
          Changes apply to this node only. Reset to inherit from parent or restore defaults.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(DEFAULT_ADVANCED_SETTINGS)}
            className="h-8 rounded-lg border-slate-200 text-xs text-slate-600 hover:border-slate-300 hover:text-slate-900"
          >
            Reset defaults
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onChange(parent)}
            className="h-8 rounded-lg bg-slate-900 text-xs text-white hover:bg-slate-800"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset to parent
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Compact summary card: lives in the left sidebar ─────────
type AdvancedSettingsSummaryCardProps = {
  value?: Partial<AdvancedSettings> | null;
  onOpen: () => void;
  active?: boolean;
  modelId?: string | null;
  className?: string;
};

export const AdvancedSettingsSummaryCard = ({
  value,
  onOpen,
  active = false,
  modelId,
  className,
}: AdvancedSettingsSummaryCardProps) => {
  const settings = normalizeAdvancedSettings(value);
  const badges = getAdvancedBadges(settings);
  const tempCap = getTemperatureCapability(modelId);
  const maxOutCap = getMaxOutputCapability(modelId);
  const hasRestrictions =
    Boolean(modelId) &&
    (!tempCap.supportsTemperature || !maxOutCap.supportsMaxOutputTokens);

  return (
    <button
      type="button"
      onClick={onOpen}
      data-slot="advanced-settings-summary-card"
      data-active={active ? "true" : "false"}
      className={cn(
        "group relative block w-full rounded-xl border p-4 text-left outline-none transition-all duration-200",
        "focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50",
        active
          ? "border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-violet-50 shadow-[0_2px_8px_rgba(79,70,229,0.10)]"
          : "border-slate-200 bg-white hover:-translate-y-px hover:border-slate-300 hover:shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
              active
                ? "border-indigo-200 bg-white text-indigo-600"
                : "border-slate-200 bg-slate-50 text-slate-500 group-hover:bg-white group-hover:text-slate-700"
            )}
          >
            <Sliders size={14} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Advanced controls
              {hasRestrictions && (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-700"
                  title="Some controls are not adjustable for the selected model"
                >
                  <Lock size={9} />
                  Limited
                </span>
              )}
            </div>
            <div className="mt-0.5 text-xs leading-relaxed text-slate-500">
              {hasRestrictions
                ? "This model fixes some sampling controls. Open to see what applies."
                : "Tune temperature, context window, and prompt stack."}
            </div>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold transition-colors",
            active
              ? "border-indigo-300 bg-indigo-100 text-indigo-700"
              : "border-slate-200 bg-slate-50 text-slate-500 group-hover:border-slate-300 group-hover:bg-white group-hover:text-slate-700"
          )}
        >
          {active ? (
            "Editing"
          ) : (
            <>
              Tune
              <ChevronRight size={11} className="-mr-0.5 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {badges.length ? (
          badges.slice(0, 4).map((badge) => (
            <span
              key={badge}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors",
                active
                  ? "border-indigo-200 bg-white text-indigo-700"
                  : "border-slate-200 bg-white text-slate-600"
              )}
            >
              {badge}
            </span>
          ))
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            <Sparkles size={10} />
            All defaults
          </span>
        )}
      </div>
    </button>
  );
};
