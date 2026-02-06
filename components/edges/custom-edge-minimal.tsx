"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useStore,
  type EdgeProps,
} from "reactflow";
import { X } from "lucide-react";
import { getEdgeParams } from "./floating-utils";

interface CustomEdgeMinimalData {
  label?: string;
  condition?: string;
  animated?: boolean;
  baseColor?: string;
  highlightColor?: string;
  onDelete?: (edgeId: string) => void;
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
  animated,
  source,
  target,
}: EdgeProps<CustomEdgeMinimalData>) {
  const sourceNode = useStore((state) => state.nodeInternals.get(source));
  const targetNode = useStore((state) => state.nodeInternals.get(target));

  const edgeParams =
    sourceNode && targetNode
      ? getEdgeParams(sourceNode, targetNode)
      : null;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX: edgeParams?.sx ?? sourceX,
    sourceY: edgeParams?.sy ?? sourceY,
    sourcePosition: edgeParams?.sourcePos ?? sourcePosition,
    targetX: edgeParams?.tx ?? targetX,
    targetY: edgeParams?.ty ?? targetY,
    targetPosition: edgeParams?.targetPos ?? targetPosition,
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
  const canDelete = typeof data?.onDelete === "function";
  const showDelete = canDelete && selected;

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} />
      {(label || showDelete) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "none",
            }}
            className="nodrag nopan"
          >
            <div className="flex items-center gap-2">
              {label && (
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
              )}
              {showDelete && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    data?.onDelete?.(id);
                  }}
                  className="pointer-events-auto inline-flex h-6 w-6 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-600 shadow-sm transition-colors hover:border-rose-300 hover:text-rose-700"
                  title="Disconnect"
                  aria-label="Disconnect"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
