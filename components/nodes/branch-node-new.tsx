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
  ArrowRightLeft,
  TrendingUp,
  Layers,
} from "lucide-react";
import { useState } from "react";

interface BranchNodeData {
  label: string;
  messageCount: number;
  isSelected: boolean;
  onClick?: () => void;
  onSettingsClick?: () => void;
  color?: string;
  textColor?: string;
  dotColor?: string;
}

export function BranchNode({ data, selected }: NodeProps<BranchNodeData>) {
  const [hovered, setHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 200);
    if (data.onClick) {
      data.onClick();
    }
  };

  const defaultColor = "#dcfce7";
  const currentColor = data.color || defaultColor;
  const textColor = data.textColor || "#15803d";
  const dotColor = data.dotColor || "#22c55e";

  return (
    <div className="relative group">
      {/* Glow effect */}
      <div
        className={`absolute inset-0 rounded-3xl opacity-0 blur-xl transition-all duration-500 ${
          selected || data.isSelected || hovered
            ? "opacity-20 scale-110"
            : "opacity-0 scale-100"
        }`}
        style={{ backgroundColor: dotColor }}
      />

      <Card
        className={`min-w-[200px] max-w-[280px] cursor-pointer transition-all duration-300 border-0 shadow-xl backdrop-blur-sm overflow-hidden relative ${
          selected || data.isSelected
            ? "ring-4 ring-opacity-30 scale-105 shadow-2xl"
            : "shadow-lg hover:shadow-xl hover:scale-102"
        } ${isAnimating ? "scale-95" : ""}`}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          backgroundColor: currentColor,
          borderColor: dotColor,
          color: textColor,
          boxShadow: `0 20px 40px -10px ${dotColor}40, 0 10px 20px -5px ${dotColor}20`,
        }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-16 translate-x-16"
            style={{ backgroundColor: dotColor }}
          />
          <div
            className="absolute bottom-0 left-0 w-20 h-20 rounded-full translate-y-10 -translate-x-10"
            style={{ backgroundColor: dotColor }}
          />
          {/* Branching pattern */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5">
            <GitBranch size={120} style={{ color: dotColor }} />
          </div>
        </div>

        {/* Input Handles */}
        <Handle
          type="target"
          position={Position.Top}
          className="!w-4 !h-4 !border-3 !border-white !shadow-lg !transition-all !duration-200 hover:!scale-125"
          style={{ backgroundColor: dotColor }}
        />
        <Handle
          type="target"
          position={Position.Left}
          className="!w-4 !h-4 !border-3 !border-white !shadow-lg !transition-all !duration-200 hover:!scale-125"
          style={{ backgroundColor: dotColor }}
        />

        {/* Header Section */}
        <div className="relative p-6">
          {/* Settings Button */}
          {hovered && (
            <button
              className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm border-0 rounded-xl p-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-white hover:scale-110"
              onClick={(e) => {
                e.stopPropagation();
                if (data.onSettingsClick) data.onSettingsClick();
              }}
            >
              <Settings size={16} style={{ color: dotColor }} />
            </button>
          )}

          {/* Icon and Title */}
          <div className="flex items-center gap-4 mb-6">
            <div
              className="relative w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${dotColor}15, ${dotColor}30)`,
                borderColor: dotColor,
              }}
            >
              {/* Icon glow */}
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  background: `radial-gradient(circle at center, ${dotColor}20, transparent 70%)`,
                }}
              />
              <GitBranch
                className="h-7 w-7 relative z-10 drop-shadow-sm"
                style={{ color: dotColor }}
              />
              {/* Pulsing activity indicators */}
              <div className="absolute -top-1 -left-1">
                <div
                  className="w-3 h-3 rounded-full animate-pulse"
                  style={{ backgroundColor: dotColor }}
                />
              </div>
              <div className="absolute -bottom-1 -right-1">
                <div
                  className="w-3 h-3 rounded-full animate-pulse delay-150"
                  style={{ backgroundColor: dotColor }}
                />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3
                className="font-bold text-lg truncate leading-tight mb-1"
                style={{ color: textColor }}
              >
                {data.label || "Branch Point"}
              </h3>
              <div className="flex items-center gap-2">
                <Route size={14} style={{ color: dotColor }} />
                <span
                  className="text-sm font-medium opacity-80"
                  style={{ color: textColor }}
                >
                  Decision Node
                </span>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="space-y-3">
            {/* Message Count */}
            <div
              className="flex items-center justify-between p-3 rounded-2xl backdrop-blur-sm"
              style={{ backgroundColor: `${dotColor}15` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${dotColor}30` }}
                >
                  <MessageCircle size={14} style={{ color: dotColor }} />
                </div>
                <span
                  className="text-sm font-medium"
                  style={{ color: textColor }}
                >
                  Messages
                </span>
              </div>
              <Badge
                className="px-3 py-1 rounded-full border-0 font-bold text-sm shadow-sm"
                style={{
                  backgroundColor: `${dotColor}20`,
                  color: dotColor,
                }}
              >
                {data.messageCount || 0}
              </Badge>
            </div>

            {/* Path Indicators */}
            <div className="grid grid-cols-2 gap-2">
              <div
                className="flex items-center gap-2 p-2 rounded-xl backdrop-blur-sm"
                style={{ backgroundColor: `${dotColor}10` }}
              >
                <TrendingUp size={12} style={{ color: dotColor }} />
                <span
                  className="text-xs font-medium"
                  style={{ color: textColor }}
                >
                  Path A
                </span>
              </div>
              <div
                className="flex items-center gap-2 p-2 rounded-xl backdrop-blur-sm"
                style={{ backgroundColor: `${dotColor}10` }}
              >
                <Layers size={12} style={{ color: dotColor }} />
                <span
                  className="text-xs font-medium"
                  style={{ color: textColor }}
                >
                  Path B
                </span>
              </div>
            </div>

            {/* Action Indicator */}
            <div
              className="flex items-center gap-3 p-3 rounded-2xl backdrop-blur-sm transition-all duration-200"
              style={{ backgroundColor: `${dotColor}10` }}
            >
              <ArrowRightLeft size={14} style={{ color: dotColor }} />
              <span
                className="text-xs font-medium flex-1"
                style={{ color: textColor }}
              >
                Conditional routing logic
              </span>
              <Zap
                size={14}
                style={{ color: dotColor }}
                className={`transition-transform duration-200 ${
                  hovered ? "scale-110" : ""
                }`}
              />
            </div>
          </div>
        </div>

        {/* Output Handles */}
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-4 !h-4 !border-3 !border-white !shadow-lg !transition-all !duration-200 hover:!scale-125"
          style={{ backgroundColor: dotColor }}
        />
        <Handle
          type="source"
          position={Position.Right}
          className="!w-4 !h-4 !border-3 !border-white !shadow-lg !transition-all !duration-200 hover:!scale-125"
          style={{ backgroundColor: dotColor }}
        />
      </Card>
    </div>
  );
}
