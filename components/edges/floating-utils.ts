import { Position, type Node, type XYPosition } from "reactflow";

type NodeRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const getNodeRect = (node: Node): NodeRect => {
  const measured = (node as any).measured as { width?: number; height?: number } | undefined;
  const width = node.width ?? measured?.width ?? 0;
  const height = node.height ?? measured?.height ?? 0;
  const position = node.positionAbsolute ?? node.position;

  return {
    x: position.x,
    y: position.y,
    width,
    height,
  };
};

export const getNodeIntersection = (
  intersectionNode: Node,
  targetNode: Node
): XYPosition => {
  const intersectionRect = getNodeRect(intersectionNode);
  const targetRect = getNodeRect(targetNode);

  if (!intersectionRect.width || !intersectionRect.height) {
    return { x: intersectionRect.x, y: intersectionRect.y };
  }

  const w = intersectionRect.width / 2;
  const h = intersectionRect.height / 2;

  const x2 = intersectionRect.x + w;
  const y2 = intersectionRect.y + h;
  const x1 = targetRect.x + w;
  const y1 = targetRect.y + h;

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1));
  const xx3 = a * xx1;
  const yy3 = a * yy1;

  return {
    x: w * (xx3 + yy3) + x2,
    y: h * (-xx3 + yy3) + y2,
  };
};

export const getEdgePosition = (
  node: Node,
  intersectionPoint: XYPosition
): Position => {
  const rect = getNodeRect(node);

  if (!rect.width || !rect.height) {
    return Position.Top;
  }

  const nx = Math.round(rect.x);
  const ny = Math.round(rect.y);
  const px = Math.round(intersectionPoint.x);
  const py = Math.round(intersectionPoint.y);

  if (px <= nx + 1) return Position.Left;
  if (px >= nx + rect.width - 1) return Position.Right;
  if (py <= ny + 1) return Position.Top;
  if (py >= ny + rect.height - 1) return Position.Bottom;
  return Position.Top;
};

export const getEdgeParams = (source: Node, target: Node) => {
  const sourceIntersectionPoint = getNodeIntersection(source, target);
  const targetIntersectionPoint = getNodeIntersection(target, source);

  const sourcePos = getEdgePosition(source, sourceIntersectionPoint);
  const targetPos = getEdgePosition(target, targetIntersectionPoint);

  return {
    sx: sourceIntersectionPoint.x,
    sy: sourceIntersectionPoint.y,
    tx: targetIntersectionPoint.x,
    ty: targetIntersectionPoint.y,
    sourcePos,
    targetPos,
  };
};
