"use client"
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "reactflow"
import { Badge } from "@/components/ui/badge"

interface ConditionalEdgeData {
  condition: string
  priority: number
  style: {
    stroke: string
    strokeWidth: number
    strokeDasharray?: string
  }
}

export function ConditionalEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<ConditionalEdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...data?.style,
          strokeWidth: selected ? (data?.style?.strokeWidth || 2) + 1 : data?.style?.strokeWidth || 2,
        }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          <Badge
            variant={selected ? "default" : "secondary"}
            className={`text-xs cursor-pointer hover:shadow-md transition-shadow ${
              selected ? "ring-2 ring-primary" : ""
            }`}
          >
            {data?.condition || "Condition"}
            {data?.priority && data.priority > 1 && <span className="ml-1 text-xs opacity-70">#{data.priority}</span>}
          </Badge>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
