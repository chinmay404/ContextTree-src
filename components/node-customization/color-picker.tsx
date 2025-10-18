"use client";

import { useState } from "react";
import { Check } from "lucide-react";

interface ColorPickerProps {
  value: string;
  onChange: (color: string, textColor?: string, dotColor?: string) => void;
  label?: string;
  currentTextColor?: string;
  currentDotColor?: string;
}

const COLOR_PRESETS = [
  // Ultra-Minimal Grays - Default aesthetic
  { name: "Pearl", color: "#fafafa", text: "#1e293b", dot: "#94a3b8" },
  { name: "Silk", color: "#f8fafc", text: "#334155", dot: "#64748b" },
  { name: "Mist", color: "#f1f5f9", text: "#1e293b", dot: "#475569" },

  // Subtle Blues
  { name: "Ice", color: "#f0f9ff", text: "#0c4a6e", dot: "#0ea5e9" },
  { name: "Sky", color: "#e0f2fe", text: "#075985", dot: "#0284c7" },

  // Soft Purples
  { name: "Lavender", color: "#faf5ff", text: "#581c87", dot: "#9333ea" },
  { name: "Violet", color: "#f3e8ff", text: "#6b21a8", dot: "#a855f7" },

  // Gentle Greens
  { name: "Mint", color: "#f0fdf4", text: "#14532d", dot: "#22c55e" },
  { name: "Sage", color: "#dcfce7", text: "#166534", dot: "#16a34a" },

  // Warm Neutrals
  { name: "Cream", color: "#fffbeb", text: "#78350f", dot: "#f59e0b" },
  { name: "Sand", color: "#fef3c7", text: "#92400e", dot: "#eab308" },

  // Soft Rose
  { name: "Blush", color: "#fef2f2", text: "#881337", dot: "#f43f5e" },
  { name: "Rose", color: "#ffe4e6", text: "#9f1239", dot: "#fb7185" },
];

export function ColorPicker({
  value,
  onChange,
  label = "Node Color",
  currentTextColor,
  currentDotColor,
}: ColorPickerProps) {
  const [selectedPreset, setSelectedPreset] = useState<
    (typeof COLOR_PRESETS)[0] | null
  >(COLOR_PRESETS.find((p) => p.color === value) || null);

  const handlePresetSelect = (preset: (typeof COLOR_PRESETS)[0]) => {
    setSelectedPreset(preset);
    onChange(preset.color, preset.text, preset.dot);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {selectedPreset && (
          <span className="text-xs text-slate-500">{selectedPreset.name}</span>
        )}
      </div>

      {/* Color Grid */}
      <div className="grid grid-cols-4 gap-2">
        {COLOR_PRESETS.map((preset) => {
          const isSelected = selectedPreset?.name === preset.name;

          return (
            <button
              key={preset.name}
              onClick={() => handlePresetSelect(preset)}
              className="group relative"
              title={preset.name}
            >
              {/* Color swatch */}
              <div
                className={`
                  aspect-square rounded-lg border-2 transition-all duration-200
                  ${
                    isSelected
                      ? "border-slate-400 shadow-md scale-105"
                      : "border-slate-200 hover:border-slate-300 hover:scale-105"
                  }
                `}
                style={{ backgroundColor: preset.color }}
              >
                {/* Check mark for selected */}
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: preset.dot }}
                    >
                      <Check size={12} className="text-white" />
                    </div>
                  </div>
                )}

                {/* Hover preview - shows dot color */}
                {!isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: preset.dot }}
                    />
                  </div>
                )}
              </div>

              {/* Name label on hover */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <span className="text-[10px] text-slate-600 whitespace-nowrap bg-white/90 px-1.5 py-0.5 rounded shadow-sm">
                  {preset.name}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Preview */}
      {selectedPreset && (
        <div className="pt-2 mt-2 border-t border-slate-100">
          <div className="text-xs text-slate-500 mb-2">Preview</div>
          <div
            className="rounded-lg p-3 border border-slate-200/50"
            style={{ backgroundColor: selectedPreset.color }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: selectedPreset.dot }}
              />
              <span
                className="text-sm font-medium"
                style={{ color: selectedPreset.text }}
              >
                Sample Node
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
