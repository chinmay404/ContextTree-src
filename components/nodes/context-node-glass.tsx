"use client";
import { Handle, Position, type NodeProps } from "reactflow";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  MessageCircle,
  Settings,
  Database,
  Layers3,
  Brain,
  Sparkles,
  Archive,
  Clock,
  Hash,
  Zap,
  ArrowRight,
  Eye,
} from "lucide-react";
import { useState, useEffect } from "react";

interface ContextNodeData {
  label: string;
  isSelected: boolean;
  onClick?: () => void;
  onSettingsClick?: () => void;
  color?: string;
  textColor?: string;
  dotColor?: string;
  contextType?: "database" | "file" | "memory" | "api" | "knowledge";
  dataSize?: string;
  model?: string;
  messageCount?: number;
  metaTags?: string[];
  lastMessageAt?: string;
  createdAt?: string;
  highlightTier?: 0 | 1 | 2;
  size?: "small" | "medium" | "large";
  style?: "minimal" | "modern" | "glass" | "gradient";
  borderRadius?: number;
  opacity?: number;
  // Enhanced properties
  connectionCount?: number;
  branchCount?: number;
  nodeType?: string;
  isActive?: boolean;
}

export function ContextNodeGlass({
  data,
  selected,
}: NodeProps<ContextNodeData>) {
  const [hovered, setHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [dataFlow, setDataFlow] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);
    setDataFlow(true);
    setTimeout(() => {
      setIsAnimating(false);
      setDataFlow(false);
    }, 600);
    if (data.onClick) {
      data.onClick();
    }
  };

  useEffect(() => {
    if (selected || data.isSelected) {
      setDataFlow(true);
      const timer = setTimeout(() => setDataFlow(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [selected, data.isSelected]);

  // Glassmorphic purple theme for context nodes
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

  // Icon based on context type
  const getContextIcon = () => {
    switch (data.contextType) {
      case "database":
        return Database;
      case "file":
        return Archive;
      case "memory":
        return Brain;
      case "api":
        return Layers3;
      case "knowledge":
        return Sparkles;
      default:
        return FileText;
    }
  };

  const ContextIcon = getContextIcon();

  return (
    <div className="relative group">
      {/* Data Flow Animation */}
      {(dataFlow || hovered) && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 rounded-[20px] border-2 border-purple-400/30 animate-ping"
            style={{
              animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }}
          />

          {/* Flowing data particles */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping"
              style={{
                top: `${20 + i * 30}%`,
                left: `${15 + i * 25}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: "1.8s",
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
              rgba(139, 92, 246, 0.1) 0%, 
              rgba(124, 58, 237, 0.05) 50%, 
              rgba(109, 40, 217, 0.1) 100%
            )
          `,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border:
            hovered || selected || data.isSelected
              ? "1px solid rgba(139, 92, 246, 0.3)"
              : "1px solid rgba(255, 255, 255, 0.2)",
          borderRadius: "20px",
          boxShadow:
            hovered || selected || data.isSelected
              ? `
                0 25px 50px -12px rgba(139, 92, 246, 0.25),
                0 0 0 1px rgba(139, 92, 246, 0.1),
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
                rgba(139, 92, 246, 0.05) 100%
              )
            `,
            borderRadius: "20px",
          }}
        />

        {/* Data pattern background */}
        {(hovered || selected || data.isSelected) && (
          <div
            className="absolute inset-0 opacity-5 transition-transform duration-1000"
            style={{
              transform: dataFlow ? "translateY(-2px)" : "translateY(0px)",
            }}
          >
            <Hash
              size={60}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-purple-500"
            />
          </div>
        )}

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className={`flex items-center justify-center rounded-xl transition-all duration-300 ${
                  hovered || selected || data.isSelected
                    ? "bg-purple-500/20 shadow-lg"
                    : "bg-purple-500/10"
                }`}
                style={{
                  width: `${config.iconSize + 16}px`,
                  height: `${config.iconSize + 16}px`,
                  backdropFilter: "blur(10px)",
                }}
              >
                <ContextIcon
                  size={config.iconSize}
                  className="text-purple-600 drop-shadow-sm"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  className={`font-semibold ${config.titleSize} text-slate-800 truncate leading-tight mb-1 transition-colors duration-300 drop-shadow-sm`}
                >
                  {data.label || "Context Data"}
                </h3>
                <div className="flex items-center gap-2">
                  <Layers3 size={12} className="text-purple-500" />
                  <span className="text-xs font-medium text-slate-600/80">
                    {data.contextType || "Context"} Node
                  </span>
                  {/* Message Count */}
                  {data.messageCount !== undefined && (
                    <>
                      <span className="text-slate-400">•</span>
                      <MessageCircle size={12} className="text-slate-500" />
                      <span className="text-xs font-medium text-slate-600">
                        {data.messageCount}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Focus Status Badge */}
            <Badge
              variant="secondary"
              className={`px-2 py-1 text-xs font-medium border-0 transition-all duration-300 ${
                data.isSelected || selected ? "scale-110" : ""
              }`}
              style={{
                background:
                  data.isSelected || selected
                    ? "rgba(139, 92, 246, 0.2)"
                    : "rgba(139, 92, 246, 0.15)",
                backdropFilter: "blur(10px)",
                color: "#7c3aed",
                boxShadow:
                  data.isSelected || selected || dataFlow
                    ? "0 0 12px rgba(139, 92, 246, 0.4)"
                    : "none",
              }}
            >
              {data.isSelected || selected ? (
                <div className="flex items-center gap-1">
                  <Database size={10} className="text-purple-600" />
                  <span>Active</span>
                </div>
              ) : (
                <span>Ready</span>
              )}
            </Badge>
          </div>

          {/* Model & Connection Info */}
          <div className="mb-3 space-y-2">
            {/* LLM Model */}
            {data.model && (
              <div
                className="flex items-center justify-between p-2 rounded-lg transition-all duration-200"
                style={{
                  background: "rgba(139, 92, 246, 0.08)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Brain size={12} className="text-purple-500" />
                  <span className="text-xs font-semibold text-slate-700">
                    {data.model.replace("gpt-", "GPT-").toUpperCase()}
                  </span>
                </div>
                {data.isSelected && (
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                )}
              </div>
            )}

            {/* Connection Stats */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <Zap size={12} className="text-slate-500" />
                <span className="text-slate-600 font-medium">
                  Connections: {data.connectionCount || 0}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Hash size={12} className="text-purple-500" />
                <span className="text-slate-600 font-medium">
                  Context Type: {data.contextType || "General"}
                </span>
              </div>
            </div>
          </div>

          {/* Context Info */}
          {data.dataSize && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <Archive size={12} className="text-purple-500" />
              <span className="text-sm font-medium text-slate-700">
                {data.dataSize}
              </span>
            </div>
          )}

          {/* Meta Tags */}
          {data.metaTags && data.metaTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {data.metaTags.slice(0, 2).map((tag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs px-2 py-0.5 border-0"
                  style={{
                    background: "rgba(139, 92, 246, 0.1)",
                    backdropFilter: "blur(10px)",
                    color: "#7c3aed",
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
              <Clock size={10} />
              {new Date(data.lastMessageAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
        </div>

        {/* Beautiful Connection Handles for Context Node */}
        {/* Target handles (inputs) */}
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          className="!w-3 !h-3 !border-2 !border-white !bg-amber-500 !opacity-100 hover:!scale-125 !transition-all !duration-200"
          style={{ 
            top: "50%", 
            left: "-6px",
            backgroundColor: data.dotColor || "#f59e0b",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}
        />
        <Handle
          type="target"
          position={Position.Top}
          id="top"
          className="!w-3 !h-3 !border-2 !border-white !bg-amber-500 !opacity-100 hover:!scale-125 !transition-all !duration-200"
          style={{ 
            left: "50%", 
            top: "-6px",
            backgroundColor: data.dotColor || "#f59e0b",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}
        />

        {/* Source handles (outputs) */}
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          className="!w-3 !h-3 !border-2 !border-white !bg-amber-500 !opacity-100 hover:!scale-125 !transition-all !duration-200"
          style={{ 
            top: "50%", 
            right: "-6px",
            backgroundColor: data.dotColor || "#f59e0b",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          className="!w-3 !h-3 !border-2 !border-white !bg-amber-500 !opacity-100 hover:!scale-125 !transition-all !duration-200"
          style={{ 
            left: "50%", 
            bottom: "-6px",
            backgroundColor: data.dotColor || "#f59e0b",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}
        />
      </Card>
    </div>
  );
}
