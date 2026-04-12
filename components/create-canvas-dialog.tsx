"use client";

import { useEffect, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { ALL_MODELS } from "@/lib/models";
import { cn, generateCanvasTitle } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ModelProviderIcon } from "@/components/model-badge";

type CreateCanvasDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: { title: string; model: string }) => Promise<void> | void;
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

  useEffect(() => {
    if (!open) return;
    setTitle(initialTitle || generateCanvasTitle());
    setSelectedModel(null);
  }, [initialTitle, open]);

  const handleCreate = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !selectedModel || isCreating) return;

    await onCreate({
      title: trimmedTitle,
      model: selectedModel,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl border-slate-200 bg-white p-0 shadow-2xl"
        data-slot="create-canvas-dialog"
      >
        <div className="border-b border-slate-100 px-6 py-5">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="flex items-center gap-2 text-xl text-slate-900">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              Create Canvas
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Pick a starting model for this canvas instead of inheriting the old default.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-2">
            <label
              htmlFor="create-canvas-title"
              className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"
            >
              Canvas Title
            </label>
            <Input
              id="create-canvas-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My First Project"
              className="h-11 rounded-xl border-slate-200 bg-slate-50 text-sm font-medium text-slate-800"
              data-slot="create-canvas-title-input"
            />
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Starting Model
              </p>
              <p className="mt-1 text-sm text-slate-500">
                This becomes the default model for the base context and new branches in this canvas.
              </p>
            </div>
            {!selectedModel && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                Choose one to continue
              </span>
            )}
          </div>

          <div
            className="grid max-h-[46vh] gap-2 overflow-y-auto pr-1 md:grid-cols-2"
            data-slot="create-canvas-model-grid"
          >
            {ALL_MODELS.map((model) => {
              const isSelected = selectedModel === model.id;

              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => setSelectedModel(model.id)}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-left transition-all",
                    "hover:-translate-y-0.5 hover:shadow-md",
                    isSelected
                      ? "border-indigo-500 bg-indigo-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                  data-slot="create-canvas-model-option"
                >
                  <div className="flex items-start gap-3">
                    <ModelProviderIcon
                      modelId={model.id}
                      provider={model.provider}
                      size={20}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-900">
                          {model.name}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                        {model.provider}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-slate-500">
                        {model.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 px-6 py-4 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
            onClick={handleCreate}
            disabled={isCreating || !title.trim() || !selectedModel}
          >
            <Plus className="mr-2 h-4 w-4" />
            {isCreating ? "Creating..." : "Create Canvas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
