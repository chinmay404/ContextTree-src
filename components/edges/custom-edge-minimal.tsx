"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  type Edge,
  getSmoothStepPath,
  useInternalNode,
  type EdgeProps,
} from "@xyflow/react";
import { X } from "lucide-react";
import { getEdgeParams } from "./floating-utils";

interface CustomEdgeMinimalData {
  label?: string;
  condition?: string;
  animated?: boolean;
  onDelete?: (edgeId: string) => void;
  [key: string]: unknown;
}

type CustomEdgeType = Edge<CustomEdgeMinimalData, "custom">;

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
}: EdgeProps<CustomEdgeType>) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  const edgeParams =
    sourceNode && targetNode ? getEdgeParams(sourceNode, targetNode) : null;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX: edgeParams?.sx ?? sourceX,
    sourceY: edgeParams?.sy ?? sourceY,
    sourcePosition: edgeParams?.sourcePos ?? sourcePosition,
    targetX: edgeParams?.tx ?? targetX,
    targetY: edgeParams?.ty ?? targetY,
    targetPosition: edgeParams?.targetPos ?? targetPosition,
    borderRadius: 20,
  });

  const strokeColor = (style.stroke as string | undefined) || "#cbd5e1";
  const isAnimated = animated || data?.animated;

  const edgeStyle = {
    ...style,
    stroke: strokeColor,
    strokeWidth: selected ? 2.2 : isAnimated ? 1.8 : 1.35,
    opacity: selected ? 0.96 : 0.82,
    strokeLinecap: "round" as const,
    ...(isAnimated
      ? { strokeDasharray: "7 9", animation: "dashMove 1.6s linear infinite" }
      : {}),
  };

  const label = data?.label || data?.condition;
  const showDelete = typeof data?.onDelete === "function" && selected;

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
            <div className="flex items-center gap-1.5">
              {label && (
                <span className="rounded-full border border-slate-800 bg-slate-900/90 px-2.5 py-1 text-[10px] font-medium text-white shadow-lg backdrop-blur-sm">
                  {label}
                </span>
              )}
              {showDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    data?.onDelete?.(id);
                  }}
                  className="pointer-events-auto inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-lg hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500"
                  aria-label="Disconnect"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
