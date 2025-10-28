"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "reactflow";

interface CustomEdgeMinimalData {
  label?: string;
  condition?: string;
  animated?: boolean;
  baseColor?: string;
  highlightColor?: string;
}

export function CustomEdgeMinimal({
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
  animated,
}: EdgeProps<CustomEdgeMinimalData>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 24,
  });

  const strokeColor = (style.stroke as string | undefined) || "#94a3b8";
  const isAnimated = animated || data?.animated;
  const edgeStyle = {
    ...style,
    stroke: strokeColor,
    strokeWidth: selected ? 2.6 : isAnimated ? 2.2 : 1.6,
    opacity: selected ? 1 : isAnimated ? 0.96 : 0.88,
    strokeLinecap: "round",
    ...(isAnimated
      ? {
          strokeDasharray: "14 10",
          animation: "dashMove 1s linear infinite",
        }
      : {}),
  };

  const label = data?.label || data?.condition;
  const labelHighlight = data?.highlightColor || strokeColor;

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "none",
            }}
            className="nodrag nopan"
          >
            <div
              className={`rounded border bg-white px-2 py-1 text-[11px] font-medium text-slate-600 shadow-sm ${
                isAnimated
                  ? "border-blue-200/80 text-slate-700 shadow"
                  : "border-slate-200"
              }`}
              style={
                isAnimated
                  ? {
                      boxShadow: "0 4px 12px rgba(59, 130, 246, 0.08)",
                      borderColor: `${labelHighlight}33`,
                    }
                  : undefined
              }
            >
              {label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
