"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Play,
  GitBranch,
  FileText,
  MessageCircle,
  Bot,
  Palette,
  Settings,
  Sparkles,
  Zap,
  ChevronDown,
  Eye,
  X,
} from "lucide-react";

const NODE_TYPES = [
  {
    id: "entry",
    label: "Entry Point",
    description: "Start your conversation flow",
    icon: Play,
    color: "bg-gradient-to-br from-blue-500 to-blue-600",
    hoverColor: "hover:from-blue-600 hover:to-blue-700",
    emoji: "🚀",
    category: "flow",
  },
  {
    id: "branch",
    label: "Branch",
    description: "Create decision paths",
    icon: GitBranch,
    color: "bg-gradient-to-br from-emerald-500 to-green-600",
    hoverColor: "hover:from-emerald-600 hover:to-green-700",
    emoji: "🔀",
    category: "flow",
  },
  {
    id: "context",
    label: "Context",
    description: "Add knowledge and data",
    icon: FileText,
    color: "bg-gradient-to-br from-purple-500 to-violet-600",
    hoverColor: "hover:from-purple-600 hover:to-violet-700",
    emoji: "📄",
    category: "data",
  },
  {
    id: "user-message",
    label: "User Input",
    description: "Capture user messages",
    icon: MessageCircle,
    color: "bg-gradient-to-br from-amber-500 to-orange-600",
    hoverColor: "hover:from-amber-600 hover:to-orange-700",
    emoji: "💬",
    category: "interaction",
  },
  {
    id: "bot-response",
    label: "Bot Response",
    description: "AI generated responses",
    icon: Bot,
    color: "bg-gradient-to-br from-rose-500 to-pink-600",
    hoverColor: "hover:from-rose-600 hover:to-pink-700",
    emoji: "🤖",
    category: "interaction",
  },
];

const QUICK_THEMES = [
  {
    name: "Ocean",
    colors: { bg: "#e0f2fe", text: "#0891b2", accent: "#06b6d4" },
    gradient: "from-cyan-100 to-blue-100",
  },
  {
    name: "Forest",
    colors: { bg: "#dcfce7", text: "#14532d", accent: "#16a34a" },
    gradient: "from-green-100 to-emerald-100",
  },
  {
    name: "Sunset",
    colors: { bg: "#fed7aa", text: "#9a3412", accent: "#ea580c" },
    gradient: "from-orange-100 to-amber-100",
  },
  {
    name: "Purple",
    colors: { bg: "#f3e8ff", text: "#7c3aed", accent: "#8b5cf6" },
    gradient: "from-purple-100 to-violet-100",
  },
];

