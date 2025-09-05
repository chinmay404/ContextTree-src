"use client";
import { Handle, Position, type NodeProps } from "reactflow";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, MessageCircle, Settings, Database } from "lucide-react";
import { useState } from "react";

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

export function ContextNode({ data, selected }: NodeProps<ContextNodeData>) {
  const [hovered, setHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 200);
    if (data.onClick) {
      data.onClick();
    }
  };

  const defaultColor = "#f3e8ff";
  const currentColor = data.color || defaultColor;
  const textColor = data.textColor || "#6b21a8";
  const dotColor = data.dotColor || "#8b5cf6";
  const model = data.model || "gpt-4";
  const tags = (data.metaTags || []).slice(0, 3);
  const last = data.lastMessageAt || data.createdAt;

  return (
    <div className="relative group">
      <div
        className={`absolute inset-0 rounded-2xl pointer-events-none transition-all duration-500 ${
          selected || data.isSelected
            ? "ring-4 ring-offset-2 ring-offset-white ring-purple-300/60 scale-105"
            : "ring-0 scale-100"
        }`}
        style={{
          boxShadow:
            selected || data.isSelected
              ? `0 0 0 4px ${dotColor}30, 0 0 24px -4px ${dotColor}70`
              : undefined,
        }}
      />

      <Card
        className={`min-w-[210px] max-w-[250px] cursor-pointer relative overflow-hidden border-2 transition-all duration-300 rounded-3xl backdrop-blur-md ${
          selected || data.isSelected
            ? "shadow-2xl border-purple-400/60 scale-[1.02] ring-4 ring-purple-300/30"
            : "shadow-lg hover:shadow-xl border-slate-300/50 hover:scale-[1.01] hover:border-purple-300/40"
        } ${isAnimating ? "scale-95" : ""}`}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: `linear-gradient(135deg, ${currentColor} 0%, ${currentColor}F5 50%, ${currentColor}E8 100%)`,
          color: textColor,
          boxShadow:
            selected || data.isSelected
              ? `0 20px 40px -12px ${dotColor}35, 0 8px 24px -8px ${dotColor}25`
              : "0 8px 32px -8px rgba(0,0,0,0.08)",
        }}
      >
        {/* Enhanced background accent */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
          <div
            className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-12"
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
          style={{
            backgroundColor: dotColor,
            boxShadow: `0 0 12px ${dotColor}60`,
          }}
        />
        <Handle
          type="target"
          position={Position.Left}
          className="!w-4 !h-4 !border-3 !border-white !shadow-lg !transition-all !duration-200 hover:!scale-125 hover:!shadow-xl"
          style={{
            backgroundColor: dotColor,
            boxShadow: `0 0 12px ${dotColor}60`,
          }}
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
            >
              <Settings size={16} style={{ color: dotColor }} />
            </button>
          )}

          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/70 border border-slate-200 shadow-inner">
              <FileText size={18} style={{ color: dotColor }} />
              <div
                className={`absolute inset-0 rounded-2xl pointer-events-none transition-all duration-500 ${
                  data.highlightTier === 0
                    ? "ring-4 ring-offset-2 ring-offset-white ring-purple-300/60 scale-105"
                    : data.highlightTier === 1
                    ? "ring-2 ring-purple-300/40"
                    : data.highlightTier === 2
                    ? "ring-1 ring-purple-200/30"
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
              <p className="text-[10px] uppercase tracking-wider font-medium mt-0.5 text-slate-500">
                {model}
              </p>
            </div>
            {data.parentNodeId && (
              <div className="text-[10px] font-medium px-2 py-1 rounded-md bg-purple-100 text-purple-700">
                Fork
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
              <MessageCircle size={12} className="text-slate-400" />
              <span>{data.messageCount || 0}</span>
            </div>
            <div className="flex gap-1">
              {tags.map((t) => (
                <span
                  key={t}
                  className="px-1.5 py-0.5 rounded bg-purple-50 text-[10px] font-medium text-purple-600"
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
            <div className="flex items-center gap-1 text-slate-500">
              <Database size={10} /> Data
            </div>
          </div>
        </div>

        {/* Enhanced Output Handles */}
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-4 !h-4 !border-3 !border-white !shadow-lg !transition-all !duration-200 hover:!scale-125 hover:!shadow-xl"
          style={{
            backgroundColor: dotColor,
            boxShadow: `0 0 12px ${dotColor}60`,
          }}
        />
        <Handle
          type="source"
          position={Position.Right}
          className="!w-4 !h-4 !border-3 !border-white !shadow-lg !transition-all !duration-200 hover:!scale-125 hover:!shadow-xl"
          style={{
            backgroundColor: dotColor,
            boxShadow: `0 0 12px ${dotColor}60`,
          }}
        />
      </Card>
    </div>
  );
}
