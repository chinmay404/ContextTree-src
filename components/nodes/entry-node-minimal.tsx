"use client";

import { useCallback, type CSSProperties, type MouseEvent } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import {
  ArrowDownRight,
  Copy,
  GitBranch,
  Lock,
  Minimize2,
  Star,
} from "lucide-react";

interface EntryNodeData {
  label: string;
  messageCount: number;
  isSelected: boolean;
  preview?: string;
  model?: string;
  timestamp?: string;
  sharedLabel?: string;
  onClick?: () => void;
  onContinue?: () => void;
  onAlternative?: () => void;
  onCollapse?: () => void;
  onDuplicate?: () => void;
  color?: string;
  textColor?: string;
  dotColor?: string;
  metaTags?: string[];
  lastMessageAt?: string;
  createdAt?: string;
  primary?: boolean;
  highlightTier?: 0 | 1 | 2;
}

export function EntryNodeMinimal({ data, selected }: NodeProps<EntryNodeData>) {
  const handleClick = useCallback(() => {
    data.onClick?.();
  }, [data]);

  const handleAction = useCallback(
    (action?: () => void) => (event: MouseEvent) => {
      event.stopPropagation();
      (action || data.onClick)?.();
    },
    [data]
  );

  const isActive = selected || data.isSelected;
  const accentColor = data.dotColor || "#0f172a";
  const textColor = data.textColor || "#0f172a";
  const backgroundColor = data.color || "#e8ecf3";
  const faded = data.highlightTier === undefined && !isActive;

  const borderColor = isActive
    ? accentColor
    : data.highlightTier === 1
    ? "rgba(59,130,246,0.5)"
    : data.highlightTier === 2
    ? "rgba(148,163,184,0.5)"
    : "rgba(148,163,184,0.7)";

  const cardStyle: CSSProperties = {
    backgroundColor,
    color: textColor,
    borderColor,
  };

  const timeLabel = data.timestamp
    ? new Date(data.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div
      className={`group relative min-w-[320px] max-w-[440px] cursor-pointer ${
        faded ? "opacity-80" : "opacity-100"
      }`}
      onClick={handleClick}
    >
      <div
        className={`rounded-2xl border-[3px] px-5 py-4 text-sm shadow-sm transition-all duration-200 overflow-hidden ${
          isActive
            ? "shadow-md ring-2 ring-slate-500/20"
            : "hover:shadow-md"
        }`}
        style={cardStyle}
      >
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm">
              <Star size={14} />
            </span>
            <span className="uppercase tracking-wide text-slate-700">
              {data.label || "Base Context"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold">
              Anchor
            </span>
            <Lock size={14} />
          </div>
        </div>

        <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
          {data.sharedLabel || "Context snapshot at T0"}
        </div>

        <div className="mt-3 text-sm font-medium leading-relaxed text-slate-900 line-clamp-3 break-words">
          {data.preview || "Context Snapshot"}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 text-[11px] text-slate-600">
          <span className="rounded-full bg-white/80 px-2 py-1 font-semibold text-slate-800 shadow-inner">
            {data.model || "Model"}
          </span>
          <span className="h-1 w-1 rounded-full bg-slate-400" />
          <span className="tabular-nums">{timeLabel}</span>
          <span className="h-1 w-1 rounded-full bg-slate-400" />
          <span className="font-semibold text-slate-700">
            {data.sharedLabel || "Shared by all branches"}
          </span>
        </div>
      </div>

      <div
        className={`absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/95 px-2 py-1 text-slate-600 shadow transition-opacity duration-150 ${
          data.primary ? "opacity-0 group-hover:opacity-100" : isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <button
          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white hover:border-slate-300 hover:text-slate-900"
          aria-label="Continue"
          onClick={handleAction(data.onContinue)}
        >
          <ArrowDownRight size={14} />
        </button>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white hover:border-slate-300 hover:text-slate-900"
          aria-label="Alternative"
          onClick={handleAction(data.onAlternative)}
        >
          <GitBranch size={14} />
        </button>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white hover:border-slate-300 hover:text-slate-900"
          aria-label="Collapse"
          onClick={handleAction(data.onCollapse)}
        >
          <Minimize2 size={14} />
        </button>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white hover:border-slate-300 hover:text-slate-900"
          aria-label="Duplicate"
          onClick={handleAction(data.onDuplicate)}
        >
          <Copy size={14} />
        </button>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="h-2 w-2 !bg-slate-700 border border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="h-2 w-2 !bg-slate-700 border border-white"
      />
      <Handle
        type="target"
        position={Position.Top}
        className="h-2 w-2 !bg-slate-700 border border-white"
      />
    </div>
  );
}
