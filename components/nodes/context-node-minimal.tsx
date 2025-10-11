"use client";
import { Handle, Position, type NodeProps } from "reactflow";
import { FileText } from "lucide-react";
import { memo } from "react";

interface ContextNodeData {
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
  parentNodeId?: string;
  forkedFromMessageId?: string;
  highlightTier?: 0 | 1 | 2;
}

function ContextNodeMinimalComponent({
  data,
  selected,
}: NodeProps<ContextNodeData>) {
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
              ? "bg-gradient-to-br from-violet-500 to-purple-500 shadow-2xl shadow-violet-500/30 border border-violet-400"
              : "bg-white border border-violet-200/50 shadow-sm hover:shadow-lg hover:border-violet-300/70"
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
                  ? "bg-white/20 backdrop-blur-sm"
                  : "bg-violet-50 border border-violet-200"
              }
            `}
          >
            <FileText
              size={18}
              className={`
                ${
                  selected || data.isSelected ? "text-white" : "text-violet-600"
                }
              `}
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
                    ? "text-white/90"
                    : "text-slate-500"
                }
              `}
            >
              <span>{data.model || "llama-3.3-70b"}</span>
              <span
                className={
                  selected || data.isSelected
                    ? "text-white/70"
                    : "text-slate-400"
                }
              >
                •
              </span>
              <span>Context Node</span>
            </div>
          </div>
        </div>

        {/* Context Indicator */}
        {(selected || data.isSelected) && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-violet-500 shadow-lg" />
        )}
      </div>

      {/* React Flow Handles - Minimal Design */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-2.5 h-2.5 !bg-violet-500 border-2 border-white shadow-md transition-transform hover:scale-125"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2.5 h-2.5 !bg-violet-500 border-2 border-white shadow-md transition-transform hover:scale-125"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-2.5 h-2.5 !bg-violet-500 border-2 border-white shadow-md transition-transform hover:scale-125"
      />
    </div>
  );
}

export const ContextNodeMinimal = memo(ContextNodeMinimalComponent);
