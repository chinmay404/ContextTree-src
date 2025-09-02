"use client"
import { Handle, Position, type NodeProps } from "reactflow"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Edit3 } from "lucide-react"
import { useState } from "react"

interface UserMessageNodeData {
  label: string
  content: string
  isSelected: boolean
  messageId?: string
}

export function UserMessageNode({ data, selected }: NodeProps<UserMessageNodeData>) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(data.content)

  return (
    <Card className={`min-w-[220px] max-w-[300px] ${selected ? "ring-2 ring-blue-500" : ""}`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-blue-500 border-2 border-background" />

      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center">
            <MessageSquare className="h-4 w-4 text-blue-700" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-sm text-blue-900">{data.label || "User Input"}</h3>
            <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700">
              User Message
            </Badge>
          </div>
          <button onClick={() => setIsEditing(!isEditing)} className="p-1 hover:bg-blue-50 rounded">
            <Edit3 className="h-3 w-3 text-blue-600" />
          </button>
        </div>

        {isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full text-xs p-2 border rounded resize-none"
            rows={3}
            placeholder="Enter user message..."
            onBlur={() => setIsEditing(false)}
            autoFocus
          />
        ) : (
          <div className="text-xs text-gray-700 bg-blue-50 p-3 rounded border-l-3 border-blue-300 min-h-[60px]">
            {data.content || "Click edit to add user message content..."}
          </div>
        )}

        <div className="mt-2 text-xs text-gray-500">
          ID: {data.messageId || "user_msg_" + Math.random().toString(36).substr(2, 6)}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500 border-2 border-background" />
    </Card>
  )
}