export function NodePaletteEnhanced() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQuickThemes, setShowQuickThemes] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<"all" | "flow" | "data" | "interaction">("all");
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const filteredNodes = NODE_TYPES.filter(
    node => selectedCategory === "all" || node.category === selectedCategory
  );

  const categories = [
    { id: "all", label: "All", icon: Sparkles },
    { id: "flow", label: "Flow", icon: GitBranch },
    { id: "data", label: "Data", icon: FileText },
    { id: "interaction", label: "Chat", icon: MessageCircle },
  ];

  return (
    <div className="relative">
      {/* Main Toggle Button */}
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-12 h-12 rounded-2xl bg-white/95 backdrop-blur-md border-2 border-slate-200/80 shadow-xl hover:shadow-2xl transition-all duration-300 text-slate-600 hover:text-slate-900 hover:bg-white hover:scale-110 ${
          isExpanded ? "bg-slate-100 border-slate-300" : ""
        }`}
        size="sm"
      >
        <Plus
          size={20}
          className={`transition-transform duration-300 ${
            isExpanded ? "rotate-45" : ""
          }`}
        />
      </Button>

      {/* Expanded Palette */}
      {isExpanded && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[-1]"
            onClick={() => setIsExpanded(false)}
          />
          
          {/* Main Palette Container */}
          <Card className="absolute bottom-16 right-0 w-80 bg-white/95 backdrop-blur-md border-slate-200/80 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200/50 bg-slate-50/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Palette size={18} className="text-slate-600" />
                  <span className="font-semibold text-slate-900">Node Palette</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowQuickThemes(!showQuickThemes)}
                    className="text-slate-500 hover:text-slate-700 h-8 w-8 p-0"
                  >
                    <Sparkles size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(false)}
                    className="text-slate-500 hover:text-slate-700 h-8 w-8 p-0"
                  >
                    <X size={14} />
                  </Button>
                </div>
              </div>

              {/* Category Filter */}
              <div className="flex gap-1 p-1 bg-white/60 rounded-xl">
                {categories.map(({ id, label, icon: Icon }) => (
                  <Button
                    key={id}
                    variant={selectedCategory === id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedCategory(id as any)}
                    className={`flex-1 text-xs h-8 transition-all duration-200 ${
                      selectedCategory === id
                        ? "bg-white shadow-sm text-slate-900"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Icon size={12} className="mr-1" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Quick Themes Panel */}
            {showQuickThemes && (
              <div className="p-4 border-b border-slate-200/50 bg-slate-50/30">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={14} className="text-slate-600" />
                  <span className="text-sm font-medium text-slate-800">Quick Themes</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_THEMES.map((theme) => (
                    <button
                      key={theme.name}
                      className={`h-12 rounded-lg bg-gradient-to-br ${theme.gradient} border border-slate-200/50 hover:border-slate-300/50 transition-all duration-200 hover:scale-105 group relative overflow-hidden`}
                      onClick={() => {
                        // Apply theme logic would go here
                        console.log(`Applied ${theme.name} theme`);
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                      <div className="relative z-10 text-xs font-medium text-slate-800">
                        {theme.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Node List */}
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {filteredNodes.map((nodeType) => {
                  const Icon = nodeType.icon;
                  return (
                    <div
                      key={nodeType.id}
                      className="group relative"
                      onMouseEnter={() => setHoveredNode(nodeType.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                    >
                      <Card
                        className={`p-4 cursor-grab active:cursor-grabbing transition-all duration-200 border-slate-200/60 hover:border-slate-300/80 hover:shadow-lg hover:scale-[1.02] ${nodeType.color} ${nodeType.hoverColor} text-white overflow-hidden relative`}
                        draggable
                        onDragStart={(e) => onDragStart(e, nodeType.id)}
                      >
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute top-0 right-0 w-16 h-16 rounded-full -translate-y-8 translate-x-8 bg-white/20" />
                          <div className="absolute bottom-0 left-0 w-12 h-12 rounded-full translate-y-6 -translate-x-6 bg-white/10" />
                        </div>

                        <div className="relative z-10 flex items-center gap-3">
                          {/* Icon */}
                          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                            <Icon size={18} className="text-white" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-sm text-white">
                                {nodeType.label}
                              </h3>
                              <span className="text-lg">{nodeType.emoji}</span>
                            </div>
                            <p className="text-xs text-white/80 leading-relaxed">
                              {nodeType.description}
                            </p>
                          </div>

                          {/* Drag Indicator */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <div className="w-2 h-2 bg-white/60 rounded-full" />
                            </div>
                          </div>
                        </div>

                        {/* Hover Effect */}
                        {hoveredNode === nodeType.id && (
                          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                        )}
                      </Card>

                      {/* Tooltip */}
                      {hoveredNode === nodeType.id && (
                        <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 z-50">
                          <Card className="p-2 bg-slate-900 text-white text-xs whitespace-nowrap shadow-xl">
                            Drag to canvas to create
                            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-900 rotate-45" />
                          </Card>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200/50 bg-slate-50/30">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-1">
                  <Eye size={12} />
                  <span>Drag to add nodes</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {filteredNodes.length} available
                </Badge>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
