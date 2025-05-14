"use client"

import { memo } from "react"
import type { EdgeProps } from "reactflow"

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
  // Calculate control points for a more pronounced curve
  const midX = (sourceX + targetX) / 2
  const midY = (sourceY + targetY) / 2

  // Calculate the distance between source and target
  const dx = Math.abs(targetX - sourceX)
  const dy = Math.abs(targetY - sourceY)
  const distance = Math.sqrt(dx * dx + dy * dy)

  // Adjust the curvature based on distance
  const curveFactor = Math.min(0.5, Math.max(0.2, distance / 1000))

  // Calculate the offset for the control point
  const offsetX = (targetY - sourceY) * curveFactor
  const offsetY = (sourceX - targetX) * curveFactor

  // Create the path
  const path = `M${sourceX},${sourceY} C${sourceX + offsetX},${sourceY + offsetY} ${targetX - offsetX},${targetY - offsetY} ${targetX},${targetY}`

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
        d={path}
        markerEnd={markerEnd}
      />

      {data?.label && (
        <g transform={`translate(${midX}, ${midY})`}>
          <rect
            x="-25"
            y="-12"
            width="50"
            height="24"
            rx="6"
            fill="var(--background)"
            stroke="var(--border)"
            strokeWidth="1"
            className="text-xs"
          />
          <text
            style={{ fill: "currentColor", fontSize: "10px" }}
            className="text-xs text-foreground"
            x="0"
            y="4"
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
