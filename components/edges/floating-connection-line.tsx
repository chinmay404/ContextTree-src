import { getSmoothStepPath, type ConnectionLineComponentProps, type Node } from "reactflow";
import { getEdgeParams } from "./floating-utils";

export function FloatingConnectionLine({
  fromNode,
  toX,
  toY,
  fromPosition,
  toPosition,
  connectionLineStyle,
}: ConnectionLineComponentProps) {
  if (!fromNode) return null;

  const targetNode: Node = {
    id: "connection-target",
    position: { x: toX, y: toY },
    positionAbsolute: { x: toX, y: toY },
    width: 1,
    height: 1,
    data: {},
  };

  const edgeParams = getEdgeParams(fromNode, targetNode);

  const [edgePath] = getSmoothStepPath({
    sourceX: edgeParams.sx,
    sourceY: edgeParams.sy,
    sourcePosition: edgeParams.sourcePos ?? fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
    borderRadius: 24,
  });

  const stroke =
    (connectionLineStyle?.stroke as string | undefined) ?? "#94a3b8";
  const strokeWidth =
    (connectionLineStyle?.strokeWidth as number | undefined) ?? 2;

  return (
    <g>
      <path
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        d={edgePath}
      />
      <circle
        cx={toX}
        cy={toY}
        r={3}
        fill="#ffffff"
        stroke={stroke}
        strokeWidth={1.5}
      />
    </g>
  );
}
