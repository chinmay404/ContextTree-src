"use client";

import { memo, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, GitBranch } from "lucide-react";
import { getDefaultModel } from "@/lib/models";
import { ModelBadge } from "@/components/model-badge";
import { ModelSelectionPanel } from "@/components/model-selection-panel";
import {
  AdvancedSettingsPanel,
  AdvancedSettingsSummaryCard,
} from "@/components/advanced-settings-panel";
import {
  DEFAULT_ADVANCED_SETTINGS,
  normalizeAdvancedSettings,
  type AdvancedSettings,
} from "@/lib/advanced-settings";

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
  const [rightPaneView, setRightPaneView] = useState<"models" | "advanced">("models");
  useEffect(() => {
    if (!open) return;
    setModel(getDefaultModel());
    const suggested = sourceMessageContent
      ? suggestBranchName(sourceMessageContent)
      : "";
    setName(suggested || `Branch from ${sourceName.slice(0, 24)}`.trim());
    setSystemPrompt(inheritedSystemPrompt);
    setAdvancedSettings(normalizeAdvancedSettings(inheritedAdvancedSettings));
    setRightPaneView("models");
  }, [open, sourceName, sourceMessageContent, inheritedSystemPrompt, inheritedAdvancedSettings]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-[1120px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                  <GitBranch size={15} />
                </span>
                New branch
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Set the branch label and model before it appears on the canvas.
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Close branch dialog"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="border-b border-border bg-muted px-6 py-5 lg:border-b-0 lg:border-r">
            <div className="space-y-2">
              <label
                htmlFor="fork-branch-name"
                className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
              >
                Branch name
              </label>
              <Input
                autoFocus
                id="fork-branch-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Branch from current reply"
                className="h-11 rounded-lg border-border bg-background text-sm font-medium text-foreground shadow-none focus-visible:ring-2 focus-visible:ring-ring"
                data-slot="fork-branch-name-input"
              />
            </div>

            <AdvancedSettingsSummaryCard
              value={advancedSettings}
              onOpen={() => setRightPaneView("advanced")}
              active={rightPaneView === "advanced"}
              modelId={model}
              className="mt-5"
            />

            <div className="mt-5 rounded-xl border border-border bg-card p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Custom system prompt
              </div>
              <Textarea
                value={systemPrompt}
                onChange={(event) => setSystemPrompt(event.target.value)}
                placeholder="Optional instructions for this branch..."
                className="mt-3 min-h-[132px] resize-none rounded-lg border-border bg-background text-sm leading-relaxed text-foreground"
                data-slot="fork-system-prompt-input"
              />
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                By default this is copied from the parent node. Edit it only when this branch needs different behavior.
              </p>
            </div>

            <div className="mt-5 rounded-xl border border-border bg-card p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Selected model
              </div>
              <div className="mt-3">
                <ModelBadge modelId={model} size="md" />
              </div>
            </div>
          </div>

          <div className="min-w-0 px-6 py-5">
            {rightPaneView === "advanced" ? (
              <AdvancedSettingsPanel
                key="advanced"
                value={advancedSettings}
                onChange={setAdvancedSettings}
                modelId={model}
                systemPrompt={systemPrompt}
                parentSettings={inheritedAdvancedSettings}
                onBack={() => setRightPaneView("models")}
              />
            ) : (
              <div
                key="models"
                className="animate-in fade-in-0 slide-in-from-left-2 duration-200"
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
        </div>

        <div className="flex gap-3 border-t border-border bg-card px-6 py-4">
          <Button
            variant="outline"
            onClick={onCancel}
            className="h-10 flex-1 rounded-lg border-border text-sm font-medium"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(model, name, systemPrompt, advancedSettings)}
            className="h-10 flex-1 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create Branch
          </Button>
        </div>
      </div>
    </div>
  );
});
