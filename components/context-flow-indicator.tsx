"use client"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Database, FileText, Brain, Clock } from "lucide-react"

interface ContextFlowIndicatorProps {
  connections: Array<{
    contextNodeId: string
    type: "system" | "rag" | "memory" | "custom"
    priority: number
    isActive: boolean
  }>
  className?: string
}

export function ContextFlowIndicator({ connections, className = "" }: ContextFlowIndicatorProps) {
  const getContextIcon = (type: string) => {
    switch (type) {
      case "system":
        return <FileText className="h-3 w-3" />
      case "rag":
        return <Database className="h-3 w-3" />
      case "memory":
        return <Brain className="h-3 w-3" />
      default:
        return <Clock className="h-3 w-3" />
    }
  }

  const getContextColor = (type: string) => {
    switch (type) {
      case "system":
        return "bg-orange-100 text-orange-700 border-orange-200"
      case "rag":
        return "bg-green-100 text-green-700 border-green-200"
      case "memory":
        return "bg-blue-100 text-blue-700 border-blue-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  if (connections.length === 0) {
    return <div className={`text-xs text-gray-500 ${className}`}>No context connections</div>
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="text-xs font-medium text-gray-700 mb-2">Context Flow ({connections.length} sources)</div>
      {connections
        .sort((a, b) => a.priority - b.priority)
        .map((connection, index) => (
          <div key={connection.contextNodeId} className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-xs ${getContextColor(connection.type)} ${!connection.isActive ? "opacity-50" : ""}`}
            >
              {getContextIcon(connection.type)}
              <span className="ml-1">{connection.type}</span>
            </Badge>
            <ArrowRight className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-600">Priority {connection.priority}</span>
          </div>
        ))}
    </div>
  )
}
