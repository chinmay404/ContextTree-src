"use client";

import type React from "react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Play,
  GitBranch,
  FileText,
  Sparkles,
  MessageCircle,
  Bot,
  Plus,
  ChevronDown,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const nodeTypes = [
  {
    id: "entry",
    label: "Entry",
    icon: Play,
    color: "bg-blue-500 hover:bg-blue-600 text-white",
    emoji: "🚀",
  },
  {
    id: "branch",
    label: "Branch",
    icon: GitBranch,
    color: "bg-emerald-500 hover:bg-emerald-600 text-white",
    emoji: "🔀",
  },
  {
    id: "context",
    label: "Context",
    icon: FileText,
    color: "bg-purple-500 hover:bg-purple-600 text-white",
    emoji: "📄",
  },
];

export function NodePalette() {
  const [isExpanded, setIsExpanded] = useState(false);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="relative">
      {/* Main Toggle Button */}
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-11 h-11 rounded-xl bg-white/90 backdrop-blur-sm border border-slate-200/80 shadow-lg hover:shadow-xl transition-all duration-200 text-slate-600 hover:text-slate-900 hover:bg-white"
        size="sm"
      >
        <Plus
          size={18}
          className={`transition-transform duration-200 ${
            isExpanded ? "rotate-45" : ""
          }`}
        />
      </Button>

      {/* Expanded Palette */}
      {isExpanded && (
        <div className="absolute bottom-14 right-0">
          <div className="bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-xl shadow-xl p-2">
            <div className="flex flex-col gap-1">
              {nodeTypes.map((nodeType) => {
                return (
                  <div
                    key={nodeType.id}
                    draggable
                    onDragStart={(event) => onDragStart(event, nodeType.id)}
                    className={`w-9 h-9 rounded-lg cursor-move transition-all duration-200 flex items-center justify-center text-base shadow-sm hover:shadow-md hover:scale-105 ${nodeType.color}`}
                    title={nodeType.label}
                  >
                    {nodeType.emoji}
                  </div>
                );
              })}
            </div>

            <div className="mt-2 pt-2 border-t border-slate-200/50">
              <div className="text-xs text-slate-500 text-center px-1">
                Drag to canvas
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
}
