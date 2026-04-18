"use client";

import { memo, useCallback, type MouseEvent } from "react";
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

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

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

  const handleClassName = cn(
    "!h-2 !w-2 !border-2 !border-white !transition-all !duration-200 !ease-out",
    active
      ? "!scale-100 !opacity-100"
      : "!scale-75 !opacity-0 group-hover:!scale-100 group-hover:!opacity-100"
  );

  const title = (data.label || "Context").trim();
  const preview = (data.preview || "").trim();

  return (
    <div
      className="group relative w-[300px] cursor-pointer"
      onClick={handleClick}
      data-slot="context-node"
    >
      {active && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-2 rounded-[22px] opacity-60 blur-xl"
          style={{
            background: `radial-gradient(closest-side, ${accent}22, transparent 70%)`,
          }}
        />
      )}

      <div
        className={cn(
          "relative overflow-hidden rounded-[18px] bg-white transition-all duration-300 ease-out",
          active
            ? "shadow-[0_12px_32px_-12px_rgba(15,23,42,0.18),0_2px_4px_-1px_rgba(15,23,42,0.04)]"
            : "border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_16px_-8px_rgba(15,23,42,0.08)] hover:-translate-y-[1px] hover:shadow-[0_2px_4px_rgba(15,23,42,0.04),0_12px_24px_-10px_rgba(15,23,42,0.12)] hover:border-slate-300/80"
        )}
        style={active ? { borderColor: accent, borderWidth: 1.5, borderStyle: "solid" } : undefined}
      >
        <div className="px-4 py-3.5">
          <h3 className="text-[14px] font-semibold leading-[1.3] text-slate-900 line-clamp-2 tracking-[-0.006em]">
            {title}
          </h3>

          {preview && (
            <p className="mt-2 text-[12.5px] leading-[1.5] text-slate-500 line-clamp-2">
              {preview}
            </p>
          )}

          {(data.model || data.timestamp) && (
            <>
              <div aria-hidden className="mt-3 mb-2.5 h-px bg-slate-100" />
              <div className="flex items-center gap-2 text-[10.5px] text-slate-400">
                {data.model && (
                  <ModelBadge
                    modelId={typeof data.model === "string" ? data.model : undefined}
                    size="sm"
                    className="max-w-[170px] !shadow-none"
                  />
                )}
                {data.timestamp && (
                  <span className="ml-auto tabular-nums font-medium">
                    {timeAgo(data.timestamp)}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <button
        className="absolute -top-2 -right-2 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-md group-hover:flex hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 transition-colors"
        onClick={stop(data.onDelete)}
        aria-label="Delete"
        data-slot="context-node-delete"
      >
        <Trash2 size={11} />
      </button>

      <Handle type="target" position={Position.Top} className={handleClassName}
        style={{ backgroundColor: accent }} />
      <Handle type="target" position={Position.Left} className={handleClassName}
        style={{ backgroundColor: accent }} />
      <Handle type="source" position={Position.Bottom} className={handleClassName}
        style={{ backgroundColor: accent }} />
      <Handle type="source" position={Position.Right} className={handleClassName}
        style={{ backgroundColor: accent }} />
    </div>
  );
}

export const ContextNodeMinimal = memo(ContextNodeComponent);
