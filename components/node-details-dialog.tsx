"use client";

import {
  Boxes,
  Database,
  GitBranch,
  Info,
  Layers,
  Lock,
  MessageSquareText,
  Sliders,
  Sparkles,
  Thermometer,
  Wand2,
  X,
} from "lucide-react";
import { ModelBadge } from "@/components/model-badge";
import {
  getAdvancedBadges,
  getMaxOutputCapability,
  getModelTuningNote,
  getTemperatureCapability,
  isLiteLlmModel,
  normalizeAdvancedSettings,
  type AdvancedSettings,
} from "@/lib/advanced-settings";
import { getModelById } from "@/lib/models";
import { cn } from "@/lib/utils";

type NodeDetailsDialogProps = {
  open: boolean;
  onClose: () => void;
  node: {
    _id: string;
    name?: string;
    type?: string;
    primary?: boolean;
    model?: string;
    systemPrompt?: string;
    advancedSettings?: Partial<AdvancedSettings> | null;
    parentNodeId?: string;
  } | null;
  parentName?: string | null;
};

const formatNodeType = (type?: string, primary?: boolean) => {
  if (primary) return "Base context";
  switch (type) {
    case "entry":
      return "Base context";
    case "branch":
      return "Branch";
    case "context":
      return "Context";
    case "externalContext":
      return "External context";
    default:
      return "Node";
  }
};

const Row = ({
  label,
  value,
  hint,
  locked,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  locked?: boolean;
}) => (
  <div className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
        {label}
        {locked && (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-semibold normal-case tracking-normal text-slate-500">
            <Lock size={9} />
            Fixed
          </span>
        )}
      </div>
      {hint && (
        <div className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{hint}</div>
      )}
    </div>
    <div className="shrink-0 text-right text-[13px] font-semibold tabular-nums text-slate-900">
      {value}
    </div>
  </div>
);

