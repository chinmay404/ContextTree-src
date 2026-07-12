"use client";

import { useMemo, useState } from "react";
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
import { BYOK_PROVIDERS, type ByokProvider, type ProviderKeyStatusMap } from "@/lib/byok";
import { ModelProviderIcon } from "@/components/model-badge";
import { cn } from "@/lib/utils";

type ModelSelectionPanelProps = {
  selectedModel: string | null;
  onSelect: (modelId: string) => void;
  className?: string;
  compact?: boolean;
  mode?: "full" | "branch";
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
          ? "border-primary/50 bg-primary/10"
          : "border-border bg-card",
        !isUnavailable && "hover:border-input hover:bg-accent",
        isUnavailable && "border-border bg-muted/50",
        requiresByok && !providerStatus?.configured && "hover:border-input hover:bg-accent"
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
          isUnavailable && "opacity-80"
        )}
      >
        <ModelProviderIcon
          modelId={model.id}
          provider={model.provider}
          size={16}
          className="shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <div className="truncate type-ui">
              {model.name}
            </div>
            {statusLabel && (
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]",
                  isDisabledByCatalog
                    ? "bg-muted text-muted-foreground"
                    : requiresByok && providerStatus?.configured
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : requiresByok
                        ? "bg-muted text-muted-foreground"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                )}
              >
                {statusLabel}
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate type-meta uppercase tracking-[0.08em]">
            {model.provider}
          </div>
        </div>
      </div>

      {isDisabledByCatalog && (
        <>
          <div className="pointer-events-none absolute inset-0 bg-background/40" />
          <span className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-border bg-card/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            <Lock className="h-3 w-3" strokeWidth={1.75} />
            Locked
          </span>
        </>
      )}
    </button>
  );
};

const getProviderLabel = (provider: ByokProvider) => {
  if (provider === "openai") return "OpenAI";
  if (provider === "anthropic") return "Anthropic";
  return "LiteLLM";
};

