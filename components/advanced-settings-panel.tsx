"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_ADVANCED_SETTINGS,
  estimateTokens,
  getAdvancedBadges,
  getTemperatureCapability,
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
};

const updateSetting = <K extends keyof AdvancedSettings>(
  current: AdvancedSettings,
  key: K,
  value: AdvancedSettings[K]
) => normalizeAdvancedSettings({ ...current, [key]: value });

export const AdvancedSettingsPanel = ({
  value,
  onChange,
  modelId,
  systemPrompt = "",
  parentSettings,
  className,
}: AdvancedSettingsPanelProps) => {
  const settings = normalizeAdvancedSettings(value);
  const parent = normalizeAdvancedSettings(parentSettings);
  const capability = getTemperatureCapability(modelId);
  const badges = getAdvancedBadges(settings);
  const promptTokens = estimateTokens(systemPrompt);
  const budget = settings.contextBudgetTokens;
  const budgetPercent = budget ? Math.min(100, Math.round((promptTokens / budget) * 100)) : 0;
  const activeTemperature = settings.temperature ?? capability.defaultValue;

  return (
    <details
      className={cn("group rounded-xl border border-slate-200 bg-white p-4", className)}
      data-slot="advanced-settings-panel"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Advanced controls
          </div>
          <div className="mt-1 text-xs leading-relaxed text-slate-500">
            Tune generation, context, and prompt assembly for this node.
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          {badges.length ? (
            badges.slice(0, 3).map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600"
              >
                {badge}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500">
              Defaults
            </span>
          )}
        </div>
      </summary>

      <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
        {capability.supportsTemperature ? (
          <div>
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-semibold text-slate-700">
                Temperature
              </label>
              <button
                type="button"
                onClick={() => onChange(updateSetting(settings, "temperature", null))}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-700"
              >
                Model default
              </button>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range"
                min={capability.min}
                max={capability.max}
                step="0.1"
                value={activeTemperature}
                onChange={(event) =>
                  onChange(updateSetting(settings, "temperature", Number(event.target.value)))
                }
                className="min-w-0 flex-1 accent-slate-950"
                data-slot="advanced-temperature-slider"
              />
              <span className="w-10 text-right text-xs font-semibold tabular-nums text-slate-700">
                {settings.temperature === null ? "Auto" : settings.temperature.toFixed(1)}
              </span>
            </div>
            {capability.isBestEffort && (
              <p className="mt-1 text-[11px] leading-relaxed text-amber-700">
                LiteLLM temperature support depends on the selected provider.
              </p>
            )}
          </div>
        ) : (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            This model does not expose temperature controls.
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700">Max output tokens</span>
            <Input
              type="number"
              min={1}
              max={32000}
              value={settings.maxOutputTokens ?? ""}
              onChange={(event) =>
                onChange(updateSetting(settings, "maxOutputTokens", event.target.value ? Number(event.target.value) : null))
              }
              placeholder="Provider default"
              className="h-9 rounded-lg text-sm"
              data-slot="advanced-max-output-input"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700">Context budget</span>
            <Input
              type="number"
              min={1}
              value={settings.contextBudgetTokens ?? ""}
              onChange={(event) =>
                onChange(updateSetting(settings, "contextBudgetTokens", event.target.value ? Number(event.target.value) : null))
              }
              placeholder="No limit"
              className="h-9 rounded-lg text-sm"
              data-slot="advanced-context-budget-input"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700">History mode</span>
            <select
              value={settings.historyMode}
              onChange={(event) =>
                onChange(updateSetting(settings, "historyMode", event.target.value as AdvancedSettings["historyMode"]))
              }
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
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
              className="h-9 rounded-lg text-sm"
              data-slot="advanced-last-k-input"
            />
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs font-semibold text-slate-700">
              External context chunks
            </label>
            <span className="text-xs font-semibold tabular-nums text-slate-500">
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
            className="mt-2 w-full accent-slate-950"
            data-slot="advanced-context-top-k-slider"
          />
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-slate-700">System prompt usage</span>
            <span className="font-medium tabular-nums text-slate-500">
              {promptTokens} tokens{budget ? ` / ${budget}` : ""}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
            <div
              className={cn(
                "h-full rounded-full",
                budget && promptTokens > budget ? "bg-rose-500" : "bg-slate-900"
              )}
              style={{ width: budget ? `${budgetPercent}%` : `${Math.min(100, promptTokens / 20)}%` }}
            />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="text-xs font-semibold text-slate-700">Prompt stack preview</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              "System Prompt",
              `External Context (${settings.externalContextTopK})`,
              "Branch Summary",
              settings.historyMode === "lastK" ? `Last ${settings.lastKMessages} Messages` : "Auto History",
              "Current User Message",
            ].map((item) => (
              <span
                key={item}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(parent)}
            className="h-8 rounded-lg text-xs"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset to parent
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(DEFAULT_ADVANCED_SETTINGS)}
            className="h-8 rounded-lg text-xs"
          >
            Reset defaults
          </Button>
        </div>
      </div>
    </details>
  );
};
