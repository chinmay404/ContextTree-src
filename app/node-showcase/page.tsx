"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Palette,
  Sparkles,
  Settings,
  Eye,
  Play,
  RotateCcw,
  Download,
  Share2,
  Zap,
} from "lucide-react";

// Mock node components for showcase (no ReactFlow dependencies)
import { EntryNodeShowcase } from "@/components/showcase/entry-node-showcase";
import { ContextNodeShowcase } from "@/components/showcase/context-node-showcase";
import { BranchNodeShowcase } from "@/components/showcase/branch-node-showcase";

const DEMO_THEMES = [
  {
    name: "Ocean Breeze",
    entry: { color: "#e0f2fe", textColor: "#0891b2", dotColor: "#06b6d4" },
    context: { color: "#cffafe", textColor: "#0e7490", dotColor: "#0891b2" },
    branch: { color: "#f0fdfa", textColor: "#134e4a", dotColor: "#059669" },
  },
  {
    name: "Purple Haze",
    entry: { color: "#f3e8ff", textColor: "#7c3aed", dotColor: "#8b5cf6" },
    context: { color: "#e9d5ff", textColor: "#6b21a8", dotColor: "#a855f7" },
    branch: { color: "#f5f3ff", textColor: "#5b21b6", dotColor: "#7c3aed" },
  },
  {
    name: "Forest Green",
    entry: { color: "#f0fdf4", textColor: "#14532d", dotColor: "#16a34a" },
    context: { color: "#dcfce7", textColor: "#15803d", dotColor: "#22c55e" },
    branch: { color: "#bbf7d0", textColor: "#166534", dotColor: "#059669" },
  },
  {
    name: "Sunset Glow",
    entry: { color: "#fef3c7", textColor: "#92400e", dotColor: "#f59e0b" },
    context: { color: "#fed7aa", textColor: "#9a3412", dotColor: "#ea580c" },
    branch: { color: "#fecaca", textColor: "#991b1b", dotColor: "#ef4444" },
  },
];

const STYLE_OPTIONS = ["minimal", "modern", "glass", "gradient"] as const;
const SIZE_OPTIONS = ["small", "medium", "large"] as const;

