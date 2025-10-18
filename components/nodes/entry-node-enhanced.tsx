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

export function EntryNodeEnhanced({
  data,
  selected,
}: NodeProps<EntryNodeData>) {
  const [hovered, setHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [pulseAnimation, setPulseAnimation] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);
    setPulseAnimation(true);
    setTimeout(() => {
      setIsAnimating(false);
      setPulseAnimation(false);
    }, 300);
    if (data.onClick) {
      data.onClick();
    }
  };

  useEffect(() => {
    if (selected || data.isSelected) {
      setPulseAnimation(true);
      const timer = setTimeout(() => setPulseAnimation(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [selected, data.isSelected]);

  // Dynamic theming
  const defaultColor = "#f0f9ff";
  const currentColor = data.color || defaultColor;
  const textColor = data.textColor || "#0f172a";
  const dotColor = data.dotColor || "#3b82f6";
  const borderRadius = data.borderRadius || 20;
  const opacity = data.opacity || 100;
  const nodeSize = data.size || "medium";
  const nodeStyle = data.style || "modern";

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
      width: "min-w-[280px] max-w-[320px]",
      padding: "p-6",
      iconSize: 20,
      titleSize: "text-lg",
    },
  };

  const config = sizeConfig[nodeSize];

  // Style configurations
  const getStyleClasses = () => {
    const baseClasses = `${config.width} cursor-pointer relative overflow-hidden transition-all duration-500 transform-gpu`;

    switch (nodeStyle) {
      case "minimal":
        return `${baseClasses} border-2 border-slate-200 bg-white shadow-sm hover:shadow-md`;
      case "glass":
        return `${baseClasses} border border-white/20 backdrop-blur-md shadow-xl hover:shadow-2xl`;
      case "gradient":
        return `${baseClasses} border-0 shadow-xl hover:shadow-2xl`;
      case "modern":
      default:
        return `${baseClasses} border-0 shadow-lg hover:shadow-xl`;
    }
  };

  const getBackgroundStyle = () => {
    const baseStyle = {
      borderRadius: `${borderRadius}px`,
      opacity: opacity / 100,
      color: textColor,
    };

    switch (nodeStyle) {
      case "gradient":
        return {
          ...baseStyle,
          background: `linear-gradient(135deg, ${currentColor}, ${dotColor}30)`,
        };
      case "glass":
        return {
          ...baseStyle,
          backgroundColor: `${currentColor}95`,
          backdropFilter: "blur(12px)",
        };
      default:
        return {
          ...baseStyle,
          background: `linear-gradient(135deg, ${currentColor} 0%, ${currentColor}F0 50%, ${currentColor}E0 100%)`,
        };
    }
  };

  const model = data.model || "gpt-4";
  const tags = (data.metaTags || []).slice(0, 2);
  const lastActivity = data.lastMessageAt || data.createdAt;

  return (
    <div className="relative group">
      {/* Enhanced Glow Effect */}
      <div
        className={`absolute inset-0 rounded-xl pointer-events-none transition-all duration-700 ${
          selected || data.isSelected || pulseAnimation
            ? "ring-4 ring-offset-2 ring-offset-transparent scale-105 opacity-100"
            : "ring-0 scale-100 opacity-0"
        }`}
        style={{
          borderRadius: `${borderRadius}px`,
          ringColor: `${dotColor}40`,
          boxShadow:
            selected || data.isSelected
              ? `0 0 0 4px ${dotColor}20, 0 0 32px -4px ${dotColor}50, 0 20px 40px -12px ${dotColor}30`
              : undefined,
        }}
      />

      {/* Floating Particles Effect */}
      {(hovered || selected || data.isSelected) && (
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ borderRadius: `${borderRadius}px` }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full animate-ping"
              style={{
                backgroundColor: dotColor,
                top: `${20 + i * 30}%`,
                left: `${15 + i * 25}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: "2s",
              }}
            />
          ))}
        </div>
      )}

      <Card
        className={`${getStyleClasses()} ${
          selected || data.isSelected
            ? "scale-[1.03] ring-2 ring-opacity-30"
            : "hover:scale-[1.02]"
        } ${isAnimating ? "scale-[0.98]" : ""} ${
          pulseAnimation ? "animate-pulse" : ""
        }`}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          ...getBackgroundStyle(),
          boxShadow:
            selected || data.isSelected
              ? `0 25px 50px -12px ${dotColor}25, 0 0 0 1px ${dotColor}20`
              : hovered
              ? `0 20px 40px -8px ${dotColor}20`
              : undefined,
        }}
      >
        {/* Background Pattern */}
        {nodeStyle !== "minimal" && (
          <div className="absolute inset-0 opacity-[0.03]">
            <div
              className="absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-16 translate-x-16"
              style={{ backgroundColor: dotColor }}
            />
            <div
              className="absolute bottom-0 left-0 w-20 h-20 rounded-full translate-y-10 -translate-x-10"
              style={{ backgroundColor: dotColor }}
            />
          </div>
        )}

        {/* Subtle Light Overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent"
          style={{ borderRadius: `${borderRadius}px` }}
        />

        {/* Primary Node Indicator */}
        {data.primary && (
          <div className="absolute top-3 left-3 flex items-center gap-1">
            <Star size={12} className="text-amber-400 fill-amber-400" />
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shadow-sm" />
          </div>
        )}

        {/* Activity Indicator */}
        <div className="absolute top-3 right-3">
          <div
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              data.messageCount > 0
                ? "bg-green-400 shadow-lg animate-pulse"
                : "bg-slate-300"
            }`}
          />
        </div>

        {/* Main Content */}
        <div className={`relative ${config.padding}`}>
          {/* Settings Button */}
          <div
            className={`absolute top-0 right-0 transition-all duration-300 ${
              hovered
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2 pointer-events-none"
            }`}
          >
            <button
              className="bg-white border-2 border-slate-300 rounded-xl p-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-slate-50 hover:scale-110 hover:border-slate-400 group"
              onClick={(e) => {
                e.stopPropagation();
                if (data.onSettingsClick) data.onSettingsClick();
              }}
            >
              <Settings
                size={config.iconSize - 2}
                className="text-slate-700 group-hover:text-slate-900 group-hover:rotate-90 transition-all duration-300"
              />
            </button>
          </div>

          {/* Header Section */}
          <div className="flex items-start gap-4 mb-4">
            {/* Icon Container */}
            <div
              className="relative flex items-center justify-center shadow-lg overflow-hidden transition-all duration-300 group-hover:scale-110"
              style={{
                width: `${config.iconSize * 2.5}px`,
                height: `${config.iconSize * 2.5}px`,
                borderRadius: `${borderRadius * 0.6}px`,
                background: `linear-gradient(135deg, ${dotColor}15, ${dotColor}30)`,
                border: `1px solid ${dotColor}20`,
              }}
            >
              {/* Icon Glow */}
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(circle at center, ${dotColor}20, transparent 70%)`,
                  borderRadius: `${borderRadius * 0.6}px`,
                }}
              />

              {/* Main Icon */}
              <Play
                className="relative z-10 transition-all duration-300 group-hover:scale-110"
                size={config.iconSize}
                style={{ color: dotColor }}
              />

              {/* Sparkle Effect */}
              {hovered && (
                <Sparkles
                  className="absolute top-0 right-0 text-amber-400 animate-pulse"
                  size={8}
                />
              )}
            </div>

            {/* Title and Info */}
            <div className="flex-1 min-w-0">
              <h3
                className={`font-bold ${config.titleSize} truncate leading-tight mb-1 transition-colors duration-300`}
                style={{ color: textColor }}
              >
                {data.label || "Entry Point"}
              </h3>

              <div className="flex items-center gap-2 mb-2">
                <Zap size={12} style={{ color: dotColor }} />
                <span
                  className="text-xs font-medium opacity-80"
                  style={{ color: textColor }}
                >
                  Entry Node
                </span>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageCircle size={12} style={{ color: dotColor }} />
              <span
                className="text-sm font-medium"
                style={{ color: textColor }}
              >
                {data.messageCount} messages
              </span>
            </div>

            <Badge
              className="text-xs font-medium border-0 shadow-sm"
              style={{
                backgroundColor: `${dotColor}15`,
                color: dotColor,
              }}
            >
              {model}
            </Badge>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex gap-1 mb-3 flex-wrap">
              {tags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-xs bg-white/60 border-0 shadow-sm"
                  style={{ color: textColor }}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Activity Footer */}
          <div
            className="flex items-center justify-between text-xs"
            style={{ color: `${textColor}80` }}
          >
            <div className="flex items-center gap-1">
              <Activity size={10} />
              <span>
                {lastActivity
                  ? new Date(lastActivity).toLocaleDateString()
                  : "No activity"}
              </span>
            </div>

            {hovered && (
              <div className="flex items-center gap-1 animate-fade-in">
                <Eye size={10} />
                <span>Click to open</span>
              </div>
            )}
          </div>
        </div>

        {/* Connection Handles */}
        <Handle
          type="target"
          position={Position.Left}
          className="!w-4 !h-4 !border-3 !border-white !shadow-lg !transition-all !duration-300 hover:!scale-125"
          style={{
            backgroundColor: dotColor,
            boxShadow: `0 0 12px ${dotColor}40`,
          }}
        />
        <Handle
          type="source"
          position={Position.Right}
          className="!w-4 !h-4 !border-3 !border-white !shadow-lg !transition-all !duration-300 hover:!scale-125"
          style={{
            backgroundColor: dotColor,
            boxShadow: `0 0 12px ${dotColor}40`,
          }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-4 !h-4 !border-3 !border-white !shadow-lg !transition-all !duration-300 hover:!scale-125"
          style={{
            backgroundColor: dotColor,
            boxShadow: `0 0 12px ${dotColor}40`,
          }}
        />
      </Card>
    </div>
  );
}
