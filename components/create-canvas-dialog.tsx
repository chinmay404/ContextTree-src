"use client";

import { useEffect, useState } from "react";
import { X, ChevronRight, ChevronDown, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { cn, generateCanvasTitle } from "@/lib/utils";
import { isPremiumUser, PREMIUM_TOOLTIP } from "@/lib/premium";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { getModelById, RECOMMENDED_MODELS } from "@/lib/models";
import { ModelProviderIcon } from "@/components/model-badge";
import { ModelSelectionPanel } from "@/components/model-selection-panel";
import { AdvancedSettingsPanel } from "@/components/advanced-settings-panel";
import {
  DEFAULT_ADVANCED_SETTINGS,
  type AdvancedSettings,
} from "@/lib/advanced-settings";

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
  const [showAllModels, setShowAllModels] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(initialTitle || generateCanvasTitle());
    setSelectedModel(null);
    setSystemPrompt("");
    setAdvancedSettings(DEFAULT_ADVANCED_SETTINGS);
    setShowAllModels(false);
    setAdvancedOpen(false);
  }, [initialTitle, open]);

  const premium = isPremiumUser();

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
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden rounded-2xl border-border bg-card p-0 shadow-2xl"
        overlayClassName="bg-black/60"
        showCloseButton={false}
        data-slot="create-canvas-dialog"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <DialogTitle className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
            New canvas
          </DialogTitle>
          <DialogClose
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Close canvas dialog"
          >
            <X size={16} strokeWidth={1.75} />
          </DialogClose>
        </div>
        <DialogDescription className="sr-only">
          Name the canvas and choose the model it should use by default.
        </DialogDescription>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
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
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleCreate();
                }
              }}
              placeholder="Q2 Product Strategy"
              className="h-10 rounded-lg border-border bg-background text-[13px] md:text-[13px] font-medium text-foreground shadow-none focus-visible:ring-2 focus-visible:ring-ring"
              data-slot="create-canvas-title-input"
            />
          </div>

          <div className="space-y-2">
            <div className="type-meta uppercase tracking-[0.08em]">Model</div>
            <ModelChipRow
              selectedModel={selectedModel}
              onSelect={setSelectedModel}
              expanded={showAllModels}
              onToggleExpanded={() => setShowAllModels((value) => !value)}
            />
            {showAllModels && (
              <div
                className="max-h-[320px] overflow-y-auto rounded-xl border border-border bg-background/40 p-3 animate-in fade-in-0 slide-in-from-top-1 duration-200"
                data-slot="create-canvas-model-panel"
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

          <div className="border-t border-border pt-4">
            <button
              type="button"
              onClick={() => {
                if (!premium) {
                  toast(PREMIUM_TOOLTIP);
                  return;
                }
                setAdvancedOpen((value) => !value);
              }}
              aria-expanded={premium ? advancedOpen : false}
              className="flex items-center gap-1.5 type-meta uppercase tracking-[0.08em] transition-colors hover:text-foreground"
              data-slot="create-canvas-advanced-disclosure"
            >
              {premium ? (
                <ChevronRight
                  size={14}
                  strokeWidth={1.75}
                  className={cn("transition-transform", advancedOpen && "rotate-90")}
                />
              ) : (
                <Lock size={14} strokeWidth={1.75} />
              )}
              Advanced
              {!premium && (
                <span className="type-meta rounded-full bg-primary/15 px-2 py-0.5 text-primary">
                  Founding
                </span>
              )}
            </button>
            {premium && advancedOpen && (
              <div className="mt-4 space-y-4 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                <div className="space-y-2">
                  <div className="type-meta uppercase tracking-[0.08em]">
                    Custom system prompt
                  </div>
                  <Textarea
                    value={systemPrompt}
                    onChange={(event) => setSystemPrompt(event.target.value)}
                    placeholder="Optional instructions for the base context..."
                    className="min-h-[110px] resize-none rounded-lg border-border bg-background text-sm leading-relaxed text-foreground"
                    data-slot="create-canvas-system-prompt-input"
                  />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    This is saved on the base node. New branches copy it by default unless edited.
                  </p>
                </div>
                <AdvancedSettingsPanel
                  value={advancedSettings}
                  onChange={setAdvancedSettings}
                  modelId={selectedModel}
                  systemPrompt={systemPrompt}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5">
          <Button
            type="button"
            variant="ghost"
            className="h-9 rounded-lg px-4 text-[13px] font-medium text-muted-foreground hover:text-foreground"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-9 rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground hover:bg-primary/90"
            onClick={handleCreate}
            disabled={isCreating || !title.trim() || !selectedModel}
          >
            {isCreating && (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.75} />
            )}
            {isCreating ? "Creating..." : "Create canvas"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
