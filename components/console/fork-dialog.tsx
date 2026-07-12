"use client";

import { memo, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, ChevronRight, ChevronDown } from "lucide-react";
import { getDefaultModel, getModelById, RECOMMENDED_MODELS } from "@/lib/models";
import { ModelProviderIcon } from "@/components/model-badge";
import { ModelSelectionPanel } from "@/components/model-selection-panel";
import { AdvancedSettingsPanel } from "@/components/advanced-settings-panel";
import {
  DEFAULT_ADVANCED_SETTINGS,
  normalizeAdvancedSettings,
  type AdvancedSettings,
} from "@/lib/advanced-settings";
import { cn } from "@/lib/utils";

// Auto-suggest a branch name from the first ~5 words of the message being
// forked from. Falls back to the generic "Branch from …" label when the
// source message content is unavailable.
const suggestBranchName = (content: string, maxWords = 5) =>
  content
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, maxWords)
    .join(" ");

// Compact horizontal chip row of recommended models. If the current
// selection came from the expanded catalog, it is appended as an extra
// selected chip so the choice stays visible when the catalog is collapsed.
const ModelChipRow = ({
  selectedModel,
  onSelect,
  expanded,
  onToggleExpanded,
}: {
  selectedModel: string | null;
  onSelect: (modelId: string) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
}) => {
  const isCustomSelection =
    Boolean(selectedModel) &&
    !RECOMMENDED_MODELS.some((model) => model.id === selectedModel);

  const chipClass = (isSelected: boolean) =>
    cn(
      "flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 type-ui transition-colors",
      isSelected
        ? "border-primary/50 bg-primary/10"
        : "border-border bg-muted hover:border-input hover:bg-accent"
    );

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1" data-slot="model-chip-row">
      {RECOMMENDED_MODELS.map((model) => (
        <button
          key={model.id}
          type="button"
          onClick={() => onSelect(model.id)}
          className={chipClass(selectedModel === model.id)}
          data-slot="model-chip"
        >
          <ModelProviderIcon modelId={model.id} size={14} />
          <span className="whitespace-nowrap">{model.name}</span>
        </button>
      ))}
      {isCustomSelection && selectedModel && (
        <button
          type="button"
          onClick={() => onSelect(selectedModel)}
          className={chipClass(true)}
          data-slot="model-chip"
        >
          <ModelProviderIcon modelId={selectedModel} size={14} />
          <span className="whitespace-nowrap">
            {getModelById(selectedModel)?.name ?? selectedModel}
          </span>
        </button>
      )}
      <button
        type="button"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
        className={cn(
          "flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 type-ui text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          expanded && "bg-accent text-foreground"
        )}
        data-slot="model-chip-more"
      >
        More models…
        <ChevronDown
          size={14}
          strokeWidth={1.75}
          className={cn("transition-transform", expanded && "rotate-180")}
        />
      </button>
    </div>
  );
};

type ForkDialogProps = {
  open: boolean;
  sourceName: string;
  sourceMessageContent?: string;
  inheritedSystemPrompt?: string;
  inheritedAdvancedSettings?: Partial<AdvancedSettings> | null;
  onCancel: () => void;
  onConfirm: (model: string, name: string, systemPrompt: string, advancedSettings: AdvancedSettings) => void;
};

export const ForkDialog = memo(function ForkDialog({
  open,
  sourceName,
  sourceMessageContent,
  inheritedSystemPrompt = "",
  inheritedAdvancedSettings,
  onCancel,
  onConfirm,
}: ForkDialogProps) {
  const [model, setModel] = useState(getDefaultModel());
  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>(DEFAULT_ADVANCED_SETTINGS);
  const [showAllModels, setShowAllModels] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    setModel(getDefaultModel());
    const suggested = sourceMessageContent
      ? suggestBranchName(sourceMessageContent)
      : "";
    setName(suggested || `Branch from ${sourceName.slice(0, 24)}`.trim());
    setSystemPrompt(inheritedSystemPrompt);
    setAdvancedSettings(normalizeAdvancedSettings(inheritedAdvancedSettings));
    setShowAllModels(false);
    setAdvancedOpen(false);
  }, [open, sourceName, sourceMessageContent, inheritedSystemPrompt, inheritedAdvancedSettings]);
  if (!open) return null;

  const canCreate = name.trim().length > 0;
  const handleConfirm = () => {
    if (!canCreate) return;
    onConfirm(model, name, systemPrompt, advancedSettings);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h3 className="type-heading">New branch</h3>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Close branch dialog"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="space-y-2">
            <label
              htmlFor="fork-branch-name"
              className="type-meta uppercase tracking-[0.08em]"
            >
              Branch name
            </label>
            <Input
              autoFocus
              id="fork-branch-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleConfirm();
                }
              }}
              placeholder="Branch from current reply"
              className="h-10 rounded-lg border-border bg-background text-[13px] md:text-[13px] font-medium text-foreground shadow-none focus-visible:ring-2 focus-visible:ring-ring"
              data-slot="fork-branch-name-input"
            />
          </div>

          <div className="space-y-2">
            <div className="type-meta uppercase tracking-[0.08em]">Model</div>
            <ModelChipRow
              selectedModel={model}
              onSelect={setModel}
              expanded={showAllModels}
              onToggleExpanded={() => setShowAllModels((value) => !value)}
            />
            {showAllModels && (
              <div
                className="max-h-[320px] overflow-y-auto rounded-xl border border-border bg-background/40 p-3 animate-in fade-in-0 slide-in-from-top-1 duration-200"
                data-slot="fork-model-panel"
              >
                <ModelSelectionPanel
                  selectedModel={model}
                  onSelect={setModel}
                  compact
                  mode="branch"
                />
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setAdvancedOpen((value) => !value)}
              aria-expanded={advancedOpen}
              className="flex items-center gap-1.5 type-meta uppercase tracking-[0.08em] transition-colors hover:text-foreground"
              data-slot="fork-advanced-disclosure"
            >
              <ChevronRight
                size={14}
                strokeWidth={1.75}
                className={cn("transition-transform", advancedOpen && "rotate-90")}
              />
              Advanced
            </button>
            {advancedOpen && (
              <div className="mt-4 space-y-4 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                <div className="space-y-2">
                  <div className="type-meta uppercase tracking-[0.08em]">
                    Custom system prompt
                  </div>
                  <Textarea
                    value={systemPrompt}
                    onChange={(event) => setSystemPrompt(event.target.value)}
                    placeholder="Optional instructions for this branch..."
                    className="min-h-[110px] resize-none rounded-lg border-border bg-background text-sm leading-relaxed text-foreground"
                    data-slot="fork-system-prompt-input"
                  />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    By default this is copied from the parent node. Edit it only when this branch needs different behavior.
                  </p>
                </div>
                <AdvancedSettingsPanel
                  value={advancedSettings}
                  onChange={setAdvancedSettings}
                  modelId={model}
                  systemPrompt={systemPrompt}
                  parentSettings={inheritedAdvancedSettings}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="h-9 rounded-lg px-4 text-[13px] font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canCreate}
            className="h-9 rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create branch
          </Button>
        </div>
      </div>
    </div>
  );
});
