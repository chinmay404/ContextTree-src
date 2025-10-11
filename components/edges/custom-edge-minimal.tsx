"use client";

import React, { useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "reactflow";

interface CustomEdgeMinimalData {
  label?: string;
  condition?: string;
  animated?: boolean;
}

export function CustomEdgeMinimal({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  selected,
  markerEnd,
}: EdgeProps<CustomEdgeMinimalData>) {
  const [isHovered, setIsHovered] = useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Minimal edge styling matching the slate design system
  const edgeStyle = {
    ...style,
    strokeWidth: selected || isHovered ? 3 : 2,
    stroke: selected 
      ? "#0f172a" // slate-900 for selected
      : isHovered 
      ? "#475569" // slate-600 for hover
      : style.stroke || "#cbd5e1", // slate-300 default
    strokeOpacity: 1,
    filter:
      selected || isHovered
        ? "drop-shadow(0 2px 8px rgba(15, 23, 42, 0.15))"
        : "none",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  };

  const label = data?.label || data?.condition || "";

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={edgeStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {label && (selected || isHovered) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            {/* Minimal Edge Label */}
            <div
              className={`
                px-3 py-1.5 rounded-lg backdrop-blur-sm font-medium text-xs
                transition-all duration-200
                ${
                  selected
                    ? "bg-slate-900 text-white shadow-lg scale-105"
                    : "bg-white text-slate-700 border border-slate-200 shadow-md"
                }
              `}
            >
              {label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
