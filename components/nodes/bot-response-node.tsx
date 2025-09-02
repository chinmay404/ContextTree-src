"use client"
import { Handle, Position, type NodeProps } from "reactflow"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bot, Edit3, Zap } from "lucide-react"
import { useState } from "react"

interface BotResponseNodeData {
  label: string
  content: string
  model: string
  isSelected: boolean
  responseId?: string
  expectedResponse?: string
}

export function BotResponseNode({ data, selected }: NodeProps<BotResponseNodeData>) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(data.expectedResponse || "")

  return (
    <Card className={`min-w-[220px] max-w-[300px] ${selected ? "ring-2 ring-purple-500" : ""}`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-purple-500 border-2 border-background" />

      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-md bg-purple-100 flex items-center justify-center">
            <Bot className="h-4 w-4 text-purple-700" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-sm text-purple-900">{data.label || "Bot Response"}</h3>
            <div className="flex gap-1">
              <Badge variant="secondary" className="text-xs bg-purple-50 text-purple-700">
                Bot Response
              </Badge>
              <Badge variant="outline" className="text-xs border-purple-200 text-purple-600">
                {data.model || "GPT-4"}
              </Badge>
            </div>
          </div>
          <button onClick={() => setIsEditing(!isEditing)} className="p-1 hover:bg-purple-50 rounded">
            <Edit3 className="h-3 w-3 text-purple-600" />
          </button>
        </div>

        {isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full text-xs p-2 border rounded resize-none"
            rows={3}
            placeholder="Expected bot response or instructions..."
            onBlur={() => setIsEditing(false)}
            autoFocus
          />
        ) : (
          <div className="text-xs text-gray-700 bg-purple-50 p-3 rounded border-l-3 border-purple-300 min-h-[60px]">
            {data.expectedResponse || data.content || "Click edit to define expected response..."}
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Zap className="h-3 w-3" />
            <span>AI Generated</span>
          </div>
          <div className="text-xs text-gray-500">
            ID: {data.responseId || "bot_" + Math.random().toString(36).substr(2, 6)}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-purple-500 border-2 border-background" />
    </Card>
  )
}
