"use client";

import { useState } from "react";
import {
  Lock,
  Sparkles,
  KeyRound,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  MODEL_SELECTION_SECTIONS,
  RECOMMENDED_MODELS,
  getModelById,
  type ModelConfig,
} from "@/lib/models";
import { useByokStatus } from "@/hooks/use-byok-status";
import { ApiKeySettingsDialog } from "@/components/api-key-settings-dialog";
import type { ByokProvider, ProviderKeyStatusMap } from "@/lib/byok";
import { ModelProviderIcon } from "@/components/model-badge";
import { cn } from "@/lib/utils";

type ModelSelectionPanelProps = {
  selectedModel: string | null;
  onSelect: (modelId: string) => void;
  className?: string;
  compact?: boolean;
};

const renderModelCard = ({
  model,
  isSelected,
  onSelect,
  statuses,
  onManageKeys,
}: {
  model: ModelConfig;
  isSelected: boolean;
  onSelect: (modelId: string) => void;
  statuses: ProviderKeyStatusMap;
  onManageKeys: (provider?: ByokProvider) => void;
}) => {
  const requiresByok = Boolean(model.requiresByok && model.byokProvider);
  const providerStatus =
    requiresByok && model.byokProvider ? statuses[model.byokProvider] : null;
  const isDisabledByCatalog = model.availability === "disabled";
  const isUnavailable = isDisabledByCatalog || (requiresByok && !providerStatus?.configured);
  const statusLabel = requiresByok
    ? providerStatus?.configured
      ? "Connected"
      : "Connect key"
    : model.badge;

  return (
    <button
      key={model.id}
      type="button"
      onClick={() => {
        if (isDisabledByCatalog) return;
        if (requiresByok && !providerStatus?.configured) {
          onManageKeys(model.byokProvider);
          return;
        }
        onSelect(model.id);
      }}
      className={cn(
        "group relative flex min-h-[58px] min-w-[172px] flex-1 basis-[196px] items-center gap-3 overflow-hidden rounded-xl border px-3 py-3 text-left transition-colors",
        isSelected && !isUnavailable
          ? "border-slate-900 bg-slate-50 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.04)]"
          : "border-slate-200 bg-white",
        !isUnavailable && "hover:border-slate-400 hover:bg-slate-50/70",
        isUnavailable && "border-slate-200/90 bg-slate-50/95",
        requiresByok && !providerStatus?.configured && "hover:border-slate-300 hover:bg-white"
      )}
      data-slot="model-selection-option"
      aria-pressed={isSelected}
      aria-disabled={isUnavailable}
      title={
        isDisabledByCatalog
          ? model.disabledReason || "Currently unavailable"
          : requiresByok && !providerStatus?.configured
            ? `Connect your ${model.provider} key to unlock this model`
            : undefined
      }
    >
      <div
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3",
          isUnavailable && "opacity-90"
        )}
      >
        <ModelProviderIcon
          modelId={model.id}
          provider={model.provider}
          size={18}
          className="shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <div className="truncate text-sm font-semibold text-slate-900">
              {model.name}
            </div>
            {statusLabel && (
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                  isDisabledByCatalog
                    ? "bg-slate-200/80 text-slate-600"
                    : requiresByok && providerStatus?.configured
                      ? "bg-emerald-50 text-emerald-700"
                      : requiresByok
                        ? "bg-slate-100 text-slate-700"
                    : "bg-emerald-50 text-emerald-700"
                )}
              >
                {statusLabel}
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {model.provider}
          </div>
        </div>
      </div>

      {isDisabledByCatalog && (
        <>
          <div className="pointer-events-none absolute inset-0 bg-white/25" />
          <span className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 shadow-sm">
            <Lock className="h-3 w-3" />
            Locked
          </span>
        </>
      )}
    </button>
  );
};

