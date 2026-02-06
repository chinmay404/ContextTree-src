"use client";

import {
  memo,
  useCallback,
  useMemo,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { LocateFixed, Pencil, Trash2 } from "lucide-react";

interface ContextNodeData {
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
  metaTags?: string[];
  lastMessageAt?: string;
  createdAt?: string;
  parentNodeId?: string;
  forkedFromMessageId?: string;
  highlightTier?: 0 | 1 | 2;
}

function ContextNodeMinimalComponent({
  data,
  selected,
}: NodeProps<ContextNodeData>) {
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
  const accentColor = data.dotColor || "#475569";
  const textColor = data.textColor || "#0f172a";
  const backgroundColor = data.color || "#ffffff";
  const faded = data.highlightTier === undefined && !isActive;

  const borderColor = isActive
    ? accentColor
    : data.highlightTier === 1
    ? "rgba(71,85,105,0.5)"
    : data.highlightTier === 2
    ? "rgba(148,163,184,0.5)"
    : "rgba(148,163,184,0.7)";

  const cardStyle: CSSProperties = {
    backgroundColor,
    color: textColor,
    borderColor,
  };

  const previewPrimary = useMemo(() => {
    const previewText = data.preview || "Draft reply";
    const newlineSplit = previewText.split(/\n+/);
    const first = newlineSplit[0]?.trim() || previewText;
    return first;
  }, [data.preview]);

  const previewSecondary = useMemo(() => {
    const previewText = data.preview || "";
    const trimmed = previewText.trim();
    if (!trimmed) return "";
    const newlineSplit = trimmed.split(/\n+/);
    if (newlineSplit.length > 1) return newlineSplit.slice(1).join(" ");
    if (trimmed.length > previewPrimary.length) {
      return trimmed.slice(previewPrimary.length).trim();
    }
    return "";
  }, [data.preview, previewPrimary]);

  const timeLabel = data.timestamp
    ? new Date(data.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div
      className={`group relative min-w-[200px] max-w-[400px] cursor-pointer ${
        faded ? "opacity-80" : "opacity-100"
      }`}
      onClick={handleClick}
    >
      <div
        className={`rounded-xl border px-4 py-3 text-sm shadow-sm transition-all duration-200 overflow-hidden ${
          isActive ? "shadow-md ring-2 ring-slate-500/15" : "hover:shadow-md"
        }`}
        style={cardStyle}
      >
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
            Context
          </span>
        </div>

        <div className="mt-2 space-y-1">
          <div className="text-sm font-semibold leading-snug text-slate-900 line-clamp-1 break-words">
            {previewPrimary}
          </div>
          {previewSecondary && (
            <div className="text-xs font-normal text-slate-600 line-clamp-1 break-words">
              {previewSecondary}
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-2 text-[11px] text-slate-600">
          <span className="rounded-full bg-white/80 px-2 py-0.5 font-semibold text-slate-800 shadow-inner">
            {data.model || "Model"}
          </span>
          <span className="h-1 w-1 rounded-full bg-slate-400" />
          <span className="uppercase tracking-wide text-slate-600">
            {data.lengthTag || "medium"}
          </span>
          <span className="h-1 w-1 rounded-full bg-slate-400" />
          <span className="tabular-nums">{timeLabel}</span>
        </div>
      </div>

      <div
        className={`absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/95 px-2 py-1 text-slate-600 shadow-lg transition-opacity duration-150 ${
          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <button
          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white hover:border-slate-300 hover:text-slate-900"
          aria-label="Focus node"
          onClick={handleAction(data.onFocus)}
        >
          <LocateFixed size={14} />
        </button>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-600 hover:border-rose-300 hover:text-rose-700"
          aria-label="Delete node"
          onClick={handleAction(data.onDelete)}
        >
          <Trash2 size={14} />
        </button>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white hover:border-slate-300 hover:text-slate-900"
          aria-label="Edit node"
          onClick={handleAction(data.onEdit)}
        >
          <Pencil size={14} />
        </button>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="h-2 w-2 !bg-slate-600 border border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="h-2 w-2 !bg-slate-600 border border-white"
      />
    </div>
  );
}

export const ContextNodeMinimal = memo(ContextNodeMinimalComponent);