export const NodeDetailsDialog = ({
  open,
  onClose,
  node,
  parentName,
}: NodeDetailsDialogProps) => {
  if (!open || !node) return null;

  const settings = normalizeAdvancedSettings(node.advancedSettings);
  const tempCap = getTemperatureCapability(node.model);
  const maxOutCap = getMaxOutputCapability(node.model);
  const tuningNote = getModelTuningNote(node.model);
  const isLiteLlm = isLiteLlmModel(node.model);
  const badges = getAdvancedBadges(settings);
  const modelInfo = node.model ? getModelById(node.model) : undefined;
  const trimmedSystemPrompt = (node.systemPrompt || "").trim();

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px] animate-in fade-in duration-200"
      onClick={onClose}
      data-slot="node-details-dialog-backdrop"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        data-slot="node-details-dialog"
      >
        {/* Header */}
        <div className="relative flex items-start justify-between gap-4 overflow-hidden border-b border-slate-100 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/40 px-6 py-4">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-200/30 blur-3xl"
          />
          <div className="relative z-[1] min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              <span
                className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded-md",
                  node.type === "entry"
                    ? "bg-slate-900 text-white"
                    : "bg-indigo-100 text-indigo-700"
                )}
              >
                {node.type === "entry" ? (
                  <Sparkles size={10} />
                ) : (
                  <GitBranch size={10} />
                )}
              </span>
              {formatNodeType(node.type, node.primary)}
              {parentName && node.type !== "entry" && (
                <span className="font-normal normal-case tracking-normal text-slate-400">
                  · from {parentName}
                </span>
              )}
            </div>
            <h3 className="mt-1 truncate text-lg font-semibold tracking-tight text-slate-950">
              {node.name || "Untitled"}
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Read-only view. These values were set when the node was created
              and travel with every chat request.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="relative z-[1] rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
          {/* Model */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-100 bg-violet-50 text-violet-600">
                <Wand2 size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Model
                </div>
                <div className="mt-2">
                  {node.model ? (
                    <ModelBadge modelId={node.model} size="md" />
                  ) : (
                    <span className="text-xs text-slate-400">No model assigned</span>
                  )}
                </div>
                {modelInfo?.description && (
                  <p className="mt-2 text-[11.5px] leading-relaxed text-slate-500">
                    {modelInfo.description}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Custom system prompt */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-600">
                <MessageSquareText size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Custom system prompt
                </div>
                {trimmedSystemPrompt ? (
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50/80 p-3 text-[12.5px] leading-[1.55] text-slate-700">
                    {trimmedSystemPrompt}
                  </pre>
                ) : (
                  <p className="mt-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2 text-[11.5px] text-slate-500">
                    No custom prompt set. The base canvas behaviour applies.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Advanced settings */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600">
                <Sliders size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Advanced controls
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {badges.length ? (
                      badges.slice(0, 4).map((badge) => (
                        <span
                          key={badge}
                          className="rounded-full border border-indigo-200/70 bg-white px-2 py-0.5 text-[10px] font-semibold text-indigo-700"
                        >
                          {badge}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        All defaults
                      </span>
                    )}
                  </div>
                </div>

                {tuningNote && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
                    <Info size={12} className="mt-0.5 shrink-0 text-amber-600" />
                    <span>{tuningNote}</span>
                  </div>
                )}
                {isLiteLlm && !tuningNote && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
                    <Info size={12} className="mt-0.5 shrink-0 text-amber-600" />
                    LiteLLM forwards these to whichever upstream provider you
                    configured. Some fields may be ignored.
                  </div>
                )}

                {/* Generation */}
                <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    <Thermometer size={12} />
                    Generation
                  </div>
                  <div className="mt-2 divide-y divide-slate-200/60">
                    <Row
                      label="Temperature"
                      locked={!tempCap.supportsTemperature}
                      hint={
                        tempCap.supportsTemperature
                          ? settings.temperature === null
                            ? "Falls back to the model's default."
                            : undefined
                          : "Reasoning models manage sampling internally."
                      }
                      value={
                        tempCap.supportsTemperature
                          ? settings.temperature === null
                            ? "Auto"
                            : settings.temperature.toFixed(1)
                          : "Provider-fixed"
                      }
                    />
                    <Row
                      label="Max output tokens"
                      locked={!maxOutCap.supportsMaxOutputTokens}
                      hint={
                        maxOutCap.supportsMaxOutputTokens
                          ? settings.maxOutputTokens === null
                            ? "Provider default applies."
                            : undefined
                          : "This model decides its own response length."
                      }
                      value={
                        maxOutCap.supportsMaxOutputTokens
                          ? settings.maxOutputTokens ?? "Default"
                          : "Provider-controlled"
                      }
                    />
                  </div>
                </div>

                {/* Context assembly */}
                <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    <Layers size={12} />
                    Context assembly
                  </div>
                  <div className="mt-2 divide-y divide-slate-200/60">
                    <Row
                      label="History mode"
                      value={
                        settings.historyMode === "lastK"
                          ? "Last K messages"
                          : "Auto summary + recent"
                      }
                    />
                    {settings.historyMode === "lastK" && (
                      <Row label="Last K" value={settings.lastKMessages} />
                    )}
                    <Row
                      label="External context chunks"
                      value={settings.externalContextTopK}
                    />
                    <Row
                      label="Context budget"
                      value={
                        settings.contextBudgetTokens
                          ? `${settings.contextBudgetTokens} tokens`
                          : "No limit"
                      }
                    />
                  </div>
                </div>

                {/* Prompt stack */}
                <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      <Boxes size={12} />
                      Prompt stack
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      Top → Bottom
                    </span>
                  </div>
                  <ol className="relative mt-2 space-y-1 pl-2 before:absolute before:left-[14px] before:top-3 before:bottom-3 before:w-px before:bg-gradient-to-b before:from-indigo-200 before:via-slate-200 before:to-transparent">
                    {[
                      "System Prompt",
                      `External Context (${settings.externalContextTopK})`,
                      "Branch Summary",
                      settings.historyMode === "lastK"
                        ? `Last ${settings.lastKMessages} Messages`
                        : "Auto History",
                      "Current User Message",
                    ].map((item, index) => (
                      <li
                        key={item}
                        className="relative flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-1.5 text-[11.5px] font-medium text-slate-700"
                      >
                        <span className="relative z-10 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white shadow-[0_0_0_1px_rgba(99,102,241,0.25)] text-[10px] font-semibold text-indigo-700 ring-2 ring-white">
                          {index + 1}
                        </span>
                        {item}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </section>

          {/* Storage hint */}
          <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-[11px] leading-relaxed text-slate-500">
            <Database size={12} className="mt-0.5 shrink-0 text-slate-400" />
            These values are stored on the node itself and applied to every
            chat request. To change them, create a new branch from this node
            with the values you want.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-200 bg-white px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
