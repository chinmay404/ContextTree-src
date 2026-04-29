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
        className="flex max-h-[90vh] !w-[min(96vw,1120px)] !max-w-[min(96vw,1120px)] sm:!max-w-[min(96vw,1120px)] flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-[0_24px_80px_rgba(15,23,42,0.24)]"
        data-slot="create-canvas-dialog"
      >
        <div className="border-b border-slate-200 px-6 py-4">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-950">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600">
                <img src="/tree-icon.svg" alt="" className="h-4 w-4" />
              </span>
              New canvas
            </DialogTitle>
            <DialogDescription className="max-w-2xl text-sm text-slate-500">
              Name the canvas and choose the model it should use by default.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-5 lg:border-b-0 lg:border-r">
            <div className="space-y-2">
              <label
                htmlFor="create-canvas-title"
                className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
              >
                Canvas name
              </label>
              <Input
                autoFocus
                id="create-canvas-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Q2 Product Strategy"
                className="h-11 rounded-lg border-slate-300 bg-white text-sm font-medium text-slate-900 shadow-none focus-visible:ring-2 focus-visible:ring-slate-900/10"
                data-slot="create-canvas-title-input"
              />
              <p className="text-xs leading-relaxed text-slate-500">
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

            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Custom system prompt
              </div>
              <Textarea
                value={systemPrompt}
                onChange={(event) => setSystemPrompt(event.target.value)}
                placeholder="Optional instructions for the base context..."
                className="mt-3 min-h-[132px] resize-none rounded-lg border-slate-200 bg-slate-50 text-sm leading-relaxed text-slate-800"
                data-slot="create-canvas-system-prompt-input"
              />
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                This is saved on the base node. New branches copy it by default unless edited.
              </p>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Starting model
              </div>
              <div className="mt-3">
                {selectedModel ? (
                  <ModelBadge modelId={selectedModel} size="md" />
                ) : (
                  <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                    Choose a model
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
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

        <DialogFooter className="flex gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="h-10 flex-1 rounded-lg border-slate-200 text-sm font-medium"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-10 flex-1 rounded-lg bg-slate-950 text-sm font-medium text-white hover:bg-slate-800"
            onClick={handleCreate}
            disabled={isCreating || !title.trim() || !selectedModel}
          >
            {isCreating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {isCreating ? "Creating..." : "Create Canvas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