export default function NodeShowcasePage() {
  const [selectedTheme, setSelectedTheme] = useState(DEMO_THEMES[0]);
  const [nodeStyle, setNodeStyle] = useState<
    "minimal" | "modern" | "glass" | "gradient"
  >("modern");
  const [nodeSize, setNodeSize] = useState<"small" | "medium" | "large">(
    "medium"
  );
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [customColors, setCustomColors] = useState({
    entry: selectedTheme.entry,
    context: selectedTheme.context,
    branch: selectedTheme.branch,
  });

  const handleThemeChange = (theme: (typeof DEMO_THEMES)[0]) => {
    setSelectedTheme(theme);
    setCustomColors({
      entry: theme.entry,
      context: theme.context,
      branch: theme.branch,
    });
  };

  const exportTheme = () => {
    const themeData = {
      name: "Custom Theme",
      style: nodeStyle,
      size: nodeSize,
      colors: customColors,
    };

    const blob = new Blob([JSON.stringify(themeData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "node-theme.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Enhanced Node Components
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Beautiful, customizable, and interactive node components with smooth
            animations and modern design principles.
          </p>

          <div className="flex justify-center gap-4 mt-8">
            <Button
              onClick={() => setShowCustomizer(!showCustomizer)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Palette className="mr-2" size={16} />
              {showCustomizer ? "Hide" : "Show"} Customizer
            </Button>

            <Button
              variant="outline"
              onClick={() => setAnimationsEnabled(!animationsEnabled)}
            >
              <Sparkles className="mr-2" size={16} />
              {animationsEnabled ? "Disable" : "Enable"} Animations
            </Button>

            <Button variant="outline" onClick={exportTheme}>
              <Download className="mr-2" size={16} />
              Export Theme
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Customization Panel */}
          {showCustomizer && (
            <div className="lg:col-span-1">
              <Card className="p-6 bg-white/95 backdrop-blur-sm border-slate-200/80 shadow-lg sticky top-8">
                <div className="space-y-6">
                  {/* Theme Presets */}
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <Zap size={16} />
                      Theme Presets
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {DEMO_THEMES.map((theme) => (
                        <button
                          key={theme.name}
                          onClick={() => handleThemeChange(theme)}
                          className={`p-3 rounded-lg border-2 transition-all text-left hover:scale-105 ${
                            selectedTheme.name === theme.name
                              ? "border-blue-400 bg-blue-50"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="font-medium text-sm text-slate-900 mb-2">
                            {theme.name}
                          </div>
                          <div className="flex gap-1">
                            <div
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: theme.entry.color }}
                            />
                            <div
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: theme.context.color }}
                            />
                            <div
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: theme.branch.color }}
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Style Options */}
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <Settings size={16} />
                      Style
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {STYLE_OPTIONS.map((style) => (
                        <button
                          key={style}
                          onClick={() => setNodeStyle(style)}
                          className={`p-2 rounded-lg border-2 transition-all text-xs font-medium capitalize ${
                            nodeStyle === style
                              ? "border-blue-400 bg-blue-50 text-blue-700"
                              : "border-slate-200 hover:border-slate-300 text-slate-700"
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Size Options */}
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <Eye size={16} />
                      Size
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {SIZE_OPTIONS.map((size) => (
                        <button
                          key={size}
                          onClick={() => setNodeSize(size)}
                          className={`p-2 rounded-lg border-2 transition-all text-xs font-medium capitalize ${
                            nodeSize === size
                              ? "border-blue-400 bg-blue-50 text-blue-700"
                              : "border-slate-200 hover:border-slate-300 text-slate-700"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reset Button */}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedTheme(DEMO_THEMES[0]);
                      setNodeStyle("modern");
                      setNodeSize("medium");
                      setCustomColors({
                        entry: DEMO_THEMES[0].entry,
                        context: DEMO_THEMES[0].context,
                        branch: DEMO_THEMES[0].branch,
                      });
                    }}
                    className="w-full"
                  >
                    <RotateCcw className="mr-2" size={14} />
                    Reset to Defaults
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* Node Showcase */}
          <div className={showCustomizer ? "lg:col-span-3" : "lg:col-span-4"}>
            <div className="space-y-12">
              {/* Entry Node Section */}
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Entry Nodes
                  </h2>
                  <p className="text-slate-600">
                    Starting points for conversation flows with engaging
                    animations and clear indicators.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-center justify-items-center">
                  <div className="transform scale-110">
                    <EntryNodeShowcase
                      data={{
                        label: "Welcome Flow",
                        messageCount: 15,
                        isSelected: false,
                        model: "GPT-4",
                        metaTags: ["primary", "onboarding"],
                        primary: true,
                        ...customColors.entry,
                        style: nodeStyle,
                        size: nodeSize,
                      }}
                      selected={false}
                    />
                  </div>

                  <div className="transform scale-110">
                    <EntryNodeShowcase
                      data={{
                        label: "Support Chat",
                        messageCount: 8,
                        isSelected: true,
                        model: "GPT-3.5",
                        metaTags: ["support"],
                        ...customColors.entry,
                        style: nodeStyle,
                        size: nodeSize,
                      }}
                      selected={true}
                    />
                  </div>

                  <div className="transform scale-110">
                    <EntryNodeShowcase
                      data={{
                        label: "Quick Start",
                        messageCount: 3,
                        isSelected: false,
                        model: "Claude",
                        metaTags: ["tutorial", "guide"],
                        ...customColors.entry,
                        style: nodeStyle,
                        size: nodeSize,
                      }}
                      selected={false}
                    />
                  </div>
                </div>
              </div>

              {/* Context Node Section */}
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Context Nodes
                  </h2>
                  <p className="text-slate-600">
                    Data sources and knowledge bases with type indicators and
                    flow animations.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-center justify-items-center">
                  <div className="transform scale-110">
                    <ContextNodeShowcase
                      data={{
                        label: "User Profile",
                        messageCount: 25,
                        isSelected: false,
                        model: "Database",
                        metaTags: ["user", "profile", "data"],
                        dataType: "text",
                        contextSize: 2048,
                        ...customColors.context,
                        style: nodeStyle,
                        size: nodeSize,
                      }}
                      selected={false}
                    />
                  </div>

                  <div className="transform scale-110">
                    <ContextNodeShowcase
                      data={{
                        label: "Knowledge Base",
                        messageCount: 50,
                        isSelected: true,
                        model: "Vector DB",
                        metaTags: ["knowledge", "docs"],
                        dataType: "mixed",
                        contextSize: 8192,
                        ...customColors.context,
                        style: nodeStyle,
                        size: nodeSize,
                      }}
                      selected={true}
                    />
                  </div>

                  <div className="transform scale-110">
                    <ContextNodeShowcase
                      data={{
                        label: "Image Gallery",
                        messageCount: 12,
                        isSelected: false,
                        model: "Media",
                        metaTags: ["images", "media"],
                        dataType: "image",
                        contextSize: 4096,
                        ...customColors.context,
                        style: nodeStyle,
                        size: nodeSize,
                      }}
                      selected={false}
                    />
                  </div>
                </div>
              </div>

              {/* Branch Node Section */}
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Branch Nodes
                  </h2>
                  <p className="text-slate-600">
                    Decision points with path indicators and dynamic branching
                    animations.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-center justify-items-center">
                  <div className="transform scale-110">
                    <BranchNodeShowcase
                      data={{
                        label: "User Intent",
                        messageCount: 18,
                        isSelected: false,
                        model: "GPT-4",
                        metaTags: ["intent", "classification"],
                        branchCount: 3,
                        activeThreads: 2,
                        highlightTier: 1,
                        ...customColors.branch,
                        style: nodeStyle,
                        size: nodeSize,
                      }}
                      selected={false}
                    />
                  </div>

                  <div className="transform scale-110">
                    <BranchNodeShowcase
                      data={{
                        label: "Content Filter",
                        messageCount: 32,
                        isSelected: true,
                        model: "Classifier",
                        metaTags: ["filter", "safety"],
                        branchCount: 2,
                        activeThreads: 1,
                        highlightTier: 0,
                        ...customColors.branch,
                        style: nodeStyle,
                        size: nodeSize,
                      }}
                      selected={true}
                    />
                  </div>

                  <div className="transform scale-110">
                    <BranchNodeShowcase
                      data={{
                        label: "Response Type",
                        messageCount: 9,
                        isSelected: false,
                        model: "Router",
                        metaTags: ["routing", "type"],
                        branchCount: 4,
                        activeThreads: 3,
                        highlightTier: 2,
                        ...customColors.branch,
                        style: nodeStyle,
                        size: nodeSize,
                      }}
                      selected={false}
                    />
                  </div>
                </div>
              </div>

              {/* Features Section */}
              <div className="mt-16">
                <Card className="p-8 bg-white/95 backdrop-blur-sm border-slate-200/80 shadow-lg">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">
                    Enhanced Features
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Sparkles className="text-blue-600" size={20} />
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-2">
                        Smooth Animations
                      </h3>
                      <p className="text-sm text-slate-600">
                        Fluid transitions and engaging micro-interactions
                      </p>
                    </div>

                    <div className="text-center">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Palette className="text-purple-600" size={20} />
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-2">
                        Full Customization
                      </h3>
                      <p className="text-sm text-slate-600">
                        Colors, styles, sizes, and effects - all configurable
                      </p>
                    </div>

                    <div className="text-center">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Settings className="text-green-600" size={20} />
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-2">
                        Smart Interactions
                      </h3>
                      <p className="text-sm text-slate-600">
                        Context-aware hover states and click feedback
                      </p>
                    </div>

                    <div className="text-center">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Eye className="text-orange-600" size={20} />
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-2">
                        Visual Feedback
                      </h3>
                      <p className="text-sm text-slate-600">
                        Clear status indicators and progress visualization
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
