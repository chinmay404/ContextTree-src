"use client"

import { memo } from "react"
import { type EdgeProps, getBezierPath } from "reactflow"

function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const strokeWidth = selected ? 3 : style.strokeWidth || 1.5
  const strokeColor = style.stroke || "#3b82f6"
  const strokeDasharray = style.strokeDasharray || (selected ? "5 5" : "none")

  return (
    <>
      <path
        id={id}
        style={{
          ...style,
          strokeWidth,
          stroke: strokeColor,
          strokeDasharray,
          transition: "stroke-width 0.2s, stroke 0.2s, stroke-dasharray 0.2s",
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />

      {data?.label && (
        <g transform={`translate(${(sourceX + targetX) / 2}, ${(sourceY + targetY) / 2})`}>
          <rect
            x="-20"
            y="-10"
            width="40"
            height="20"
            rx="4"
            fill="var(--background)"
            stroke="var(--border)"
            strokeWidth="1"
            className="text-xs"
          />
          <text
            style={{ fill: "currentColor", fontSize: "10px" }}
            className="text-xs text-foreground"
            x="0"
            y="3"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {data.label}
          </text>
        </g>
      )}
    </>
  )
}

export default memo(CustomEdge)
