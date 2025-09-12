"use client";
import { Handle, Position, type NodeProps } from "reactflow";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Edit3, Thermometer, Zap, Eye } from "lucide-react";
import { useState } from "react";
import { MODEL_PROVIDERS, getDefaultModel } from "@/lib/models";

interface LLMCallNodeData {
  label: string;
  model: string;
  temperature: number;
  maxTokens: number;
  isSelected: boolean;
  callId?: string;
  connectedContexts?: string[];
}

export function LLMCallNode({ data, selected }: NodeProps<LLMCallNodeData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [model, setModel] = useState(data.model || getDefaultModel());
  const [temperature, setTemperature] = useState(data.temperature || 0.7);
  const [maxTokens, setMaxTokens] = useState(data.maxTokens || 1000);

  return (
    <Card
      className={`min-w-[240px] max-w-[320px] ${
        selected ? "ring-2 ring-red-500" : ""
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-red-500 border-2 border-background"
      />

      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-md bg-red-100 flex items-center justify-center">
            <Settings className="h-4 w-4 text-red-700" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-sm text-red-900">
              {data.label || "LLM Call"}
            </h3>
            <div className="flex gap-1">
              <Badge
                variant="secondary"
                className="text-xs bg-red-50 text-red-700"
              >
                LLM Call
              </Badge>
              <Badge
                variant="outline"
                className="text-xs border-red-200 text-red-600"
              >
                {model}
              </Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setShowPromptPreview(!showPromptPreview)}
              className="p-1 hover:bg-red-50 rounded"
              title="Preview assembled prompt"
            >
              <Eye className="h-3 w-3 text-red-600" />
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-1 hover:bg-red-50 rounded"
            >
              <Edit3 className="h-3 w-3 text-red-600" />
            </button>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-700">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full text-xs p-2 border rounded mt-1"
              >
                <optgroup label="🔥 Popular & Recommended">
                  {MODEL_PROVIDERS.top.models.map((modelItem) => (
                    <option key={modelItem.id} value={modelItem.id}>
                      {modelItem.name}
                    </option>
                  ))}
                </optgroup>
                
                {Object.entries(MODEL_PROVIDERS).filter(([key]) => key !== 'top').map(([key, provider]) => (
                  <optgroup key={key} label={provider.name}>
                    {provider.models.map((modelItem) => (
                      <option key={modelItem.id} value={modelItem.id}>
                        {modelItem.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-700">
                  Temperature
                </label>
                <input
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) =>
                    setTemperature(Number.parseFloat(e.target.value))
                  }
                  className="w-full text-xs p-2 border rounded mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">
                  Max Tokens
                </label>
                <input
                  type="number"
                  min="1"
                  max="4000"
                  value={maxTokens}
                  onChange={(e) =>
                    setMaxTokens(Number.parseInt(e.target.value))
                  }
                  className="w-full text-xs p-2 border rounded mt-1"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-700 bg-red-50 p-3 rounded border-l-3 border-red-300">
            <div className="flex items-center gap-2 mb-2">
              <Thermometer className="h-3 w-3" />
              <span>Temp: {temperature}</span>
              <Zap className="h-3 w-3" />
              <span>Max: {maxTokens}</span>
            </div>
            <div className="text-gray-600">
              Connected contexts: {data.connectedContexts?.length || 0}
            </div>
          </div>
        )}

        {showPromptPreview && (
          <div className="mt-3 text-xs bg-gray-50 p-3 rounded border max-h-32 overflow-y-auto">
            <div className="font-medium mb-1">Assembled Prompt Preview:</div>
            <div className="text-gray-600 whitespace-pre-wrap">
              System: You are a helpful assistant...{"\n"}
              Context: [Connected context data will appear here]{"\n"}
              User: [Previous conversation history]
            </div>
          </div>
        )}

        <div className="mt-2 text-xs text-gray-500">
          ID: {data.callId || "llm_" + Math.random().toString(36).substr(2, 6)}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-red-500 border-2 border-background"
      />
    </Card>
  );
}
