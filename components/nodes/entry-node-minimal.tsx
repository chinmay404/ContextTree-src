"use client";

import { useCallback, type CSSProperties } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Settings } from "lucide-react";

interface EntryNodeData {
  label: string;
  messageCount: number;
  isSelected: boolean;
  onClick?: () => void;
  onSettingsClick?: () => void;
  color?: string;
  textColor?: string;
  dotColor?: string;
  model?: string;
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

  const isActive = selected || data.isSelected;
  const accentColor = data.dotColor || "#2563eb";
  const textColor = data.textColor || "#0f172a";
  const backgroundColor = data.color || "#ffffff";

  const borderColor = isActive
    ? accentColor
    : data.highlightTier === 1
    ? "rgba(59,130,246,0.45)"
    : data.highlightTier === 2
    ? "rgba(148,163,184,0.45)"
    : "rgba(203,213,225,0.9)";

  const cardStyle: CSSProperties = {
    backgroundColor,
    color: textColor,
    borderColor,
  };

  return (
    <div className="group relative min-w-[180px]" onClick={handleClick}>
      {data.onSettingsClick && (
        <button
          type="button"
          className="absolute right-2 top-2 -translate-y-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
          onClick={(event) => {
            event.stopPropagation();
            data.onSettingsClick?.();
          }}
          aria-label="Customize node"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 shadow-sm transition hover:border-slate-400 hover:text-slate-700">
            <Settings size={14} />
          </span>
        </button>
      )}

      <div
        className={`rounded-md border bg-white px-4 py-3 text-sm shadow-sm transition-colors ${
          isActive ? "shadow-md" : "hover:shadow-md"
        }`}
        style={cardStyle}
      >
        <div className="font-medium leading-tight text-slate-900 line-clamp-2">
          {data.label}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
          <span className="truncate">
            {data.model || "openai/gpt-oss-120b"}
          </span>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span>Entry</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-500">
          {data.messageCount} {data.messageCount === 1 ? "message" : "messages"}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 !bg-slate-500 border border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-2 h-2 !bg-slate-500 border border-white"
      />
    </div>
  );
}
