"use client";
import { Handle, Position, type NodeProps } from "reactflow";
import { FileText, Settings } from "lucide-react";
import { memo, useState } from "react";

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
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    if (data.onClick) {
      data.onClick();
    }
  };

  // Use custom colors or defaults
  const bgColor = data.color || "#ffffff";
  const textColorPrimary = data.textColor || "#1e293b";
  const accentColor = data.dotColor || "#8b5cf6";

  return (
    <div
      className={`group relative transition-all duration-200 cursor-pointer ${
        selected || data.isSelected ? "scale-105" : "hover:scale-102"
      }`}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Settings Button */}
      {hovered && data.onSettingsClick && (
        <button
          className="absolute -top-2 -right-2 z-10 bg-white border-2 border-slate-300 rounded-lg p-1.5 shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-slate-50 hover:scale-110 hover:border-slate-400"
          onClick={(e) => {
            e.stopPropagation();
            if (data.onSettingsClick) data.onSettingsClick();
          }}
        >
          <Settings size={14} className="text-slate-700" />
        </button>
      )}

      {/* Main Card - Ultra Minimal */}
      <div
        className={`
          px-5 py-3.5 rounded-xl backdrop-blur-sm
          transition-all duration-200 border-2
          ${
            selected || data.isSelected
              ? "shadow-2xl scale-105"
              : "shadow-sm hover:shadow-lg"
          }
        `}
        style={{
          backgroundColor: bgColor,
          borderColor:
            selected || data.isSelected ? accentColor : `${accentColor}40`,
        }}
      >
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200"
            style={{
              backgroundColor: `${accentColor}20`,
              border: `1px solid ${accentColor}40`,
            }}
          >
            <FileText size={18} style={{ color: accentColor }} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div
              className="text-sm font-semibold truncate"
              style={{ color: textColorPrimary }}
            >
              {data.label}
            </div>
            <div
              className="text-xs font-medium flex items-center gap-1.5 mt-0.5"
              style={{ color: `${textColorPrimary}99` }}
            >
              <span>{data.model || "llama-3.3-70b"}</span>
              <span style={{ color: `${textColorPrimary}66` }}>•</span>
              <span>Context Node</span>
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        {(selected || data.isSelected) && (
          <div
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white shadow-lg animate-pulse"
            style={{ backgroundColor: accentColor }}
          />
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
