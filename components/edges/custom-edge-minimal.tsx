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

  // Ultra-minimal edge styling - barely visible by default
  const edgeStyle = {
    ...style,
    strokeWidth: isHovered ? 2 : selected ? 1.5 : 1,
    stroke: isHovered
      ? "#94a3b8" // slate-400 on hover
      : selected
      ? "#64748b" // slate-500 when selected
      : style.stroke || "#f1f5f9", // slate-100 - barely visible
    strokeOpacity: isHovered ? 1 : selected ? 1 : 0.3,
    filter:
      isHovered || selected
        ? "drop-shadow(0 1px 3px rgba(15, 23, 42, 0.08))"
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

      {/* Only show label on HOVER (not on selection) - completely hidden by default */}
      {label && isHovered && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "none",
            }}
            className="nodrag nopan"
          >
            {/* Minimal Edge Label - Small and Subtle - Only on Hover */}
            <div className="px-2.5 py-1 rounded-md backdrop-blur-sm font-medium text-[11px] bg-slate-900 text-white shadow-lg animate-in fade-in duration-150">
              {label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
