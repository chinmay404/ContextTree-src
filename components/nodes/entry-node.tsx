"use client";
import { Handle, Position, type NodeProps } from "reactflow";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, MessageCircle, Settings, Activity } from "lucide-react";
import { useState } from "react";

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

export function EntryNode({ data, selected }: NodeProps<EntryNodeData>) {
  const [hovered, setHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 200);
    if (data.onClick) {
      data.onClick();
    }
  };

  const defaultColor = "#f0f9ff";
  const currentColor = data.color || defaultColor;
  const textColor = data.textColor || "#0f172a";
  const dotColor = data.dotColor || "#2563eb";
  const model = data.model || "gpt-4";
  const tags = (data.metaTags || []).slice(0, 3);
  const last = data.lastMessageAt || data.createdAt;

  return (
    <div className="relative group">
      {/* Glow / active ring */}
      <div
        className={`absolute inset-0 rounded-2xl pointer-events-none transition-all duration-500 ${
          selected || data.isSelected
            ? "ring-4 ring-offset-2 ring-offset-white ring-blue-300/60 scale-105"
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
        className={`min-w-[220px] max-w-[260px] cursor-pointer relative overflow-hidden border-2 transition-all duration-300 rounded-3xl backdrop-blur-md ${
          selected || data.isSelected
            ? "shadow-2xl border-blue-400/60 scale-[1.02]"
            : "shadow-lg hover:shadow-xl border-slate-300/40 hover:scale-[1.01]"
        } ${isAnimating ? "scale-95" : ""}`}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: `linear-gradient(135deg, ${currentColor} 0%, ${currentColor}F0 50%, ${currentColor}E0 100%)`,
          color: textColor,
          boxShadow: selected || data.isSelected 
            ? `0 20px 40px -12px ${dotColor}40, 0 8px 24px -8px ${dotColor}30`
            : "0 8px 32px -8px rgba(0,0,0,0.1)",
        }}
      >
        {/* Subtle accent overlay */}
        <div className="absolute inset-0 opacity-30 mix-blend-overlay bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.8),transparent_70%)]" />
        
        {/* Primary node indicator */}
        <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg border-2 border-white/70" 
             title="Primary Entry Node" />

        {/* Header Section */}
        <div className="relative p-5">
          {/* Settings Button */}
          {hovered && (
            <button
              className="absolute top-4 right-4 bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-2xl p-2.5 shadow-xl hover:shadow-2xl transition-all duration-200 hover:bg-white hover:scale-110 group"
              onClick={(e) => {
                e.stopPropagation();
                if (data.onSettingsClick) data.onSettingsClick();
              }}
            >
              <Settings size={16} style={{ color: dotColor }} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          )}

          {/* Header with improved icon */}
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-white/90 to-white/70 border-2 border-white/50 shadow-lg backdrop-blur-sm">
              <Play size={20} style={{ color: dotColor }} className="ml-0.5" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[10px] uppercase tracking-wider font-medium mt-0.5 text-slate-500">{model}</p>
              {(selected || data.isSelected) && (
                <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md shadow-sm w-fit">
                  Active
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
              <MessageCircle size={12} className="text-slate-400" />
              <span>{data.messageCount || 0}</span>
            </div>
            <div className="flex gap-1">
              {tags.map((t) => (
                <span
                  key={t}
                  className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-600"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          {/* Footer meta */}
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
              <Activity size={10} /> Chat
            </div>
          </div>
        </div>

        {/* Enhanced Connection Handles */}
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
