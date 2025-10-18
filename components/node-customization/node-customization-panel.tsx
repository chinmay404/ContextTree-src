"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  X,
  Palette,
  Type,
  Layers,
  Sparkles,
  Settings,
  Eye,
  RotateCcw,
  Save,
  Wand2,
} from "lucide-react";
import { ColorPicker } from "./color-picker";

interface NodeCustomizationPanelProps {
  nodeId: string;
  currentData: {
    label: string;
    color?: string;
    textColor?: string;
    dotColor?: string;
    borderRadius?: number;
    opacity?: number;
    size?: "small" | "medium" | "large";
    style?: "minimal" | "modern" | "glass" | "gradient";
  };
  onSave: (nodeId: string, data: any) => void;
  onClose: () => void;
}

const SIZE_OPTIONS = [
  { id: "small", label: "Small", width: 180, height: "auto" },
  { id: "medium", label: "Medium", width: 220, height: "auto" },
  { id: "large", label: "Large", width: 280, height: "auto" },
];

const STYLE_OPTIONS = [
  {
    id: "minimal",
    label: "Minimal",
    description: "Clean and simple",
    preview: "border border-slate-200 bg-white",
  },
  {
    id: "modern",
    label: "Modern",
    description: "Sleek with shadows",
    preview: "border-0 bg-white shadow-lg",
  },
  {
    id: "glass",
    label: "Glass",
    description: "Frosted glass effect",
    preview: "border border-white/20 bg-white/80 backdrop-blur-md",
  },
  {
    id: "gradient",
    label: "Gradient",
    description: "Vibrant gradients",
    preview: "border-0 bg-gradient-to-br from-blue-400 to-purple-500",
  },
];

