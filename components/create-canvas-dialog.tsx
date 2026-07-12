"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { generateCanvasTitle } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ModelSelectionPanel } from "@/components/model-selection-panel";
import { ModelBadge } from "@/components/model-badge";
import {
  AdvancedSettingsPanel,
  AdvancedSettingsSummaryCard,
} from "@/components/advanced-settings-panel";
import {
  DEFAULT_ADVANCED_SETTINGS,
  type AdvancedSettings,
} from "@/lib/advanced-settings";

type CreateCanvasDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: { title: string; model: string; systemPrompt: string; advancedSettings: AdvancedSettings }) => Promise<void> | void;
  isCreating?: boolean;
  initialTitle?: string;
};

export const CreateCanvasDialog = ({
  open,
  onOpenChange,
  onCreate,
  isCreating = false,
  initialTitle,
}: CreateCanvasDialogProps) => {
  const [title, setTitle] = useState(initialTitle || generateCanvasTitle());
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>(DEFAULT_ADVANCED_SETTINGS);
  const [rightPaneView, setRightPaneView] = useState<"models" | "advanced">("models");

  useEffect(() => {
    if (!open) return;
    setTitle(initialTitle || generateCanvasTitle());
    setSelectedModel(null);
    setSystemPrompt("");
    setAdvancedSettings(DEFAULT_ADVANCED_SETTINGS);
    setRightPaneView("models");
  }, [initialTitle, open]);

  const handleCreate = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !selectedModel || isCreating) return;

    await onCreate({
      title: trimmedTitle,
      model: selectedModel,
      systemPrompt,
      advancedSettings,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] !w-[min(96vw,1120px)] !max-w-[min(96vw,1120px)] sm:!max-w-[min(96vw,1120px)] flex-col gap-0 overflow-hidden rounded-2xl border-border bg-card p-0 shadow-[0_24px_80px_rgba(15,23,42,0.24)]"
        data-slot="create-canvas-dialog"
      >
        <div className="border-b border-border px-6 py-4">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-foreground">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                <img src="/tree-icon.svg" alt="" className="h-4 w-4" />
              </span>
              New canvas
            </DialogTitle>
            <DialogDescription className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Name the canvas and choose the model it should use by default.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="border-b border-border bg-muted px-6 py-5 lg:border-b-0 lg:border-r">
            <div className="space-y-2">
              <label
                htmlFor="create-canvas-title"
                className="type-meta uppercase tracking-[0.08em]"
              >
                Canvas name
              </label>
              <Input
                autoFocus
                id="create-canvas-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Q2 Product Strategy"
                className="h-11 rounded-lg border-border bg-background text-[13px] md:text-[13px] font-medium text-foreground shadow-none focus-visible:ring-2 focus-visible:ring-ring"
                data-slot="create-canvas-title-input"
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                This name appears in your workspace list, and you can rename it later.
              </p>
            </div>

            <AdvancedSettingsSummaryCard
              value={advancedSettings}
              onOpen={() => setRightPaneView("advanced")}
              active={rightPaneView === "advanced"}
              modelId={selectedModel}
              className="mt-5"
            />

            <div className="mt-5 rounded-xl border border-border bg-card p-4">
              <div className="type-meta uppercase tracking-[0.08em]">
                Custom system prompt
              </div>
              <Textarea
                value={systemPrompt}
                onChange={(event) => setSystemPrompt(event.target.value)}
                placeholder="Optional instructions for the base context..."
                className="mt-3 min-h-[132px] resize-none rounded-lg border-border bg-background text-sm leading-relaxed text-foreground"
                data-slot="create-canvas-system-prompt-input"
              />
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                This is saved on the base node. New branches copy it by default unless edited.
              </p>
            </div>

            <div className="mt-5 rounded-xl border border-border bg-card p-4">
              <div className="type-meta uppercase tracking-[0.08em]">
                Starting model
              </div>
              <div className="mt-3">
                {selectedModel ? (
                  <ModelBadge modelId={selectedModel} size="md" />
                ) : (
                  <span className="inline-flex rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Choose a model
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                This becomes the default for the base context and new branches in this canvas.
              </p>
            </div>
          </div>

          <div className="min-w-0 px-6 py-5">
            {rightPaneView === "advanced" ? (
              <AdvancedSettingsPanel
                key="advanced"
                value={advancedSettings}
                onChange={setAdvancedSettings}
                modelId={selectedModel}
                systemPrompt={systemPrompt}
                onBack={() => setRightPaneView("models")}
              />
            ) : (
              <div
                key="models"
                className="animate-in fade-in-0 slide-in-from-left-2 duration-200"
              >
                <ModelSelectionPanel
                  selectedModel={selectedModel}
                  onSelect={setSelectedModel}
                  compact
                  mode="branch"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-3 border-t border-border bg-card px-6 py-4 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="h-10 flex-1 rounded-lg border-border text-[13px] font-medium"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-10 flex-1 rounded-lg bg-primary text-[13px] font-medium text-primary-foreground hover:bg-primary/90"
            onClick={handleCreate}
            disabled={isCreating || !title.trim() || !selectedModel}
          >
            {isCreating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.75} />
            ) : (
              <Plus className="mr-2 h-4 w-4" strokeWidth={1.75} />
            )}
            {isCreating ? "Creating..." : "Create Canvas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
