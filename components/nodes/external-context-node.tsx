"use client";

import { memo, useCallback, type MouseEvent } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { AlertTriangle, FileUp, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExternalContextNodeData {
  label: string;
  content?: string;
  previewText?: string;
  fileType?: string;
  size?: number;
  isSelected: boolean;
  onClick?: () => void;
  onRetry?: () => void;
  onDelete?: () => void;
  loading?: boolean;
  disabled?: boolean;
  error?: string;
  [key: string]: unknown;
}

type ExternalContextNodeType = Node<ExternalContextNodeData, "externalContext">;

function ExternalContextNodeComponent({
  data,
  selected,
}: NodeProps<ExternalContextNodeType>) {
  const stop = useCallback(
    (action?: () => void) => (e: MouseEvent) => {
      e.stopPropagation();
      action?.();
    },
    []
  );
  const hasError = Boolean(data.error);
  const isLoading = Boolean(data.loading) && !hasError;
  const isDisabled = Boolean(data.disabled) || isLoading;
  const isConnectable = !hasError && !isDisabled && Boolean(data.content);
  const active = selected || data.isSelected;

  const accent = hasError ? "#ef4444" : "#f59e0b";
  const previewText = hasError
    ? data.error || "Processing failed"
    : isLoading
    ? data.previewText || "Processing file..."
    : data.content || "No content";
  const handleClassName = cn(
    "!h-3 !w-3 !border-[3px] !transition-all !duration-200 !ease-out",
    active
      ? "!scale-100 !opacity-100"
      : "!scale-75 !opacity-0 group-hover:!scale-100 group-hover:!opacity-100"
  );

  return (
    <div
      className={cn(
        "group w-[300px] cursor-pointer rounded-[24px] border-2 bg-white px-5 py-4 text-sm shadow-[0_18px_44px_rgba(148,163,184,0.18)] transition-all duration-200",
        isDisabled && "cursor-progress opacity-90",
        active
          ? "ring-1 ring-slate-900/6"
          : "hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(148,163,184,0.22)]"
      )}
      style={{ borderColor: hasError ? "#fca5a5" : active ? accent : "#fcd34d" }}
      onClick={() => data.onClick?.()}
      data-slot="external-context-node"
      aria-disabled={isDisabled}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ backgroundColor: accent }}
        >
          {hasError ? (
            <AlertTriangle size={14} />
          ) : isLoading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <FileUp size={14} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500" title={data.label}>
            {data.label}
          </div>
          <div className="mt-2 text-[10px] text-slate-400">
            {data.fileType?.split("/").pop()?.toUpperCase() || "FILE"}
            {data.size ? ` \u00b7 ${Math.round(data.size / 1024)}KB` : ""}
          </div>
        </div>
        {hasError && data.onRetry && (
          <button
            className="nodrag rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-50"
            onClick={(e) => {
              e.stopPropagation();
              data.onRetry?.();
            }}
            data-slot="external-context-retry"
          >
            Retry
          </button>
        )}
      </div>

      <p className="mt-4 text-[14px] leading-7 text-slate-600 line-clamp-3">
        {previewText}
      </p>

      {data.onDelete && (
        <button
          className="absolute -top-2 -right-2 hidden h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-lg group-hover:flex hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500"
          onClick={stop(data.onDelete)}
          aria-label="Delete"
          data-slot="external-context-node-delete"
        >
          <Trash2 size={12} />
        </button>
      )}

      {isConnectable && (
        <>
          <Handle
            type="target"
            position={Position.Top}
            className={handleClassName}
            style={{ backgroundColor: accent, borderColor: "#ffffff" }}
          />
          <Handle
            type="target"
            position={Position.Left}
            className={handleClassName}
            style={{ backgroundColor: accent, borderColor: "#ffffff" }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            className={handleClassName}
            style={{ backgroundColor: accent, borderColor: "#ffffff" }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="right"
            className={handleClassName}
            style={{ backgroundColor: accent, borderColor: "#ffffff" }}
          />
        </>
      )}
    </div>
  );
}

export const ExternalContextNode = memo(ExternalContextNodeComponent);
