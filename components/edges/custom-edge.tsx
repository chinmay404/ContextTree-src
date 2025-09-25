"use client";

import React, { useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  MarkerType,
} from "reactflow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Zap } from "lucide-react";

interface CustomEdgeData {
  label?: string;
  condition?: string;
  animated?: boolean;
  onEdit?: (edgeId: string) => void;
  onDelete?: (edgeId: string) => void;
}

export function CustomEdge({
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
}: EdgeProps<CustomEdgeData>) {
  const [isHovered, setIsHovered] = useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeStyle = {
    ...style,
    strokeWidth: selected || isHovered ? 3 : 2,
    stroke: selected ? "#6366f1" : style.stroke || "#94a3b8",
    strokeOpacity: selected || isHovered ? 1 : 0.8,
    filter:
      selected || isHovered
        ? "drop-shadow(0 0 6px rgba(99, 102, 241, 0.4))"
        : "none",
    transition: "all 0.2s ease",
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

      {(label || selected || isHovered) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 12,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            {/* Edge Label */}
            {label && (
              <Badge
                variant={selected ? "default" : "secondary"}
                className={`
                  mb-2 cursor-pointer transition-all duration-200 font-semibold
                  bg-white/95 backdrop-blur-sm border-2 shadow-md
                  ${selected || isHovered ? "shadow-lg scale-105 border-blue-300" : "shadow-sm border-gray-300"}
                  ${selected ? "ring-2 ring-indigo-200 bg-blue-50 text-blue-700" : "text-gray-700"}
                  hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300
                `}
              >
                {selected || isHovered ? (
                  <Zap size={12} className="mr-1" />
                ) : null}
                {label}
              </Badge>
            )}

            {/* Edge Actions (show on selection or hover) */}
            {(selected || isHovered) && (
              <div
                className={`
                flex gap-1 bg-white/95 backdrop-blur-sm border border-gray-200 
                rounded-lg shadow-lg p-1 transition-all duration-200
                ${
                  selected || isHovered
                    ? "opacity-100 scale-100"
                    : "opacity-0 scale-95"
                }
              `}
              >
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => data?.onEdit?.(id)}
                  className="h-6 w-6 p-0 hover:bg-blue-50 hover:text-blue-600"
                >
                  <Edit2 size={12} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => data?.onDelete?.(id)}
                  className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={12} />
                </Button>
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
