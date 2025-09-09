"use client";
import { Handle, Position, type NodeProps } from "reactflow";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GitBranch,
  MessageCircle,
  Settings,
  Zap,
  Route,
  Share2,
  TrendingUp,
  Clock,
  Users,
  ArrowRight,
  Palette,
} from "lucide-react";
import { useState, useEffect } from "react";

interface BranchNodeData {
  label: string;
  messageCount: number;
  isSelected: boolean;
  onClick?: () => void;
  onSettingsClick?: () => void;
  color?: string;
  textColor?: string;
  dotColor?: string;
  branchCount?: number;
  conditions?: string[];
  model?: string;
  metaTags?: string[];
  lastMessageAt?: string;
  createdAt?: string;
  parentNodeId?: string;
  forkedFromMessageId?: string;
  highlightTier?: 0 | 1 | 2;
  size?: "small" | "medium" | "large";
  style?: "minimal" | "modern" | "glass" | "gradient";
  borderRadius?: number;
  opacity?: number;
}

export function BranchNodeGlass({ data, selected }: NodeProps<BranchNodeData>) {
  const [hovered, setHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [branchAnimation, setBranchAnimation] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);
    setBranchAnimation(true);
    setTimeout(() => {
      setIsAnimating(false);
      setBranchAnimation(false);
    }, 600);
    if (data.onClick) {
      data.onClick();
    }
  };

  useEffect(() => {
    if (selected || data.isSelected) {
      setBranchAnimation(true);
      const timer = setTimeout(() => setBranchAnimation(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [selected, data.isSelected]);

  // Color system - default to green but customizable
  const baseColor = data.color || "#10b981"; // emerald-500
  const lightColor = data.color ? `${data.color}15` : "rgba(16, 185, 129, 0.1)";
  const glowColor = data.color ? `${data.color}40` : "rgba(16, 185, 129, 0.25)";

  const nodeSize = data.size || "medium";

  // Size configurations
  const sizeConfig = {
    small: {
      width: "min-w-[180px] max-w-[210px]",
      padding: "p-4",
      iconSize: 16,
      titleSize: "text-sm",
    },
    medium: {
      width: "min-w-[210px] max-w-[250px]",
      padding: "p-5",
      iconSize: 18,
      titleSize: "text-base",
    },
    large: {
      width: "min-w-[250px] max-w-[290px]",
      padding: "p-6",
      iconSize: 20,
      titleSize: "text-lg",
    },
  };

  const config = sizeConfig[nodeSize];

  // Predefined color options for the branch node
  const colorOptions = [
    "#10b981", // emerald
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#f59e0b", // amber
    "#ef4444", // red
    "#06b6d4", // cyan
    "#84cc16", // lime
    "#f97316", // orange
  ];

  return (
    <div className="relative group">
      {/* Pulse Animation Ring */}
      {(branchAnimation || hovered) && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 rounded-[20px] border-2 animate-ping"
            style={{
              borderColor: `${baseColor}30`,
              animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }}
          />

          {/* Pulsing connection points */}
          {Array.from({ length: data.branchCount || 2 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-ping"
              style={{
                backgroundColor: baseColor,
                top: `${30 + i * 20}%`,
                right: `${10 + i * 15}%`,
                animationDelay: `${i * 0.4}s`,
                animationDuration: "1.5s",
              }}
            />
          ))}
        </div>
      )}

      {/* Glassmorphic Card */}
      <Card
        className={`${config.width} ${config.padding} relative overflow-hidden cursor-pointer transition-all duration-500 group-hover:scale-105 border-0`}
        style={{
          background: `
            linear-gradient(135deg, 
              ${lightColor} 0%, 
              rgba(255, 255, 255, 0.05) 50%, 
              ${lightColor} 100%
            )
          `,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border:
            hovered || selected || data.isSelected
              ? `1px solid ${baseColor}50`
              : "1px solid rgba(255, 255, 255, 0.2)",
          borderRadius: "20px",
          boxShadow:
            hovered || selected || data.isSelected
              ? `
                0 25px 50px -12px ${glowColor},
                0 0 0 1px ${baseColor}20,
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
        {/* Subtle gradient overlay with green tint */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `
              linear-gradient(135deg, 
                rgba(255, 255, 255, 0.1) 0%, 
                transparent 50%, 
                ${lightColor} 100%
              )
            `,
            borderRadius: "20px",
          }}
        />

        {/* Branching pattern background */}
        {(hovered || selected || data.isSelected) && (
          <div
            className="absolute inset-0 opacity-5 transition-transform duration-1000"
            style={{
              transform: branchAnimation ? "rotate(3deg)" : "rotate(0deg)",
            }}
          >
            <Route
              size={70}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
              style={{ color: baseColor }}
            />
          </div>
        )}

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center justify-center rounded-xl transition-all duration-300 ${
                  hovered || selected || data.isSelected ? "shadow-lg" : ""
                }`}
                style={{
                  width: `${config.iconSize + 16}px`,
                  height: `${config.iconSize + 16}px`,
                  background:
                    hovered || selected || data.isSelected
                      ? `${baseColor}20`
                      : `${baseColor}10`,
                  backdropFilter: "blur(10px)",
                }}
              >
                <GitBranch
                  size={config.iconSize}
                  style={{ color: baseColor }}
                  className="drop-shadow-sm"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  className={`font-semibold ${config.titleSize} text-slate-800 truncate leading-tight mb-1 transition-colors duration-300 drop-shadow-sm`}
                >
                  {data.label || "Branch Point"}
                </h3>
                <div className="flex items-center gap-2">
                  <Route size={12} style={{ color: baseColor }} />
                  <span className="text-xs font-medium text-slate-600/80">
                    Branch Node
                  </span>
                </div>
              </div>
            </div>

            {/* Color Picker Button */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowColorPicker(!showColorPicker);
                }}
                className="p-1.5 rounded-lg transition-all duration-200"
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <Palette size={12} style={{ color: baseColor }} />
              </button>

              {/* Color Picker Dropdown */}
              {showColorPicker && (
                <div
                  className="absolute top-full right-0 mt-2 p-2 rounded-xl border-0 z-50"
                  style={{
                    background: "rgba(255, 255, 255, 0.9)",
                    backdropFilter: "blur(20px)",
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <div className="grid grid-cols-4 gap-1">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Here you would update the node's color
                          // This would typically call a parent handler
                          console.log("Color selected:", color);
                          setShowColorPicker(false);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Branch Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2">
              <MessageCircle size={12} style={{ color: baseColor }} />
              <span className="text-sm font-medium text-slate-700">
                {data.messageCount || 0}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Share2 size={12} style={{ color: baseColor }} />
              <span className="text-sm font-medium text-slate-700">
                {data.branchCount || 2} paths
              </span>
            </div>
          </div>

          {/* Conditions Preview */}
          {data.conditions && data.conditions.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-slate-600 mb-1">Conditions:</div>
              <div className="flex flex-wrap gap-1">
                {data.conditions.slice(0, 2).map((condition, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="text-xs px-2 py-0.5 border-0"
                    style={{
                      background: `${baseColor}15`,
                      backdropFilter: "blur(10px)",
                      color: baseColor,
                    }}
                  >
                    {condition}
                  </Badge>
                ))}
                {data.conditions.length > 2 && (
                  <Badge
                    variant="outline"
                    className="text-xs px-2 py-0.5 border-0"
                    style={{
                      background: "rgba(0, 0, 0, 0.05)",
                      backdropFilter: "blur(10px)",
                      color: "#64748b",
                    }}
                  >
                    +{data.conditions.length - 2}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Timestamp */}
          {data.lastMessageAt && (
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <Clock size={10} />
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
            background: `linear-gradient(135deg, ${baseColor}, ${baseColor}dd)`,
            boxShadow: `0 0 12px ${glowColor}`,
          }}
        />
        <Handle
          type="source"
          position={Position.Right}
          className="!w-4 !h-4 !border-2 !border-white !shadow-lg !transition-all !duration-300 hover:!scale-125"
          style={{
            background: `linear-gradient(135deg, ${baseColor}, ${baseColor}dd)`,
            boxShadow: `0 0 12px ${glowColor}`,
          }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-4 !h-4 !border-2 !border-white !shadow-lg !transition-all !duration-300 hover:!scale-125"
          style={{
            background: `linear-gradient(135deg, ${baseColor}, ${baseColor}dd)`,
            boxShadow: `0 0 12px ${glowColor}`,
          }}
        />

        {/* Additional output handle for multiple branches */}
        <Handle
          type="source"
          position={Position.Top}
          className="!w-3 !h-3 !border-2 !border-white !shadow-md !transition-all !duration-300 hover:!scale-125"
          style={{
            background: `linear-gradient(135deg, ${baseColor}, ${baseColor}dd)`,
            boxShadow: `0 0 8px ${baseColor}30`,
            left: "75%",
          }}
        />
      </Card>
    </div>
  );
}
