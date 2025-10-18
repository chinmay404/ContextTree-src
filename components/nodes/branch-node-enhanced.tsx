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
  parentNodeId?: string;
  forkedFromMessageId?: string;
  model?: string;
  metaTags?: string[];
  lastMessageAt?: string;
  createdAt?: string;
  highlightTier?: 0 | 1 | 2;
  size?: "small" | "medium" | "large";
  style?: "minimal" | "modern" | "glass" | "gradient";
  borderRadius?: number;
  opacity?: number;
  branchCount?: number;
  activeThreads?: number;
}

export function BranchNodeEnhanced({
  data,
  selected,
}: NodeProps<BranchNodeData>) {
  const [hovered, setHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [branchAnimation, setBranchAnimation] = useState(false);

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

  // Dynamic theming - Emerald/Green theme for branches
  const defaultColor = "#f0fdf4";
  const currentColor = data.color || defaultColor;
  const textColor = data.textColor || "#14532d";
  const dotColor = data.dotColor || "#16a34a";
  const borderRadius = data.borderRadius || 20;
  const opacity = data.opacity || 100;
  const nodeSize = data.size || "medium";
  const nodeStyle = data.style || "modern";

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
          background: `linear-gradient(135deg, ${currentColor}, ${dotColor}20)`,
        };
      case "glass":
        return {
          ...baseStyle,
          backgroundColor: `${currentColor}90`,
          backdropFilter: "blur(12px)",
        };
      default:
        return {
          ...baseStyle,
          background: `linear-gradient(135deg, ${currentColor} 0%, ${currentColor}F5 50%, ${currentColor}E8 100%)`,
        };
    }
  };

  const model = data.model || "gpt-4";
  const tags = (data.metaTags || []).slice(0, 2);
  const branchCount = data.branchCount || 0;
  const activeThreads = data.activeThreads || 1;

  return (
    <div className="relative group">
      {/* Enhanced Glow Effect */}
      <div
        className={`absolute inset-0 rounded-xl pointer-events-none transition-all duration-700 ${
          selected || data.isSelected || branchAnimation
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

      {/* Branch Lines Animation */}
      {branchAnimation && (
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ borderRadius: `${borderRadius}px` }}
        >
          {/* Animated branch lines */}
          <svg className="absolute inset-0 w-full h-full opacity-30">
            <defs>
              <linearGradient
                id="branchGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={dotColor} stopOpacity="0.8" />
                <stop offset="100%" stopColor={dotColor} stopOpacity="0.1" />
              </linearGradient>
            </defs>
            {Array.from({ length: 3 }).map((_, i) => (
              <path
                key={i}
                d={`M 20 ${40 + i * 15} Q 60 ${30 + i * 10} 100 ${50 + i * 20}`}
                stroke="url(#branchGradient)"
                strokeWidth="2"
                fill="none"
                className="animate-pulse"
                style={{ animationDelay: `${i * 0.3}s` }}
              />
            ))}
          </svg>
        </div>
      )}

      {/* Floating Connection Indicators */}
      {(hovered || selected || data.isSelected) && (
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ borderRadius: `${borderRadius}px` }}
        >
          {Array.from({ length: branchCount || 2 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full animate-ping"
              style={{
                backgroundColor: dotColor,
                top: `${30 + i * 20}%`,
                right: `${10 + i * 15}%`,
                animationDelay: `${i * 0.4}s`,
                animationDuration: "1.5s",
              }}
            />
          ))}
        </div>
      )}

      <Card
        className={`${getStyleClasses()} ${
          selected || data.isSelected
            ? "scale-[1.02] ring-2 ring-opacity-30"
            : "hover:scale-[1.01]"
        } ${isAnimating ? "scale-[0.98]" : ""}`}
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
              className="absolute top-0 right-0 w-28 h-28 rounded-full -translate-y-14 translate-x-14"
              style={{ backgroundColor: dotColor }}
            />
            <div
              className="absolute bottom-0 left-0 w-16 h-16 rounded-full translate-y-8 -translate-x-8"
              style={{ backgroundColor: dotColor }}
            />

            {/* Branch pattern */}
            <div
              className={`absolute inset-0 flex items-center justify-center opacity-5 transition-transform duration-1000 ${
                branchAnimation ? "rotate-6" : "rotate-0"
              }`}
            >
              <Route size={70} style={{ color: dotColor }} />
            </div>
          </div>
        )}

        {/* Subtle Light Overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent"
          style={{ borderRadius: `${borderRadius}px` }}
        />

        {/* Branch Tier Indicator */}
        <div className="absolute top-3 left-3">
          <div className="flex gap-1">
            {Array.from({ length: (data.highlightTier || 0) + 1 }).map(
              (_, i) => (
                <div
                  key={i}
                  className="w-1 h-6 rounded-full opacity-60"
                  style={{ backgroundColor: dotColor }}
                />
              )
            )}
          </div>
        </div>

        {/* Activity Indicator */}
        <div className="absolute top-3 right-3">
          <div
            className={`flex items-center gap-1 transition-all duration-300 ${
              activeThreads > 1 ? "opacity-100" : "opacity-60"
            }`}
          >
            <Share2 size={12} style={{ color: dotColor }} />
            <span className="text-xs font-medium" style={{ color: textColor }}>
              {activeThreads}
            </span>
          </div>
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
                  background: `radial-gradient(circle at center, ${dotColor}25, transparent 70%)`,
                  borderRadius: `${borderRadius * 0.6}px`,
                }}
              />

              {/* Main Icon */}
              <GitBranch
                className="relative z-10 transition-all duration-300 group-hover:scale-110"
                size={config.iconSize}
                style={{ color: dotColor }}
              />

              {/* Branch Animation Indicator */}
              {branchAnimation && (
                <div className="absolute -top-1 -right-1">
                  <TrendingUp
                    className="text-green-400 animate-bounce"
                    size={10}
                  />
                </div>
              )}
            </div>

            {/* Title and Info */}
            <div className="flex-1 min-w-0">
              <h3
                className={`font-bold ${config.titleSize} truncate leading-tight mb-1 transition-colors duration-300`}
                style={{ color: textColor }}
              >
                {data.label || "Branch Point"}
              </h3>

              <div className="flex items-center gap-2 mb-2">
                <Route size={12} style={{ color: dotColor }} />
                <span
                  className="text-xs font-medium opacity-80"
                  style={{ color: textColor }}
                >
                  Decision Branch
                </span>
              </div>
            </div>
          </div>

          {/* Branch Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2">
              <MessageCircle size={12} style={{ color: dotColor }} />
              <span
                className="text-sm font-medium"
                style={{ color: textColor }}
              >
                {data.messageCount}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Users size={12} style={{ color: dotColor }} />
              <span
                className="text-sm font-medium"
                style={{ color: textColor }}
              >
                {branchCount} paths
              </span>
            </div>
          </div>

          {/* Model and Performance */}
          <div className="flex items-center justify-between mb-3">
            <Badge
              className="text-xs font-medium border-0 shadow-sm"
              style={{
                backgroundColor: `${dotColor}15`,
                color: dotColor,
              }}
            >
              {model}
            </Badge>

            {activeThreads > 1 && (
              <div
                className="flex items-center gap-1 text-xs"
                style={{ color: textColor }}
              >
                <Zap size={10} style={{ color: dotColor }} />
                <span>Active</span>
              </div>
            )}
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
              <Clock size={10} />
              <span>
                {data.lastMessageAt
                  ? new Date(data.lastMessageAt).toLocaleDateString()
                  : "No activity"}
              </span>
            </div>

            {hovered && (
              <div className="flex items-center gap-1 animate-fade-in">
                <ArrowRight size={10} />
                <span>Explore paths</span>
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
        {/* Additional output handle for multiple branches */}
        <Handle
          type="source"
          position={Position.Top}
          className="!w-3 !h-3 !border-2 !border-white !shadow-md !transition-all !duration-300 hover:!scale-125"
          style={{
            backgroundColor: dotColor,
            boxShadow: `0 0 8px ${dotColor}30`,
            left: "75%",
          }}
        />
      </Card>
    </div>
  );
}
