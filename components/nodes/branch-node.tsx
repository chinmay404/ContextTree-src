"use client";
import { Handle, Position, type NodeProps } from "reactflow";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch, MessageCircle, Settings } from "lucide-react";
import { useState, memo } from "react";

interface BranchNodeData {
  label: string;
  messageCount: number;
  isSelected: boolean;
  onClick?: () => void;
  onSettingsClick?: () => void;
  color?: string;
  textColor?: string;
  dotColor?: string;
  parentNodeId?: string;
  forkedFromMessageId?: string;
  model?: string;
  metaTags?: string[];
  lastMessageAt?: string;
  createdAt?: string;
  highlightTier?: 0 | 1 | 2;
}

function BranchNodeComponent({ data, selected }: NodeProps<BranchNodeData>) {
  const [hovered, setHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 200);
    if (data.onClick) {
      data.onClick();
    }
  };

  // Simplified theming (soft green fallback)
  const defaultColor = "#f0fdf4";
  const currentColor = data.color || defaultColor; // surface
  const textColor = data.textColor || "#14532d"; // dark green
  const dotColor = data.dotColor || "#16a34a"; // accent
  const model = data.model || "gpt-4";
  const tags = (data.metaTags || []).slice(0, 3);
  const last = data.lastMessageAt || data.createdAt;

  return (
    <div className="relative group">
      <div
        className={`absolute inset-0 rounded-2xl pointer-events-none transition-all duration-500 ${
          data.highlightTier === 0
            ? "ring-4 ring-offset-2 ring-offset-white ring-emerald-300/60 scale-105"
            : data.highlightTier === 1
            ? "ring-2 ring-emerald-300/40"
            : data.highlightTier === 2
            ? "ring-1 ring-emerald-200/30"
            : "ring-0"
        }`}
        style={{
          boxShadow:
            data.highlightTier === 0
              ? `0 0 0 4px ${dotColor}30, 0 0 24px -4px ${dotColor}70`
              : data.highlightTier === 1
              ? `0 0 0 2px ${dotColor}25`
              : undefined,
        }}
      />

      <Card
        className={`min-w-[210px] max-w-[250px] cursor-pointer relative overflow-hidden border-2 transition-all duration-300 rounded-3xl backdrop-blur-md ${
          selected || data.isSelected
            ? "shadow-2xl border-emerald-400/60 scale-[1.02] ring-4 ring-emerald-300/30"
            : "shadow-lg hover:shadow-xl border-slate-300/50 hover:scale-[1.01] hover:border-emerald-300/40"
        } ${isAnimating ? "scale-95" : ""}`}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: `linear-gradient(135deg, ${currentColor} 0%, ${currentColor}F5 50%, ${currentColor}E8 100%)`,
          ["--accent" as any]: dotColor,
          color: textColor,
          boxShadow: selected || data.isSelected 
            ? `0 20px 40px -12px ${dotColor}35, 0 8px 24px -8px ${dotColor}25`
            : "0 8px 32px -8px rgba(0,0,0,0.08)",
        }}
      >
          color: textColor,
        }}
      >
        {/* Enhanced fork badge */}
        {data.parentNodeId && (
          <div className="absolute -top-4 -left-4 z-20">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold shadow-xl border-2 backdrop-blur-md transform hover:scale-105 transition-transform"
              style={{
                backgroundColor: `${dotColor}`,
                color: "#fff",
                borderColor: "#fff",
                boxShadow: `0 8px 20px -6px ${dotColor}60`,
              }}
              title={`Forked from node ${data.parentNodeId}${
                data.forkedFromMessageId
                  ? " • msg " + data.forkedFromMessageId.substring(0, 8)
                  : ""
              }`}
            >
              <GitBranch size={12} className="opacity-95" />
              <span>FORK</span>
            </div>
          </div>
        )}
        {/* Enhanced background accent */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
          <div
            className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-15"
            style={{
              background: `radial-gradient(circle, ${dotColor}40, transparent 70%)`,
            }}
          />
          <div
            className="absolute -bottom-8 -left-8 w-20 h-20 rounded-full opacity-10"
            style={{
              background: `radial-gradient(circle, ${dotColor}30, transparent 60%)`,
            }}
          />
        </div>

        {/* Enhanced Input Handles */}
        <Handle
          type="target"
          position={Position.Top}
          className="!w-4 !h-4 !border-3 !border-white !shadow-lg !transition-all !duration-200 hover:!scale-125 hover:!shadow-xl"
          style={{ backgroundColor: dotColor, boxShadow: `0 0 12px ${dotColor}60` }}
        />
        <Handle
          type="target"
          position={Position.Left}
          className="!w-4 !h-4 !border-3 !border-white !shadow-lg !transition-all !duration-200 hover:!scale-125 hover:!shadow-xl"
          style={{ backgroundColor: dotColor, boxShadow: `0 0 12px ${dotColor}60` }}
        />

        {/* Header Section */}
        <div className="relative p-5">
          {/* Enhanced Settings Button */}
          {hovered && (
            <button
              className="absolute top-3 right-3 bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-2xl p-2 shadow-xl hover:shadow-2xl transition-all duration-200 hover:bg-white hover:scale-110 group"
              onClick={(e) => {
                e.stopPropagation();
                if (data.onSettingsClick) data.onSettingsClick();
              }}
              title="Node settings"
            >
              <Settings size={14} style={{ color: dotColor }} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          )}

          {/* Enhanced Header Line */}
          <div className="flex items-start gap-4 mb-4">
            <div
              className="relative w-10 h-10 rounded-xl flex items-center justify-center shadow-inner"
              style={{
                background: `linear-gradient(135deg, ${dotColor}10, ${dotColor}25)`,
                border: `1px solid ${dotColor}33`,
              }}
            >
              <GitBranch size={18} style={{ color: dotColor }} />
              <div
                className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-white"
                style={{ backgroundColor: dotColor }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3
                className="font-semibold text-sm leading-snug truncate tracking-tight"
                style={{ color: textColor }}
              >
                {data.label || "Branch"}
              </h3>
              <p
                className="text-[10px] uppercase tracking-wider font-medium mt-0.5 opacity-70"
                style={{ color: textColor }}
              >
                {data.parentNodeId ? "Forked" : model}
              </p>
            </div>
          </div>

          {/* Inline Stats */}
          <div className="flex items-center justify-between mb-2">
            <div
              className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md"
              style={{ backgroundColor: `${dotColor}15`, color: textColor }}
            >
              <MessageCircle size={12} style={{ color: dotColor }} />
              <span>{data.messageCount || 0}</span>
            </div>
            <div className="flex gap-1">
              {tags.map((t) => (
                <span
                  key={t}
                  className="px-1.5 py-0.5 rounded bg-emerald-50 text-[10px] font-medium text-emerald-600"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>
              {last
                ? new Date(last).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </span>
            <Badge
              className="rounded-md text-[9px] font-medium px-1.5 py-0.5 border-0"
              style={{ backgroundColor: `${dotColor}20`, color: dotColor }}
            >
              {selected || data.isSelected ? "Active" : "Idle"}
            </Badge>
          </div>
        </div>

        {/* Enhanced Output Handles */}
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-4 !h-4 !border-3 !border-white !shadow-lg !transition-all !duration-200 hover:!scale-125 hover:!shadow-xl"
          style={{ backgroundColor: dotColor, boxShadow: `0 0 12px ${dotColor}60` }}
        />
        <Handle
          type="source"
          position={Position.Right}
          className="!w-4 !h-4 !border-3 !border-white !shadow-lg !transition-all !duration-200 hover:!scale-125 hover:!shadow-xl"
          style={{ backgroundColor: dotColor, boxShadow: `0 0 12px ${dotColor}60` }}
        />
      </Card>
    </div>
  );
}

// Memoized export to prevent unnecessary re-renders when data references are stable
export const BranchNode = memo(BranchNodeComponent, (prev, next) => {
  // Fast equality check on frequently changing props
  return (
    prev.selected === next.selected &&
    prev.data.label === next.data.label &&
    prev.data.messageCount === next.data.messageCount &&
    prev.data.color === next.data.color &&
    prev.data.textColor === next.data.textColor &&
    prev.data.dotColor === next.data.dotColor &&
    prev.data.parentNodeId === next.data.parentNodeId &&
    prev.data.forkedFromMessageId === next.data.forkedFromMessageId &&
    prev.data.isSelected === next.data.isSelected
  );
});
