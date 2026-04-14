"use client";

import {
  Lock,
  Sparkles,
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
import { ModelProviderIcon } from "@/components/model-badge";
import { cn } from "@/lib/utils";

type ModelSelectionPanelProps = {
  selectedModel: string | null;
  onSelect: (modelId: string) => void;
  className?: string;
};

const renderModelCard = ({
  model,
  isSelected,
  onSelect,
}: {
  model: ModelConfig;
  isSelected: boolean;
  onSelect: (modelId: string) => void;
}) => {
  const isDisabled = model.availability === "disabled";

  return (
    <button
      key={model.id}
      type="button"
      onClick={() => {
        if (!isDisabled) onSelect(model.id);
      }}
      disabled={isDisabled}
      className={cn(
        "group relative flex min-h-[60px] min-w-[172px] flex-1 basis-[196px] items-center gap-3 overflow-hidden rounded-2xl border px-3 py-3 text-left transition-all",
        "hover:-translate-y-0.5 hover:shadow-sm",
        isSelected && !isDisabled
          ? "border-indigo-500 bg-indigo-50/90 shadow-[0_8px_24px_rgba(79,70,229,0.12)]"
          : "border-slate-200 bg-white",
        !isDisabled && "hover:border-slate-300",
        isDisabled && "cursor-not-allowed border-slate-200/90 bg-slate-50/95 opacity-75"
      )}
      data-slot="model-selection-option"
      aria-pressed={isSelected}
      aria-disabled={isDisabled}
      title={isDisabled ? model.disabledReason || "Currently unavailable" : undefined}
    >
      <div className={cn("flex min-w-0 flex-1 items-center gap-3", isDisabled && "opacity-80")}>
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
            {model.badge && (
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]",
                  isDisabled
                    ? "bg-slate-200/80 text-slate-600"
                    : "bg-emerald-50 text-emerald-700"
                )}
              >
                {model.badge}
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {model.provider}
          </div>
        </div>
      </div>

      {isDisabled && (
        <>
          <div className="pointer-events-none absolute inset-0 bg-white/25" />
          <span className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600 shadow-sm">
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
}: ModelSelectionPanelProps) {
  const defaultOpenSections = MODEL_SELECTION_SECTIONS.filter((section) => section.defaultOpen).map(
    (section) => section.id
  );
  const selectedModelConfig = selectedModel ? getModelById(selectedModel) : undefined;

  return (
    <div className={cn("space-y-4", className)} data-slot="model-selection-panel">
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-semibold text-slate-900">Recommended Right Now</div>
            <div className="text-xs text-slate-500">
              These are the currently live models we want people reaching for first.
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {RECOMMENDED_MODELS.map((model) =>
            renderModelCard({
              model,
              isSelected: selectedModel === model.id,
              onSelect,
            })
          )}
        </div>
      </div>

      {selectedModelConfig && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
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
        className="rounded-2xl border border-slate-200 bg-white"
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
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
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