const normalizeLiteLlmSelection = (value: string) => {
  const trimmed = value.trim().replace(/^litellm\//i, "");
  return trimmed ? `litellm/${trimmed}` : "";
};

export function ModelSelectionPanel({
  selectedModel,
  onSelect,
  className,
  compact = false,
  mode = "full",
}: ModelSelectionPanelProps) {
  const { statuses, refresh } = useByokStatus();
  const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);
  const [requestedProvider, setRequestedProvider] = useState<ByokProvider | undefined>();
  const [customLiteLlmModel, setCustomLiteLlmModel] = useState("");
  const isBranchMode = mode === "branch";
  const defaultOpenSections = isBranchMode
    ? []
    : MODEL_SELECTION_SECTIONS.filter((section) => section.defaultOpen).map(
        (section) => section.id
      );
  const selectedModelConfig = selectedModel ? getModelById(selectedModel) : undefined;
  const selectedLiteLlmModel =
    selectedModel?.startsWith("litellm/") ? selectedModel.replace(/^litellm\//, "") : "";
  const liteLlmSelection = normalizeLiteLlmSelection(customLiteLlmModel);
  const liteLlmStatus = statuses.litellm;
  const customLiteLlmConfig = useMemo<ModelConfig>(
    () => ({
      id: liteLlmSelection || "litellm/custom",
      name: customLiteLlmModel.trim() || "Custom LiteLLM model",
      description: "Route through LiteLLM with your saved credential and optional private endpoint.",
      provider: "LiteLLM",
      availability: "enabled",
      badge: "Custom",
      requiresByok: true,
      byokProvider: "litellm",
    }),
    [customLiteLlmModel, liteLlmSelection]
  );

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

      {isBranchMode ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="type-ui">Private models</div>
            <div className="text-xs leading-relaxed text-muted-foreground">
              Saved keys unlock BYOK and custom LiteLLM choices.
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleManageKeys()}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted px-3 type-ui transition-colors hover:bg-accent"
          >
            Manage keys
          </button>
        </div>
      ) : (
        <div
          className={cn(
            "rounded-xl border border-border bg-card",
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
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                <KeyRound className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <div>
                <div className="type-ui">
                  API keys
                </div>
                <div className="text-xs leading-relaxed text-muted-foreground">
                  Connect private OpenAI or Anthropic keys to unlock those models for this account.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleManageKeys()}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 type-ui transition-colors hover:bg-accent",
                compact ? "w-full justify-center" : "self-start sm:self-auto"
              )}
            >
              Manage keys
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {BYOK_PROVIDERS.map((provider) => {
              const providerStatus = statuses[provider];
              return (
                <button
                  key={provider}
                  type="button"
                  onClick={() => handleManageKeys(provider)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] transition-colors",
                    providerStatus.configured
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-border bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <span>{getProviderLabel(provider)}</span>
                  <span className="font-mono text-[10px] tracking-normal opacity-80">
                    {providerStatus.configured ? providerStatus.keyHint || "Connected" : "Not connected"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
            <Sparkles className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <div>
            <div className="type-ui">Recommended models</div>
            <div className={cn("text-xs text-muted-foreground", isBranchMode && "sr-only")}>
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

      <div className={cn("rounded-xl border border-border bg-card", isBranchMode ? "p-3" : "p-4")}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
              <KeyRound className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div>
              <div className="type-ui">Custom LiteLLM model</div>
              <div className={cn("text-xs leading-relaxed text-muted-foreground", isBranchMode && "sr-only")}>
                Enter a LiteLLM model string such as openrouter/provider/model or openai/private-model.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleManageKeys("litellm")}
            className="shrink-0 rounded-lg border border-border bg-muted px-3 py-2 type-ui transition-colors hover:bg-accent"
          >
            LiteLLM keys
          </button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={customLiteLlmModel}
            onChange={(event) => setCustomLiteLlmModel(event.target.value)}
            placeholder={selectedLiteLlmModel || "openrouter/meta-llama/llama-3.1-70b-instruct"}
            className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 font-mono text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring"
            data-slot="custom-litellm-model-input"
          />
          <button
            type="button"
            onClick={() => {
              if (!liteLlmStatus.configured) {
                handleManageKeys("litellm");
                return;
              }
              if (liteLlmSelection) {
                onSelect(liteLlmSelection);
              }
            }}
            disabled={!liteLlmSelection}
            className="h-10 rounded-lg bg-primary px-4 type-ui text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          >
            Use model
          </button>
        </div>

        {(liteLlmSelection || selectedLiteLlmModel) && (
          <div className="mt-3">
            {renderModelCard({
              model: customLiteLlmConfig,
              isSelected: selectedModel === liteLlmSelection || selectedModel === customLiteLlmConfig.id,
              onSelect,
              statuses,
              onManageKeys: handleManageKeys,
            })}
          </div>
        )}
      </div>

      {!isBranchMode && (selectedModelConfig || selectedLiteLlmModel) && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <ModelProviderIcon
              modelId={selectedModelConfig?.id || selectedModel}
              provider={selectedModelConfig?.provider || "LiteLLM"}
              size={18}
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="type-ui">
                  {selectedModelConfig?.name || selectedLiteLlmModel}
                </div>
                {(selectedModelConfig?.badge || selectedLiteLlmModel) && (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-emerald-600 dark:text-emerald-400">
                    {selectedModelConfig?.badge || "LiteLLM"}
                  </span>
                )}
              </div>
              <div className="mt-1 type-meta uppercase tracking-[0.08em]">
                {selectedModelConfig?.provider || "LiteLLM"}
              </div>
              <div className="mt-2 type-body text-muted-foreground">
                {selectedModelConfig?.description || "Custom model routed through your saved LiteLLM credential."}
              </div>
            </div>
          </div>
        </div>
      )}

      <Accordion
        type="multiple"
        defaultValue={defaultOpenSections}
        className="rounded-xl border border-border bg-card"
      >
        {MODEL_SELECTION_SECTIONS.map((section) => {
          const enabledCount = section.models.filter(
            (model) => model.availability !== "disabled"
          ).length;

          return (
            <AccordionItem
              key={section.id}
              value={section.id}
              className="border-border px-4"
            >
              <AccordionTrigger className="py-4 hover:no-underline">
                <div className="flex min-w-0 items-start gap-3 text-left">
                  <ModelProviderIcon
                    provider={section.provider}
                    modelName={section.name}
                    size={18}
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="type-ui">
                        {section.name}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                        {enabledCount}/{section.models.length} live
                      </span>
                    </div>
                    <div className={cn("mt-1 text-xs text-muted-foreground", isBranchMode && "sr-only")}>
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
