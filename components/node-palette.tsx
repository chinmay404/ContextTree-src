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
    id: "branch",
    label: "Branch",
    icon: GitBranch,
    color:
      "bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-sm",
    emoji: "🔀",
  },
  {
    id: "context",
    label: "Context",
    icon: FileText,
    color:
      "bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-sm",
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
        className="w-12 h-12 rounded-2xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg hover:shadow-xl transition-all duration-300 text-slate-600 hover:text-slate-900 hover:bg-white hover:scale-105"
        size="sm"
      >
        <Plus
          size={20}
          className={`transition-all duration-300 ease-out ${
            isExpanded ? "rotate-45 scale-110" : ""
          }`}
        />
      </Button>

      {/* Expanded Palette */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 animate-in slide-in-from-bottom-2 fade-in duration-300">
          <div className="bg-white/98 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-2xl p-3">
            <div className="flex flex-col gap-2">
              {nodeTypes.map((nodeType, index) => {
                return (
                  <div
                    key={nodeType.id}
                    draggable
                    onDragStart={(event) => onDragStart(event, nodeType.id)}
                    className={`w-11 h-11 rounded-xl cursor-move transition-all duration-300 ease-out flex items-center justify-center text-lg shadow-md hover:shadow-lg hover:scale-110 active:scale-95 ${nodeType.color}`}
                    title={nodeType.label}
                    style={{
                      animationDelay: `${index * 50}ms`,
                    }}
                  >
                    <span className="drop-shadow-sm">{nodeType.emoji}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-200/50">
              <div className="text-xs text-slate-500 text-center px-2 font-light">
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
