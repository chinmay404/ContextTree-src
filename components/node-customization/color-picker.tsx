"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Palette, Eye, Sparkles, Settings } from "lucide-react";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  showPreview?: boolean;
}

const COLOR_PRESETS = [
  // Cool Blues
  { name: "Ocean Blue", color: "#e0f2fe", text: "#0891b2", dot: "#06b6d4" },
  { name: "Sky Blue", color: "#dbeafe", text: "#1d4ed8", dot: "#3b82f6" },
  { name: "Midnight", color: "#1e293b", text: "#cbd5e1", dot: "#64748b" },
  
  // Warm Purples
  { name: "Lavender", color: "#f3e8ff", text: "#7c3aed", dot: "#8b5cf6" },
  { name: "Royal Purple", color: "#e9d5ff", text: "#6b21a8", dot: "#a855f7" },
  { name: "Deep Purple", color: "#581c87", text: "#e9d5ff", dot: "#c084fc" },
  
  // Fresh Greens
  { name: "Mint", color: "#dcfce7", text: "#14532d", dot: "#16a34a" },
  { name: "Emerald", color: "#d1fae5", text: "#065f46", dot: "#10b981" },
  { name: "Forest", color: "#14532d", text: "#dcfce7", dot: "#22c55e" },
  
  // Warm Oranges
  { name: "Sunset", color: "#fed7aa", text: "#9a3412", dot: "#ea580c" },
  { name: "Amber", color: "#fef3c7", text: "#92400e", dot: "#f59e0b" },
  { name: "Peach", color: "#fecaca", text: "#991b1b", dot: "#ef4444" },
  
  // Elegant Grays
  { name: "Silver", color: "#f8fafc", text: "#334155", dot: "#64748b" },
  { name: "Charcoal", color: "#374151", text: "#f9fafb", dot: "#9ca3af" },
  { name: "Slate", color: "#e2e8f0", text: "#1e293b", dot: "#475569" },
];

const GRADIENT_PRESETS = [
  { name: "Ocean", gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { name: "Sunset", gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
  { name: "Forest", gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
  { name: "Aurora", gradient: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)" },
  { name: "Cosmic", gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { name: "Fire", gradient: "linear-gradient(135deg, #ff9a56 0%, #ffad56 100%)" },
];

export function ColorPicker({ value, onChange, label = "Color", showPreview = true }: ColorPickerProps) {
  const [activeTab, setActiveTab] = useState<"presets" | "gradients" | "custom">("presets");
  const [customColor, setCustomColor] = useState(value);

  const handlePresetSelect = (preset: typeof COLOR_PRESETS[0]) => {
    onChange(preset.color);
  };

  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
    onChange(color);
  };

  return (
    <Card className="w-full p-4 bg-white/95 backdrop-blur-sm border-slate-200/80 shadow-lg">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-slate-600" />
            <span className="font-medium text-slate-800">{label}</span>
          </div>
          {showPreview && (
            <div className="flex items-center gap-2">
              <Eye size={14} className="text-slate-500" />
              <div 
                className="w-6 h-6 rounded-lg border-2 border-white shadow-md"
                style={{ backgroundColor: value }}
              />
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
          {[
            { id: "presets", label: "Themes", icon: Sparkles },
            { id: "gradients", label: "Gradients", icon: Settings },
            { id: "custom", label: "Custom", icon: Palette },
          ].map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={activeTab === id ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(id as any)}
              className={`flex-1 text-xs transition-all duration-200 ${
                activeTab === id
                  ? "bg-white shadow-sm text-slate-900"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Icon size={14} className="mr-1" />
              {label}
            </Button>
          ))}
        </div>

        {/* Content */}
        <div className="min-h-[200px]">
          {activeTab === "presets" && (
            <div className="grid grid-cols-3 gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePresetSelect(preset)}
                  className={`group relative h-20 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                    value === preset.color
                      ? "border-slate-400 ring-2 ring-slate-300/50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                  style={{ backgroundColor: preset.color }}
                >
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
                  <div className="absolute bottom-1 left-1 right-1">
                    <Badge
                      variant="secondary"
                      className="text-xs bg-white/90 text-slate-700 border-0 shadow-sm"
                    >
                      {preset.name}
                    </Badge>
                  </div>
                  <div 
                    className="absolute top-2 right-2 w-3 h-3 rounded-full border border-white/50"
                    style={{ backgroundColor: preset.dot }}
                  />
                </button>
              ))}
            </div>
          )}

          {activeTab === "gradients" && (
            <div className="grid grid-cols-2 gap-3">
              {GRADIENT_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => onChange(preset.gradient)}
                  className="group relative h-24 rounded-xl border-2 border-slate-200 hover:border-slate-300 transition-all duration-200 hover:scale-105 overflow-hidden"
                  style={{ background: preset.gradient }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/10" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <Badge
                      variant="secondary"
                      className="text-xs bg-white/90 text-slate-700 border-0 shadow-sm w-full justify-center"
                    >
                      {preset.name}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}

          {activeTab === "custom" && (
            <div className="space-y-4">
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => handleCustomColorChange(e.target.value)}
                  className="w-16 h-16 border-2 border-slate-200 rounded-xl cursor-pointer shadow-md"
                />
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Color Value
                  </label>
                  <input
                    type="text"
                    value={customColor}
                    onChange={(e) => handleCustomColorChange(e.target.value)}
                    placeholder="#ffffff"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300/50"
                  />
                </div>
              </div>
              
              {/* Quick Custom Colors */}
              <div className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Recent Colors</span>
                <div className="flex gap-2 flex-wrap">
                  {["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#feca57", "#ff9ff3", "#54a0ff", "#5f27cd"].map((color) => (
                    <button
                      key={color}
                      onClick={() => handleCustomColorChange(color)}
                      className="w-8 h-8 rounded-lg border-2 border-white shadow-md hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
