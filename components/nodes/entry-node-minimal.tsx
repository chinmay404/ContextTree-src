"use client";

import { memo, useCallback, type MouseEvent } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { MessageSquare, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EntryNodeData {
  label: string;
  messageCount: number;
  isSelected: boolean;
  preview?: string;
  model?: string;
  timestamp?: string;
  sharedLabel?: string;
  onClick?: () => void;
  onFocus?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  color?: string;
  textColor?: string;
  dotColor?: string;
  highlightTier?: 0 | 1 | 2;
  primary?: boolean;
  [key: string]: unknown;
}

type EntryNodeType = Node<EntryNodeData, "entry">;

function EntryNodeComponent({ data, selected }: NodeProps<EntryNodeType>) {
  const handleClick = useCallback(() => data.onClick?.(), [data]);
  const stop = useCallback(
    (action?: () => void) => (e: MouseEvent) => {
      e.stopPropagation();
      action?.();
    },
    []
  );

  const active = selected || data.isSelected;
  const accent = data.dotColor || "#ffffff";
  const preview = data.preview || data.sharedLabel || "Base context";
  const handleClassName = cn(
    "!h-3 !w-3 !border-[3px] !transition-all !duration-200 !ease-out",
    active
      ? "!scale-100 !opacity-100"
      : "!scale-75 !opacity-0 group-hover:!scale-100 group-hover:!opacity-100"
  );

  return (
    <div
      className="group relative min-w-[280px] max-w-[340px] cursor-pointer"
      onClick={handleClick}
      data-slot="entry-node"
    >
      <div
        className={cn(
          "rounded-[24px] border px-5 py-4 text-sm text-white shadow-[0_18px_44px_rgba(15,23,42,0.16)] transition-all duration-200",
          active
            ? "border-slate-950 bg-slate-950 ring-1 ring-slate-900/10"
            : "border-slate-900 bg-slate-900 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(15,23,42,0.18)]"
        )}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white">
            <MessageSquare size={15} />
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
              Base Context
            </div>
            <div className="truncate text-sm font-semibold text-white">
              {data.label || "Base Context"}
            </div>
          </div>
        </div>

        <p className="mt-3 text-[13px] leading-6 text-white/72 line-clamp-2">
          {preview}
        </p>
      </div>

      {!data.primary && (
        <button
          className="absolute -top-2 -right-2 hidden h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-lg group-hover:flex hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500"
          onClick={stop(data.onDelete)}
          aria-label="Delete"
          data-slot="entry-node-delete"
        >
          <Trash2 size={12} />
        </button>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className={handleClassName}
        style={{ backgroundColor: "#ffffff", borderColor: "#0f172a" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={handleClassName}
        style={{ backgroundColor: "#ffffff", borderColor: "#0f172a" }}
      />
      <Handle
        type="target"
        position={Position.Left}
        className={handleClassName}
        style={{ backgroundColor: accent, borderColor: "#0f172a" }}
      />
      <Handle
        type="target"
        position={Position.Top}
        className={handleClassName}
        style={{ backgroundColor: accent, borderColor: "#0f172a" }}
      />
    </div>
  );
}

export const EntryNodeMinimal = memo(EntryNodeComponent);
