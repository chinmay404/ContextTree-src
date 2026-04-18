"use client";

import { memo, useCallback, type MouseEvent } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Trash2 } from "lucide-react";
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
  const title = (data.label || "Base Context").trim();
  const preview = (data.preview || "").trim();

  const handleClassName = cn(
    "!h-2 !w-2 !border-2 !border-slate-800 !bg-white !transition-all !duration-200 !ease-out",
    active
      ? "!scale-100 !opacity-100"
      : "!scale-75 !opacity-0 group-hover:!scale-100 group-hover:!opacity-100"
  );

  return (
    <div
      className="group relative w-[300px] cursor-pointer"
      onClick={handleClick}
      data-slot="entry-node"
    >
      {/* Ambient glow on selection */}
      {active && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-2 rounded-[22px] opacity-60 blur-xl bg-[radial-gradient(closest-side,rgba(99,102,241,0.35),transparent_70%)]"
        />
      )}

      <div
        className={cn(
          "relative overflow-hidden rounded-[18px] transition-all duration-300 ease-out",
          "bg-gradient-to-b from-slate-900 to-slate-950 text-white",
          active
            ? "shadow-[0_14px_32px_-14px_rgba(15,23,42,0.55),0_2px_4px_rgba(15,23,42,0.1)] ring-[1.5px] ring-indigo-400/70"
            : "shadow-[0_1px_2px_rgba(15,23,42,0.08),0_8px_20px_-10px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/60 hover:-translate-y-[1px] hover:shadow-[0_2px_4px_rgba(15,23,42,0.08),0_14px_28px_-10px_rgba(15,23,42,0.45)]"
        )}
      >
        {/* Premium top highlight — Apple-style "glass light" */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
        />
        {/* Soft accent orb */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-14 -right-10 h-32 w-32 rounded-full bg-indigo-500/15 blur-2xl"
        />

        <div className="relative px-4 py-3.5">
          {/* Type label — tasteful, not shouting */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/50">
              Base Context
            </span>
          </div>

          {/* Title */}
          <h3 className="text-[14.5px] font-semibold leading-[1.3] text-white truncate tracking-[-0.006em]">
            {title}
          </h3>

          {/* Preview */}
          {preview && (
            <p className="mt-1.5 text-[12.5px] leading-[1.5] text-white/55 line-clamp-2">
              {preview}
            </p>
          )}
        </div>
      </div>

      {!data.primary && (
        <button
          className="absolute -top-2 -right-2 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-md group-hover:flex hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 transition-colors"
          onClick={stop(data.onDelete)}
          aria-label="Delete"
          data-slot="entry-node-delete"
        >
          <Trash2 size={11} />
        </button>
      )}

      <Handle type="source" position={Position.Bottom} className={handleClassName} />
      <Handle type="source" position={Position.Right} className={handleClassName} />
      <Handle type="target" position={Position.Left} className={handleClassName} />
      <Handle type="target" position={Position.Top} className={handleClassName} />
    </div>
  );
}

export const EntryNodeMinimal = memo(EntryNodeComponent);
