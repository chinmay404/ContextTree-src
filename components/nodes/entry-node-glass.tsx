"use client";
import { Handle, Position, type NodeProps } from "reactflow";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  MessageCircle,
  Settings,
  Activity,
  Sparkles,
  Zap,
  ArrowRight,
  Eye,
  Star,
} from "lucide-react";
import { useState, useEffect } from "react";

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
  size?: "small" | "medium" | "large";
  style?: "minimal" | "modern" | "glass" | "gradient";
  borderRadius?: number;
  opacity?: number;
}

export function EntryNodeGlass({ data, selected }: NodeProps<EntryNodeData>) {
  const [hovered, setHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [pulseActive, setPulseActive] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);
    setPulseActive(true);
    setTimeout(() => {
      setIsAnimating(false);
      setPulseActive(false);
    }, 600);
    if (data.onClick) {
      data.onClick();
    }
  };

  useEffect(() => {
    if (selected || data.isSelected) {
      setPulseActive(true);
      const timer = setTimeout(() => setPulseActive(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [selected, data.isSelected]);

  // Glassmorphic blue theme
  const nodeSize = data.size || "medium";

  // Size configurations
  const sizeConfig = {
    small: {
      width: "min-w-[180px] max-w-[200px]",
      padding: "p-4",
      iconSize: 16,
      titleSize: "text-sm",
    },
    medium: {
      width: "min-w-[220px] max-w-[260px]",
      padding: "p-5",
      iconSize: 18,
      titleSize: "text-base",
    },
    large: {
      width: "min-w-[260px] max-w-[300px]",
      padding: "p-6",
      iconSize: 20,
      titleSize: "text-lg",
    },
  };

  const config = sizeConfig[nodeSize];

  return (
    <div className="relative group">
      {/* Pulse Animation Ring */}
      {(pulseActive || hovered) && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 rounded-[20px] border-2 border-blue-400/30 animate-ping"
            style={{
              animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }}
          />
          <div
            className="absolute inset-0 rounded-[20px] border border-blue-300/50 animate-pulse"
            style={{
              animation: "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }}
          />
        </div>
      )}

      {/* Glassmorphic Card */}
      <Card
        className={`${config.width} ${config.padding} relative overflow-hidden cursor-pointer transition-all duration-500 group-hover:scale-105 border-0`}
        style={{
          background: `
            linear-gradient(135deg, 
              rgba(59, 130, 246, 0.1) 0%, 
              rgba(37, 99, 235, 0.05) 50%, 
              rgba(29, 78, 216, 0.1) 100%
            )
          `,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border:
            hovered || selected || data.isSelected
              ? "1px solid rgba(59, 130, 246, 0.3)"
              : "1px solid rgba(255, 255, 255, 0.2)",
          borderRadius: "20px",
          boxShadow:
            hovered || selected || data.isSelected
              ? `
                0 25px 50px -12px rgba(59, 130, 246, 0.25),
                0 0 0 1px rgba(59, 130, 246, 0.1),
                inset 0 1px 0 rgba(255, 255, 255, 0.1)
              `
              : `
                0 20px 25px -5px rgba(0, 0, 0, 0.1),
                0 10px 10px -5px rgba(0, 0, 0, 0.04),
                inset 0 1px 0 rgba(255, 255, 255, 0.1)
              `,
          transform: isAnimating ? "scale(0.98)" : undefined,
        }}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Subtle gradient overlay */}
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background: `
              linear-gradient(135deg, 
                rgba(255, 255, 255, 0.1) 0%, 
                rgba(255, 255, 255, 0.05) 50%, 
                rgba(255, 255, 255, 0) 100%
              )
            `,
            borderRadius: "20px",
          }}
        />

        {/* Glow effects on hover */}
        {(hovered || selected || data.isSelected) && (
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background: `
                radial-gradient(circle at 30% 30%, 
                  rgba(59, 130, 246, 0.3) 0%, 
                  rgba(59, 130, 246, 0.1) 50%, 
                  transparent 70%
                )
              `,
              borderRadius: "20px",
            }}
          />
        )}

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center justify-center rounded-xl transition-all duration-300 ${
                  hovered || selected || data.isSelected
                    ? "bg-blue-500/20 shadow-lg"
                    : "bg-blue-500/10"
                }`}
                style={{
                  width: `${config.iconSize + 16}px`,
                  height: `${config.iconSize + 16}px`,
                  backdropFilter: "blur(10px)",
                }}
              >
                <Play
                  size={config.iconSize}
                  className="text-blue-600 drop-shadow-sm"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  className={`font-semibold ${config.titleSize} text-slate-800 truncate leading-tight mb-1 transition-colors duration-300 drop-shadow-sm`}
                >
                  {data.label || "Entry Point"}
                </h3>
                <div className="flex items-center gap-2">
                  <Zap size={12} className="text-blue-500" />
                  <span className="text-xs font-medium text-slate-600/80">
                    Entry Node
                  </span>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <Badge
              variant="secondary"
              className="px-2 py-1 text-xs font-medium border-0"
              style={{
                background: "rgba(34, 197, 94, 0.15)",
                backdropFilter: "blur(10px)",
                color: "#059669",
                boxShadow: pulseActive
                  ? "0 0 12px rgba(34, 197, 94, 0.4)"
                  : "none",
              }}
            >
              Active
            </Badge>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageCircle size={12} className="text-blue-500" />
              <span className="text-sm font-medium text-slate-700">
                {data.messageCount || 0}
              </span>
            </div>

            {data.model && (
              <div className="flex items-center gap-1">
                <Sparkles size={10} className="text-blue-400" />
                <span className="text-xs text-slate-600 font-medium">
                  {data.model}
                </span>
              </div>
            )}
          </div>

          {/* Meta Tags */}
          {data.metaTags && data.metaTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {data.metaTags.slice(0, 2).map((tag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs px-2 py-0.5 border-0"
                  style={{
                    background: "rgba(59, 130, 246, 0.1)",
                    backdropFilter: "blur(10px)",
                    color: "#1d4ed8",
                  }}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Timestamp */}
          {data.lastMessageAt && (
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <Activity size={10} />
              {new Date(data.lastMessageAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
        </div>

        {/* Connection Handles */}
        <Handle
          type="target"
          position={Position.Left}
          className="!w-4 !h-4 !border-2 !border-white !shadow-lg !transition-all !duration-300 hover:!scale-125"
          style={{
            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            boxShadow: "0 0 12px rgba(59, 130, 246, 0.4)",
          }}
        />
        <Handle
          type="source"
          position={Position.Right}
          className="!w-4 !h-4 !border-2 !border-white !shadow-lg !transition-all !duration-300 hover:!scale-125"
          style={{
            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            boxShadow: "0 0 12px rgba(59, 130, 246, 0.4)",
          }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-4 !h-4 !border-2 !border-white !shadow-lg !transition-all !duration-300 hover:!scale-125"
          style={{
            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            boxShadow: "0 0 12px rgba(59, 130, 246, 0.4)",
          }}
        />
      </Card>
    </div>
  );
}