export function NodeCustomizationPanel({
  nodeId,
  currentData,
  onSave,
  onClose,
}: NodeCustomizationPanelProps) {
  const [activeTab, setActiveTab] = useState<
    "appearance" | "layout" | "effects"
  >("appearance");
  const [formData, setFormData] = useState({
    label: currentData.label || "",
    color: currentData.color || "#f8fafc",
    textColor: currentData.textColor || "#1e293b",
    dotColor: currentData.dotColor || "#6366f1",
    borderRadius: currentData.borderRadius || 16,
    opacity: currentData.opacity || 100,
    size: currentData.size || "medium",
    style: currentData.style || "modern",
  });

  const [previewMode, setPreviewMode] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(nodeId, formData);
    onClose();
  };

  const handleReset = () => {
    setFormData({
      label: currentData.label || "",
      color: "#f8fafc",
      textColor: "#1e293b",
      dotColor: "#6366f1",
      borderRadius: 16,
      opacity: 100,
      size: "medium",
      style: "modern",
    });
  };

  const generateRandomTheme = () => {
    const themes = [
      { color: "#e0f2fe", textColor: "#0891b2", dotColor: "#06b6d4" },
      { color: "#f3e8ff", textColor: "#7c3aed", dotColor: "#8b5cf6" },
      { color: "#dcfce7", textColor: "#14532d", dotColor: "#16a34a" },
      { color: "#fed7aa", textColor: "#9a3412", dotColor: "#ea580c" },
      { color: "#fecaca", textColor: "#991b1b", dotColor: "#ef4444" },
    ];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    setFormData((prev) => ({ ...prev, ...randomTheme }));
  };

  const NodePreview = () => (
    <Card
      className={`w-48 h-28 relative overflow-hidden transition-all duration-300 ${
        formData.style === "glass" ? "backdrop-blur-md" : ""
      }`}
      style={{
        backgroundColor: formData.color,
        borderRadius: `${formData.borderRadius}px`,
        opacity: formData.opacity / 100,
        ...(formData.style === "gradient" && {
          background: `linear-gradient(135deg, ${formData.color}, ${formData.dotColor})`,
        }),
      }}
    >
      <div className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-6 h-6 rounded-full shadow-sm"
            style={{ backgroundColor: formData.dotColor }}
          />
          <div className="flex-1">
            <h4
              className="font-medium text-sm truncate"
              style={{ color: formData.textColor }}
            >
              {formData.label || "Sample Node"}
            </h4>
          </div>
        </div>
        <Badge
          className="text-xs"
          style={{
            backgroundColor: `${formData.dotColor}20`,
            color: formData.textColor,
          }}
        >
          Preview
        </Badge>
      </div>
    </Card>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[80vh] bg-white/95 backdrop-blur-md border-slate-200/80 shadow-2xl overflow-hidden">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-64 bg-slate-50/80 border-r border-slate-200/80 p-4 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-slate-600" />
                <span className="font-semibold text-slate-900">Customize</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl"
              >
                <X size={16} />
              </Button>
            </div>

            {/* Preview */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-700">
                  Preview
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewMode(!previewMode)}
                  className="text-xs"
                >
                  <Eye size={12} className="mr-1" />
                  {previewMode ? "Hide" : "Show"}
                </Button>
              </div>
              <div className="flex justify-center p-4 bg-slate-100/50 rounded-xl">
                <NodePreview />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2 mt-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={generateRandomTheme}
                className="w-full justify-start text-slate-700 border-slate-200 hover:bg-slate-100"
              >
                <Wand2 size={14} className="mr-2" />
                Random Theme
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="w-full justify-start text-slate-700 border-slate-200 hover:bg-slate-100"
              >
                <RotateCcw size={14} className="mr-2" />
                Reset
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200/80 bg-white/50">
              {[
                { id: "appearance", label: "Appearance", icon: Palette },
                { id: "layout", label: "Layout", icon: Layers },
                { id: "effects", label: "Effects", icon: Sparkles },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`px-6 py-4 flex items-center gap-2 transition-all duration-200 border-b-2 ${
                    activeTab === id
                      ? "border-slate-400 text-slate-900 bg-white/80"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50/50"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "appearance" && (
                <div className="space-y-6">
                  {/* Node Label */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <Type size={14} />
                      Node Label
                    </Label>
                    <Input
                      value={formData.label}
                      onChange={(e) =>
                        handleInputChange("label", e.target.value)
                      }
                      placeholder="Enter node label..."
                      className="bg-white border-slate-200 focus:border-slate-400 rounded-xl"
                    />
                  </div>

                  {/* Colors */}
                  <div className="space-y-3">
                    <ColorPicker
                      value={formData.color}
                      onChange={(color, textColor, dotColor) => {
                        setFormData((prev) => ({
                          ...prev,
                          color: color,
                          textColor: textColor || prev.textColor,
                          dotColor: dotColor || prev.dotColor,
                        }));
                      }}
                      label="Node Color Theme"
                      currentTextColor={formData.textColor}
                      currentDotColor={formData.dotColor}
                    />
                  </div>

                  {/* Style Options */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-slate-700">
                      Style
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {STYLE_OPTIONS.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => handleInputChange("style", style.id)}
                          className={`p-4 rounded-xl border-2 transition-all duration-200 text-left hover:scale-105 ${
                            formData.style === style.id
                              ? "border-slate-400 ring-2 ring-slate-300/50"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div
                            className={`w-full h-12 rounded-lg mb-2 ${style.preview}`}
                          />
                          <div className="font-medium text-sm text-slate-900">
                            {style.label}
                          </div>
                          <div className="text-xs text-slate-500">
                            {style.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "layout" && (
                <div className="space-y-6">
                  {/* Size Options */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-slate-700">
                      Size
                    </Label>
                    <div className="grid grid-cols-3 gap-3">
                      {SIZE_OPTIONS.map((size) => (
                        <button
                          key={size.id}
                          onClick={() => handleInputChange("size", size.id)}
                          className={`p-4 rounded-xl border-2 transition-all duration-200 text-center hover:scale-105 ${
                            formData.size === size.id
                              ? "border-slate-400 ring-2 ring-slate-300/50"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="font-medium text-sm text-slate-900">
                            {size.label}
                          </div>
                          <div className="text-xs text-slate-500">
                            {size.width}px
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Border Radius */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-slate-700">
                      Border Radius: {formData.borderRadius}px
                    </Label>
                    <Slider
                      value={[formData.borderRadius]}
                      onValueChange={([value]) =>
                        handleInputChange("borderRadius", value)
                      }
                      max={32}
                      min={0}
                      step={2}
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {activeTab === "effects" && (
                <div className="space-y-6">
                  {/* Opacity */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-slate-700">
                      Opacity: {formData.opacity}%
                    </Label>
                    <Slider
                      value={[formData.opacity]}
                      onValueChange={([value]) =>
                        handleInputChange("opacity", value)
                      }
                      max={100}
                      min={10}
                      step={5}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-200/80 bg-slate-50/30 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-slate-200 text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-slate-900 hover:bg-slate-800 text-white"
              >
                <Save size={14} className="mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
