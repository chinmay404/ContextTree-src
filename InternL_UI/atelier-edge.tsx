"use client";

/**
 * AtelierEdge
 * ----------------------------------------------------------------------------
 * Custom edge for ContextTree — moss for main thread, amber for branches,
 * indigo for context. Curved (bezier), with a pencil-draw animation on
 * mount and a flowing dot while streaming.
 *
 * Usage in canvas-area.tsx:
 *   import { AtelierEdge } from "@/components/edges/atelier-edge";
 *   const edgeTypes = { custom: AtelierEdge };
 *
 * And when creating edges, pass edgeType in the data:
 *   { ..., type: "custom", data: { edgeType: "branch" | "main" | "context" } }
 */

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";

type EdgeKind = "main" | "branch" | "context";

interface AtelierEdgeData {
  edgeType?: EdgeKind;
  label?: string;
  streaming?: boolean;
  muted?: boolean;
  [key: string]: unknown;
}

const EDGE_STYLES: Record<
  EdgeKind,
  {
    stroke: string;
    strokeWidth: number;
    strokeDasharray?: string;
    glow: string;
  }
> = {
  main: {
    stroke: "#2D5F3F",
    strokeWidth: 1.5,
    glow: "rgba(45, 95, 63, 0.35)",
  },
  branch: {
    stroke: "#C97B2F",
    strokeWidth: 1.5,
    strokeDasharray: "6 3",
    glow: "rgba(201, 123, 47, 0.35)",
  },
  context: {
    stroke: "#4338CA",
    strokeWidth: 1,
    strokeDasharray: "2 3",
    glow: "rgba(67, 56, 202, 0.3)",
  },
};

function AtelierEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps) {
  const edgeData = (data || {}) as AtelierEdgeData;
  const kind: EdgeKind = edgeData.edgeType ?? "main";
  const style = EDGE_STYLES[kind];
  const muted = !!edgeData.muted;
  const streaming = !!edgeData.streaming;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.3,
  });

  const effectiveStroke = muted ? "rgba(10, 14, 26, 0.2)" : style.stroke;
  const effectiveWidth = selected
    ? style.strokeWidth + 1
    : style.strokeWidth;
  const effectiveDash = muted ? undefined : style.strokeDasharray;

  return (
    <>
      {/* Subtle glow underlay when selected */}
      {selected && !muted && (
        <path
          d={edgePath}
          stroke={style.glow}
          strokeWidth={8}
          fill="none"
          style={{
            filter: "blur(4px)",
          }}
        />
      )}

      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: effectiveStroke,
          strokeWidth: effectiveWidth,
          strokeDasharray: effectiveDash,
          opacity: muted ? 0.6 : 1,
          transition: "all 200ms cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "none",
        }}
      />

      {/* Flow dot animation while streaming */}
      {streaming && !muted && (
        <circle r={3} fill={style.stroke}>
          <animateMotion dur="1.4s" repeatCount="indefinite" path={edgePath} />
          <animate
            attributeName="opacity"
            values="0;1;1;0"
            keyTimes="0;0.1;0.9;1"
            dur="1.4s"
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* Optional edge label */}
      {edgeData.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
              background: "var(--at-paper)",
              border: "1px solid var(--at-paper-edge)",
              borderRadius: "var(--at-radius-sm)",
              padding: "2px 7px",
              fontFamily: "var(--at-font-serif)",
              fontStyle: "italic",
              fontSize: 10.5,
              color: style.stroke,
              boxShadow: "var(--at-shadow-sm)",
              whiteSpace: "nowrap",
            }}
            className="nodrag nopan"
          >
            {edgeData.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const AtelierEdge = memo(AtelierEdgeComponent);
AtelierEdge.displayName = "AtelierEdge";
