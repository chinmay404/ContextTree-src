"use client"
import { Handle, Position, type NodeProps } from "reactflow"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bookmark, Edit3, Save } from "lucide-react"
import { useState } from "react"

interface CheckpointNodeData {
  label: string
  description: string
  version: string
  isSelected: boolean
  checkpointId?: string
  timestamp?: string
}

export function CheckpointNode({ data, selected }: NodeProps<CheckpointNodeData>) {
  const [isEditing, setIsEditing] = useState(false)
  const [editLabel, setEditLabel] = useState(data.label)
  const [editDescription, setEditDescription] = useState(data.description)

  return (
    <Card className={`min-w-[200px] max-w-[280px] ${selected ? "ring-2 ring-indigo-500" : ""}`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-indigo-500 border-2 border-background" />

      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-md bg-indigo-100 flex items-center justify-center">
            <Bookmark className="h-4 w-4 text-indigo-700" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-sm text-indigo-900">{data.label || "Checkpoint"}</h3>
            <Badge variant="secondary" className="text-xs bg-indigo-50 text-indigo-700">
              Checkpoint v{data.version || "1.0"}
            </Badge>
          </div>
          <div className="flex gap-1">
            <button className="p-1 hover:bg-indigo-50 rounded">
              <Save className="h-3 w-3 text-indigo-600" />
            </button>
            <button onClick={() => setIsEditing(!isEditing)} className="p-1 hover:bg-indigo-50 rounded">
              <Edit3 className="h-3 w-3 text-indigo-600" />
            </button>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <input
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              className="w-full text-xs p-2 border rounded"
              placeholder="Checkpoint name..."
              onBlur={() => setIsEditing(false)}
            />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full text-xs p-2 border rounded resize-none"
              rows={2}
              placeholder="Checkpoint description..."
            />
          </div>
        ) : (
          <div className="text-xs text-gray-700 bg-indigo-50 p-3 rounded border-l-3 border-indigo-300">
            <div className="font-medium mb-1">{data.label || "Unnamed Checkpoint"}</div>
            <div className="text-gray-600">{data.description || "Click edit to add description..."}</div>
          </div>
        )}

        <div className="mt-2 text-xs text-gray-500">
          <div>ID: {data.checkpointId || "checkpoint_" + Math.random().toString(36).substr(2, 6)}</div>
          {data.timestamp && <div>Saved: {data.timestamp}</div>}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-indigo-500 border-2 border-background" />
    </Card>
  )
}
