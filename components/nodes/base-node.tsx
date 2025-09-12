"use client";
import { Handle, Position, type NodeProps } from "reactflow";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Zap, Clock, Hash } from "lucide-react";
import { useState, memo, type ReactNode } from "react";
import { getDefaultModel } from "@/lib/models";

interface BaseNodeData {
  label: string;
  messageCount?: number;
  isSelected?: boolean;
  onClick?: () => void;
  onSettingsClick?: () => void;
  model?: string;
  metaTags?: string[];
  lastMessageAt?: string;
  createdAt?: string;
  parentNodeId?: string;
  highlightTier?: 0 | 1 | 2;
}

interface BaseNodeProps extends NodeProps<BaseNodeData> {
  icon: ReactNode;
  gradient: string;
  shadowColor: string;
  accentColor: string;
  children?: ReactNode;
}

function BaseNodeComponent({
  data,
  selected,
  icon,
  gradient,
  shadowColor,
  accentColor,
  children,
}: BaseNodeProps) {
  const [hovered, setHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 200);
    if (data.onClick) {
      data.onClick();
    }
  };

  const model = data.model || getDefaultModel();
  const tags = (data.metaTags || []).slice(0, 2);
  const messageCount = data.messageCount || 0;
  const lastActivity = data.lastMessageAt || data.createdAt;
  const isActive = selected || data.isSelected;

  return (
    <div className="relative group">
      {/* Glow effect for active/highlighted nodes */}
      {(isActive || data.highlightTier === 0) && (
        <div
          className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${gradient} opacity-20 blur-xl scale-110 animate-pulse`}
        />
      )}

      <Card
        className={`relative min-w-[280px] max-w-[320px] cursor-pointer overflow-hidden border-0 transition-all duration-500 rounded-3xl backdrop-blur-xl ${
          isActive
            ? `shadow-2xl ${shadowColor} scale-[1.05] ring-1 ring-opacity-30`
            : `shadow-xl hover:shadow-2xl hover:${shadowColor} hover:scale-[1.02] hover:ring-1 hover:ring-opacity-20`
        } ${isAnimating ? "scale-95" : ""}`}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: `linear-gradient(135deg, 
            rgba(255, 255, 255, 0.95) 0%, 
            rgba(255, 255, 255, 0.8) 50%, 
            rgba(255, 255, 255, 0.6) 100%)`,
        }}
      >
        {/* Premium header */}
        <div className="relative px-6 pt-6 pb-4">
          {/* Settings button */}
          {hovered && (
            <button
              className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-xl p-2.5 shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-white hover:scale-110 group/settings"
              onClick={(e) => {
                e.stopPropagation();
                if (data.onSettingsClick) data.onSettingsClick();
              }}
              title="Node settings"
            >
              <Settings
                size={14}
                className={`${accentColor} group-hover/settings:rotate-90 transition-transform duration-300`}
              />
            </button>
          )}

          {/* Fork badge */}
          {data.parentNodeId && (
            <div className="absolute -top-3 -left-3 z-20">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold bg-gradient-to-r ${gradient} text-white shadow-xl border-2 border-white backdrop-blur-sm transform hover:scale-105 transition-transform`}
              >
                {icon}
                <span>FORK</span>
              </div>
            </div>
          )}

          {/* Main icon and title */}
          <div className="flex items-start gap-4">
            <div className="relative">
              <div
                className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg text-white`}
              >
                {icon}
              </div>
              {/* Status indicator */}
              <div
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                  isActive
                    ? `${accentColor.replace("text-", "bg-")} animate-pulse`
                    : "bg-slate-300"
                }`}
              />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-slate-800 leading-tight truncate mb-1">
                {data.label || "Node"}
              </h3>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={`text-xs px-2 py-1 border-0`}
                >
                  <Zap size={10} className="mr-1" />
                  {model}
                </Badge>
                {data.parentNodeId && (
                  <Badge variant="outline" className="text-xs px-2 py-1">
                    Forked
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats section */}
        <div className="px-6 pb-4">
          <div className="grid grid-cols-3 gap-3">
            {/* Messages */}
            <div className="text-center p-3 rounded-xl bg-white/50 border border-slate-100/50">
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="text-lg font-bold text-slate-800">
                  {messageCount}
                </span>
              </div>
              <div className="text-xs text-slate-500 font-medium">Messages</div>
            </div>

            {/* Activity */}
            <div className="text-center p-3 rounded-xl bg-white/50 border border-slate-100/50">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock size={14} className={accentColor} />
                <span className="text-xs font-bold text-slate-800">
                  {lastActivity
                    ? new Date(lastActivity).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "--"}
                </span>
              </div>
              <div className="text-xs text-slate-500 font-medium">Last</div>
            </div>

            {/* Status */}
            <div className="text-center p-3 rounded-xl bg-white/50 border border-slate-100/50">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Hash size={14} className={accentColor} />
                <span className="text-xs font-bold text-slate-800">
                  {isActive ? "Active" : "Idle"}
                </span>
              </div>
              <div className="text-xs text-slate-500 font-medium">Status</div>
            </div>
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="px-6 pb-4">
            <div className="flex gap-2 flex-wrap">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 rounded-lg bg-slate-50 text-slate-700 text-xs font-medium border border-slate-100"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Custom content */}
        {children}

        {/* Premium Handles */}
        <Handle
          type="target"
          position={Position.Top}
          className="!w-5 !h-5 !border-3 !border-white !shadow-xl !transition-all !duration-300 hover:!scale-125 hover:!shadow-2xl"
          style={{
            background: `linear-gradient(135deg, ${accentColor.replace(
              "text-",
              ""
            )}, ${accentColor.replace("text-", "").replace("500", "600")})`,
            boxShadow: `0 0 20px ${accentColor
              .replace("text-", "")
              .replace("-", "-")}40`,
          }}
        />
        <Handle
          type="target"
          position={Position.Left}
          className="!w-5 !h-5 !border-3 !border-white !shadow-xl !transition-all !duration-300 hover:!scale-125 hover:!shadow-2xl"
          style={{
            background: `linear-gradient(135deg, ${accentColor.replace(
              "text-",
              ""
            )}, ${accentColor.replace("text-", "").replace("500", "600")})`,
            boxShadow: `0 0 20px ${accentColor
              .replace("text-", "")
              .replace("-", "-")}40`,
          }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-5 !h-5 !border-3 !border-white !shadow-xl !transition-all !duration-300 hover:!scale-125 hover:!shadow-2xl"
          style={{
            background: `linear-gradient(135deg, ${accentColor.replace(
              "text-",
              ""
            )}, ${accentColor.replace("text-", "").replace("500", "600")})`,
            boxShadow: `0 0 20px ${accentColor
              .replace("text-", "")
              .replace("-", "-")}40`,
          }}
        />
        <Handle
          type="source"
          position={Position.Right}
          className="!w-5 !h-5 !border-3 !border-white !shadow-xl !transition-all !duration-300 hover:!scale-125 hover:!shadow-2xl"
          style={{
            background: `linear-gradient(135deg, ${accentColor.replace(
              "text-",
              ""
            )}, ${accentColor.replace("text-", "").replace("500", "600")})`,
            boxShadow: `0 0 20px ${accentColor
              .replace("text-", "")
              .replace("-", "-")}40`,
          }}
        />
      </Card>
    </div>
  );
}

export const BaseNode = memo(BaseNodeComponent);
