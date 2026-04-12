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
        "group relative overflow-hidden rounded-2xl border p-4 text-left transition-all",
        "hover:-translate-y-0.5 hover:shadow-md",
        isSelected && !isDisabled
          ? "border-indigo-500 bg-indigo-50/80 shadow-sm"
          : "border-slate-200 bg-white",
        !isDisabled && "hover:border-slate-300",
        isDisabled && "cursor-not-allowed border-slate-200/90 bg-slate-50/90"
      )}
      data-slot="model-selection-option"
      aria-pressed={isSelected}
      aria-disabled={isDisabled}
      title={isDisabled ? model.disabledReason || "Currently unavailable" : undefined}
    >
      <div className={cn("flex items-start gap-3", isDisabled && "blur-[0.8px] opacity-65")}>
        <ModelProviderIcon
          modelId={model.id}
          provider={model.provider}
          size={20}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-semibold text-slate-900">
              {model.name}
            </div>
            {model.badge && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]",
                  isDisabled
                    ? "bg-slate-200/80 text-slate-600"
                    : "bg-emerald-50 text-emerald-700"
                )}
              >
                {model.badge}
              </span>
            )}
          </div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {model.provider}
          </div>
          <div className="mt-2 text-xs leading-relaxed text-slate-500">
            {model.description}
          </div>
        </div>
      </div>

      {isDisabled && (
        <>
          <div className="absolute inset-0 bg-white/35" />
          <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600 shadow-sm">
            <Lock className="h-3 w-3" />
            Locked
          </div>
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

        <div className="grid gap-2 md:grid-cols-2">
          {RECOMMENDED_MODELS.map((model) =>
            renderModelCard({
              model,
              isSelected: selectedModel === model.id,
              onSelect,
            })
          )}
        </div>
      </div>

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
                <div className="grid gap-2 md:grid-cols-2">
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
