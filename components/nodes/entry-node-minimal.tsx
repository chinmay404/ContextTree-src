"use client";
import { Handle, Position, type NodeProps } from "reactflow";
import { Play } from "lucide-react";

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
  const handleClick = () => {
    if (data.onClick) {
      data.onClick();
    }
  };

  return (
    <div
      className={`group relative transition-all duration-200 cursor-pointer ${
        selected || data.isSelected ? "scale-105" : "hover:scale-102"
      }`}
      onClick={handleClick}
    >
      {/* Main Card - Ultra Minimal */}
      <div
        className={`
          px-5 py-3.5 rounded-xl backdrop-blur-sm
          transition-all duration-200
          ${
            selected || data.isSelected
              ? "bg-slate-900 shadow-2xl shadow-slate-900/20 border border-slate-800"
              : "bg-white border border-slate-200/60 shadow-sm hover:shadow-lg hover:border-slate-300/80"
          }
        `}
      >
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className={`
              w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
              transition-colors duration-200
              ${
                selected || data.isSelected
                  ? "bg-white"
                  : "bg-slate-50 border border-slate-200"
              }
            `}
          >
            <Play
              size={18}
              className={`
                ${
                  selected || data.isSelected
                    ? "text-slate-900"
                    : "text-slate-700"
                }
              `}
              fill={selected || data.isSelected ? "currentColor" : "none"}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div
              className={`
                text-sm font-semibold truncate
                ${selected || data.isSelected ? "text-white" : "text-slate-900"}
              `}
            >
              {data.label}
            </div>
            <div
              className={`
                text-xs font-medium flex items-center gap-1.5 mt-0.5
                ${
                  selected || data.isSelected
                    ? "text-slate-300"
                    : "text-slate-500"
                }
              `}
            >
              <span>{data.model || "openai/gpt-oss-120b"}</span>
              <span className="text-slate-400">•</span>
              <span>Entry Node</span>
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        {(selected || data.isSelected) && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
        )}
      </div>

      {/* React Flow Handles - Minimal Design */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2.5 h-2.5 !bg-slate-900 border-2 border-white shadow-md transition-transform hover:scale-125"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-2.5 h-2.5 !bg-slate-900 border-2 border-white shadow-md transition-transform hover:scale-125"
      />
    </div>
  );
}
