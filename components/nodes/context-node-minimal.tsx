"use client";

import { memo, useCallback, useMemo, type MouseEvent } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Trash2 } from "lucide-react";
import { ModelBadge } from "@/components/model-badge";
import { cn } from "@/lib/utils";

export interface ContextNodeData {
  label: string;
  messageCount: number;
  isSelected: boolean;
  preview?: string;
  model?: string;
  timestamp?: string;
  lengthTag?: "short" | "medium" | "long";
  onClick?: () => void;
  onFocus?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  color?: string;
  textColor?: string;
  dotColor?: string;
  highlightTier?: 0 | 1 | 2;
  [key: string]: unknown;
}

type ContextNodeType = Node<ContextNodeData, "context">;

function ContextNodeComponent({ data, selected }: NodeProps<ContextNodeType>) {
  const handleClick = useCallback(() => data.onClick?.(), [data]);
  const stop = useCallback(
    (action?: () => void) => (e: MouseEvent) => {
      e.stopPropagation();
      action?.();
    },
    []
  );

  const active = selected || data.isSelected;
  const accent = data.dotColor || "#64748b";

  const preview = useMemo(() => {
    const text = data.preview || "Draft reply";
    const lines = text.split(/\n+/);
    return { primary: lines[0]?.trim() || text, secondary: lines.slice(1).join(" ").trim() };
  }, [data.preview]);
  const handleClassName = cn(
    "!h-3 !w-3 !border-[3px] !transition-all !duration-200 !ease-out",
    active
      ? "!scale-100 !opacity-100"
      : "!scale-75 !opacity-0 group-hover:!scale-100 group-hover:!opacity-100"
  );

  return (
    <div
      className="group relative w-[300px] cursor-pointer"
      onClick={handleClick}
      data-slot="context-node"
    >
      <div
        className={cn(
          "rounded-[24px] border-2 bg-white px-5 py-4 text-sm shadow-[0_18px_44px_rgba(148,163,184,0.18)] transition-all duration-200",
          active
            ? "ring-1 ring-slate-900/6"
            : "hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(148,163,184,0.22)]"
        )}
        style={{ borderColor: active ? accent : "#e2e8f0" }}
      >
        <div className="flex items-start gap-3">
          <span
            className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: accent }}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {data.label || "Context"}
            </div>
            <p className="mt-3 text-[15px] leading-7 text-slate-700 line-clamp-2">
              {preview.primary}
            </p>
            {preview.secondary && (
              <p className="mt-1 text-xs text-slate-400 line-clamp-1">
                {preview.secondary}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400">
          <ModelBadge
            modelId={typeof data.model === "string" ? data.model : undefined}
            size="sm"
            className="max-w-[180px]"
          />
          {data.timestamp && (
            <>
              <span className="text-slate-300">·</span>
              <span>
                {new Date(data.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </>
          )}
        </div>
      </div>

      <button
        className="absolute -top-2 -right-2 hidden h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-lg group-hover:flex hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500"
        onClick={stop(data.onDelete)}
        aria-label="Delete"
        data-slot="context-node-delete"
      >
        <Trash2 size={12} />
      </button>

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
        className={handleClassName}
        style={{ backgroundColor: accent, borderColor: "#ffffff" }}
      />
    </div>
  );
}

export const ContextNodeMinimal = memo(ContextNodeComponent);
