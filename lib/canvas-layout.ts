import dagre from "@dagrejs/dagre";

const NODE_WIDTH = 280;
const NODE_HEIGHT = 120;

export interface LayoutNodeInput {
  id: string;
}

export interface LayoutEdgeInput {
  source: string;
  target: string;
}

/**
 * Computes a tidy top-to-bottom tree layout with dagre.
 * Returns top-left positions (ReactFlow convention) keyed by node id.
 */
export function layoutTree(
  nodes: LayoutNodeInput[],
  edges: LayoutEdgeInput[]
): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 48, ranksep: 90 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(g);

  const positions = new Map<string, { x: number; y: number }>();
  for (const node of nodes) {
    const placed = g.node(node.id);
    if (!placed) continue;
    // Dagre returns center points; convert to ReactFlow's top-left origin.
    positions.set(node.id, {
      x: Math.round(placed.x - NODE_WIDTH / 2),
      y: Math.round(placed.y - NODE_HEIGHT / 2),
    });
  }
  return positions;
}
