import dagre from "@dagrejs/dagre";

const NODE_WIDTH = 280;
const NODE_HEIGHT = 120;
/** Horizontal gap between separate root trees laid out side-by-side. */
const TREE_GAP = 160;

export interface LayoutNodeInput {
  id: string;
}

export interface LayoutEdgeInput {
  source: string;
  target: string;
}

type Point = { x: number; y: number };

function dagreLayout(
  nodes: LayoutNodeInput[],
  edges: LayoutEdgeInput[]
): Map<string, Point> {
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

  const positions = new Map<string, Point>();
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

/**
 * Computes a tidy top-to-bottom tree layout with dagre.
 *
 * Handles forests: each connected component (i.e. each root tree) is laid
 * out independently and the trees are placed side-by-side with a horizontal
 * offset, in the order their first node appears in `nodes`.
 *
 * Returns top-left positions (ReactFlow convention) keyed by node id.
 */
export function layoutTree(
  nodes: LayoutNodeInput[],
  edges: LayoutEdgeInput[]
): Map<string, Point> {
  const positions = new Map<string, Point>();
  if (!nodes.length) return positions;

  const ids = new Set(nodes.map((n) => n.id));

  // Undirected adjacency for connected-component detection.
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) continue;
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, []);
    adjacency.get(edge.source)!.push(edge.target);
    adjacency.get(edge.target)!.push(edge.source);
  }

  const componentOf = new Map<string, number>();
  let componentCount = 0;
  for (const node of nodes) {
    if (componentOf.has(node.id)) continue;
    const stack = [node.id];
    componentOf.set(node.id, componentCount);
    while (stack.length) {
      const current = stack.pop()!;
      for (const neighbor of adjacency.get(current) || []) {
        if (componentOf.has(neighbor)) continue;
        componentOf.set(neighbor, componentCount);
        stack.push(neighbor);
      }
    }
    componentCount++;
  }

  const components = Array.from({ length: componentCount }, () => ({
    nodes: [] as LayoutNodeInput[],
    edges: [] as LayoutEdgeInput[],
  }));
  for (const node of nodes) {
    components[componentOf.get(node.id)!].nodes.push(node);
  }
  for (const edge of edges) {
    const c = componentOf.get(edge.source);
    if (c !== undefined && componentOf.get(edge.target) === c) {
      components[c].edges.push(edge);
    }
  }

  // Lay out each tree, then shift it right of the previous one.
  let offsetX = 0;
  for (const component of components) {
    const local = dagreLayout(component.nodes, component.edges);
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    local.forEach((p) => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x + NODE_WIDTH);
    });
    if (!Number.isFinite(minX)) continue;
    local.forEach((p, id) => {
      positions.set(id, { x: p.x - minX + offsetX, y: p.y });
    });
    offsetX += maxX - minX + TREE_GAP;
  }
  return positions;
}