export function ModelSelectionPanel({
  selectedModel,
  onSelect,
  className,
  compact = false,
}: ModelSelectionPanelProps) {
  const { statuses, refresh } = useByokStatus();
  const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);
  const [requestedProvider, setRequestedProvider] = useState<ByokProvider | undefined>();
  const defaultOpenSections = MODEL_SELECTION_SECTIONS.filter((section) => section.defaultOpen).map(
    (section) => section.id
  );
  const selectedModelConfig = selectedModel ? getModelById(selectedModel) : undefined;

  const handleManageKeys = (provider?: ByokProvider) => {
    setRequestedProvider(provider);
    setIsKeyDialogOpen(true);
  };

  return (
    <div className={cn("space-y-4", className)} data-slot="model-selection-panel">
      <ApiKeySettingsDialog
        open={isKeyDialogOpen}
        onOpenChange={setIsKeyDialogOpen}
        initialProvider={requestedProvider}
        onKeysChanged={refresh}
      />

      <div
        className={cn(
          "rounded-xl border border-slate-200 bg-white shadow-sm",
          compact ? "p-3" : "p-4"
        )}
      >
        <div
          className={cn(
            "gap-3",
            compact
              ? "flex flex-col"
              : "flex flex-col sm:flex-row sm:items-center sm:justify-between"
          )}
        >
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm">
              <KeyRound className="h-4 w-4" />
            </span>
            <div>
              <div className="text-sm font-semibold text-slate-900">
                API keys
              </div>
              <div className="text-xs leading-relaxed text-slate-500">
                Connect private OpenAI or Anthropic keys to unlock those models for this account.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleManageKeys()}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-white",
              compact ? "w-full justify-center" : "self-start sm:self-auto"
            )}
          >
            Manage keys
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(["openai", "anthropic"] as const).map((provider) => {
            const providerStatus = statuses[provider];
            return (
              <button
                key={provider}
                type="button"
                onClick={() => handleManageKeys(provider)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors",
                  providerStatus.configured
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                )}
              >
                <span>{provider === "openai" ? "OpenAI" : "Anthropic"}</span>
                <span className="text-[10px] tracking-[0.16em] opacity-80">
                  {providerStatus.configured ? providerStatus.keyHint || "Connected" : "Not connected"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-semibold text-slate-900">Recommended models</div>
            <div className="text-xs text-slate-500">
              Stable defaults for most branch conversations.
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {RECOMMENDED_MODELS.map((model) =>
            renderModelCard({
              model,
              isSelected: selectedModel === model.id,
              onSelect,
              statuses,
              onManageKeys: handleManageKeys,
            })
          )}
        </div>
      </div>

      {selectedModelConfig && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <ModelProviderIcon
              modelId={selectedModelConfig.id}
              provider={selectedModelConfig.provider}
              size={20}
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-semibold text-slate-900">
                  {selectedModelConfig.name}
                </div>
                {selectedModelConfig.badge && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                    {selectedModelConfig.badge}
                  </span>
                )}
              </div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {selectedModelConfig.provider}
              </div>
              <div className="mt-2 text-sm leading-relaxed text-slate-600">
                {selectedModelConfig.description}
              </div>
            </div>
          </div>
        </div>
      )}

      <Accordion
        type="multiple"
        defaultValue={defaultOpenSections}
        className="rounded-xl border border-slate-200 bg-white"
      >
        {MODEL_SELECTION_SECTIONS.map((section) => {
          const enabledCount = section.models.filter(
            (model) => model.availability !== "disabled"
          ).length;

          return (
            <AccordionItem
              key={section.id}
              value={section.id}
              className="border-slate-100 px-4"
            >
              <AccordionTrigger className="py-4 hover:no-underline">
                <div className="flex min-w-0 items-start gap-3 text-left">
                  <ModelProviderIcon
                    provider={section.provider}
                    modelName={section.name}
                    size={20}
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {section.name}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                        {enabledCount}/{section.models.length} live
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {section.description}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="flex flex-wrap gap-2">
                  {section.models.map((model) =>
                    renderModelCard({
                      model,
                      isSelected: selectedModel === model.id,
                      onSelect,
                      statuses,
                      onManageKeys: handleManageKeys,
                    })
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
