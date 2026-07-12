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
    indigo: "border-primary/25 bg-primary/10 text-primary",
    violet: "border-violet-500/25 bg-violet-500/10 text-violet-400",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
    amber: "border-amber-500/25 bg-amber-500/10 text-amber-400",
    slate: "border-border bg-muted text-muted-foreground",
  };
  return (
    <section className="rounded-xl border border-border bg-muted/30 p-4">
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
          <h4 className="text-[13px] font-semibold tracking-tight text-foreground">
            {title}
          </h4>
          {description && (
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
};

// ── Big expanded panel: lives inside the Advanced disclosure ─
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
        "flex flex-col gap-4 animate-in fade-in-0 slide-in-from-right-2 duration-200",
        className
      )}
      data-slot="advanced-settings-panel"
    >
      {/* Header */}
      <div className="relative flex items-start justify-between gap-4 overflow-hidden rounded-xl border border-border bg-muted/30 p-4">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative z-[1] flex items-start gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="group mt-0.5 inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Back to model selection"
              data-slot="advanced-settings-back"
            >
              <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
              Models
            </button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                <Sliders size={14} />
              </span>
              <h3 className="type-heading">
                Advanced controls
              </h3>
            </div>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
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
                className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary"
              >
                {badge}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
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
            className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-[11px] leading-relaxed text-amber-300"
            data-slot="advanced-tuning-note"
          >
            <Info size={13} className="mt-0.5 shrink-0 text-amber-400" />
            <span>{tuningNote}</span>
          </div>
        )}

        {capability.supportsTemperature ? (
          <div className="rounded-lg border border-border bg-background/50 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Thermometer size={14} className="text-muted-foreground" />
                <label className="text-xs font-semibold text-foreground">
                  Temperature
                </label>
              </div>
              <button
                type="button"
                onClick={() => onChange(updateSetting(settings, "temperature", null))}
                className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
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
                className="min-w-0 flex-1 accent-primary"
                data-slot="advanced-temperature-slider"
              />
              <span className="inline-flex h-8 min-w-[64px] items-center justify-center rounded-lg border border-border bg-card px-2 text-xs font-semibold tabular-nums text-foreground">
                {settings.temperature === null ? "Auto" : settings.temperature.toFixed(1)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
              <span>Focused</span>
              <span>Balanced</span>
              <span>Creative</span>
            </div>
            {capability.isBestEffort && !tuningNote && (
              <p className="mt-2 text-[11px] leading-relaxed text-amber-400">
                LiteLLM temperature support depends on the selected provider.
                If a request fails, this value will be dropped automatically.
              </p>
            )}
          </div>
        ) : (
          <div
            className="rounded-lg border border-border bg-background/50 p-3.5"
            data-slot="advanced-temperature-locked"
          >
            <div className="flex items-start gap-2.5">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                <Lock size={13} />
              </span>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-foreground">
                  Temperature is fixed for this model
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
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
          <span className="flex items-center justify-between text-xs font-semibold text-foreground">
            Max output tokens
            {!maxOutCap.supportsMaxOutputTokens && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
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
            className="h-10 rounded-lg border-border bg-background text-sm"
            data-slot="advanced-max-output-input"
          />
          <span className="text-[11px] leading-relaxed text-muted-foreground">
            {maxOutCap.supportsMaxOutputTokens
              ? "Hard cap on response length. Leave blank to defer to the provider."
              : "This model decides its own response length."}
          </span>
        </label>

        {isLiteLlm && (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-300">
            <Info size={12} className="mt-0.5 shrink-0 text-amber-400" />
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
            <span className="text-xs font-semibold text-foreground">History mode</span>
            <select
              value={settings.historyMode}
              onChange={(event) =>
                onChange(updateSetting(settings, "historyMode", event.target.value as AdvancedSettings["historyMode"]))
              }
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-ring"
              data-slot="advanced-history-mode-select"
            >
              <option value="auto">Auto summary + recent</option>
              <option value="lastK">Last K messages</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-foreground">Last K messages</span>
            <Input
              type="number"
              min={0}
              max={50}
              value={settings.lastKMessages}
              disabled={settings.historyMode !== "lastK"}
              onChange={(event) =>
                onChange(updateSetting(settings, "lastKMessages", Number(event.target.value)))
              }
              className="h-10 rounded-lg border-border bg-background text-sm"
              data-slot="advanced-last-k-input"
            />
          </label>
        </div>

        <div className="mt-4 rounded-lg border border-border bg-background/50 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Database size={14} className="text-muted-foreground" />
              <label className="text-xs font-semibold text-foreground">
                External context chunks
              </label>
            </div>
            <span className="inline-flex h-7 min-w-[40px] items-center justify-center rounded-lg border border-border bg-card px-2 text-xs font-semibold tabular-nums text-foreground">
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
            className="mt-3 w-full accent-primary"
            data-slot="advanced-context-top-k-slider"
          />
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
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
          <span className="text-xs font-semibold text-foreground">Context budget (tokens)</span>
          <Input
            type="number"
            min={1}
            value={settings.contextBudgetTokens ?? ""}
            onChange={(event) =>
              onChange(updateSetting(settings, "contextBudgetTokens", event.target.value ? Number(event.target.value) : null))
            }
            placeholder="No limit"
            className="h-10 rounded-lg border-border bg-background text-sm"
            data-slot="advanced-context-budget-input"
          />
        </label>

        <div className="mt-4 rounded-lg border border-border bg-background/50 p-3.5">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-foreground">System prompt usage</span>
            <span className="font-medium tabular-nums text-muted-foreground">
              {promptTokens} tokens{budget ? ` / ${budget}` : ""}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                budget && promptTokens > budget ? "bg-rose-500" : "bg-primary"
              )}
              style={{ width: budget ? `${budgetPercent}%` : `${Math.min(100, promptTokens / 20)}%` }}
            />
          </div>
          {budget && promptTokens > budget && (
            <p className="mt-2 text-[11px] leading-relaxed text-rose-400">
              System prompt alone exceeds the context budget. Consider raising the budget or trimming the prompt.
            </p>
          )}
        </div>

        <div className="mt-4 rounded-lg border border-border bg-background/50 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Boxes size={14} className="text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">Prompt stack preview</span>
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
              Top → Bottom
            </span>
          </div>
          <ol className="relative mt-3 space-y-1.5 pl-2 before:absolute before:left-[14px] before:top-3 before:bottom-3 before:w-px before:bg-gradient-to-b before:from-primary/40 before:via-border before:to-transparent">
            {[
              "System Prompt",
              `External Context (${settings.externalContextTopK})`,
              "Branch Summary",
              settings.historyMode === "lastK" ? `Last ${settings.lastKMessages} Messages` : "Auto History",
              "Current User Message",
            ].map((item, index) => (
              <li
                key={item}
                className="relative flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[12px] font-medium text-foreground"
              >
                <span className="relative z-10 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-[10px] font-semibold text-primary">
                  {index + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </div>
      </SectionCard>

      {/* Footer actions */}
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Changes apply to this node only. Reset to inherit from parent or restore defaults.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(DEFAULT_ADVANCED_SETTINGS)}
            className="h-8 rounded-lg border-border text-xs text-muted-foreground hover:text-foreground"
          >
            Reset defaults
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onChange(parent)}
            className="h-8 rounded-lg bg-primary text-xs text-primary-foreground hover:bg-primary/90"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset to parent
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Compact summary card (legacy trigger, kept for compat) ──
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
        "focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "border-primary/40 bg-primary/10"
          : "border-border bg-card hover:-translate-y-px hover:border-input",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
              active
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border bg-muted text-muted-foreground group-hover:text-foreground"
            )}
          >
            <Sliders size={14} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Advanced controls
              {hasRestrictions && (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-400"
                  title="Some controls are not adjustable for the selected model"
                >
                  <Lock size={9} />
                  Limited
                </span>
              )}
            </div>
            <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
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
              ? "border-primary/30 bg-primary/15 text-primary"
              : "border-border bg-muted text-muted-foreground group-hover:text-foreground"
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
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-muted text-muted-foreground"
              )}
            >
              {badge}
            </span>
          ))
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            <Sparkles size={10} />
            All defaults
          </span>
        )}
      </div>
    </button>
  );
};
