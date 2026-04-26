"use client";

import type React from "react";
import { useCallback, useState, useEffect, useRef } from "react";
import {
  ReactFlow,
  type Node,
  type Edge,
  type EdgeChange,
  type NodeChange,
  addEdge,
  type Connection,
  useNodesState,
  useEdgesState,
  Controls,
  ControlButton,
  Background,
  BackgroundVariant,
  MiniMap,
  MarkerType,
  useReactFlow,
  type NodeTypes,
  type Viewport,
  ConnectionLineType,
  type XYPosition,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { getDefaultModel } from "@/lib/models";
import { toast } from "sonner";
import { Focus, LayoutGrid, GitBranch, X } from "lucide-react";
import { ModelSelectionPanel } from "@/components/model-selection-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { EntryNodeMinimal as EntryNode } from "./nodes/entry-node-minimal";
import { BranchNodeMinimal as BranchNode } from "./nodes/branch-node-minimal";
import { ContextNodeMinimal as ContextNode } from "./nodes/context-node-minimal";
import { GroupNode } from "./nodes/group-node";
import { ExternalContextNode } from "./nodes/external-context-node";
import { CustomEdgeMinimal as CustomEdge } from "./edges/custom-edge-minimal";
import { FloatingConnectionLine } from "./edges/floating-connection-line";
import {
  storageService,
  type CanvasData,
  type NodeData,
  type EdgeData,
} from "@/lib/storage";

// ─── Constants ───────────────────────────────────────────────
const HORIZONTAL_GAP = 260;
const VERTICAL_GAP = 180;
const MAX_VISIBLE_ALTERNATIVES = 3;
const LAYOUT_SAVE_DEBOUNCE_MS = 800;
const EDGE_HIGHLIGHT_COLOR = "#3b82f6";
const FLOW_LAYOUT_STORAGE_PREFIX = "contexttree_flow_layout_";
const GROUP_DEFAULTS = { width: 420, height: 260 } as const;
const SNAP_GRID: [number, number] = [24, 24];
const CHILD_POSITION_VECTORS = [
  { x: 0, y: VERTICAL_GAP },
  { x: -HORIZONTAL_GAP * 0.95, y: VERTICAL_GAP },
  { x: HORIZONTAL_GAP * 0.95, y: VERTICAL_GAP },
  { x: -HORIZONTAL_GAP * 1.9, y: VERTICAL_GAP },
  { x: HORIZONTAL_GAP * 1.9, y: VERTICAL_GAP },
  { x: -HORIZONTAL_GAP * 0.7, y: VERTICAL_GAP * 1.7 },
  { x: HORIZONTAL_GAP * 0.7, y: VERTICAL_GAP * 1.7 },
  { x: 0, y: VERTICAL_GAP * 1.7 },
] as const;

// ─── Node & Edge type registries (defined outside component) ─
const nodeTypes: NodeTypes = {
  entry: EntryNode,
  branch: BranchNode,
  context: ContextNode,
  group: GroupNode,
  externalContext: ExternalContextNode,
};
const edgeTypes = { custom: CustomEdge };

// ─── Pure helpers ────────────────────────────────────────────
const genId = (prefix: string) =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}_${crypto.randomUUID()}`
    : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const textFrom = (c: any): string => {
  if (!c) return "";
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    for (const p of c) {
      if (typeof p === "string" && p.trim()) return p.trim();
      if (typeof p === "object") {
        const t = p?.text?.value ?? p?.text ?? p?.value ?? p?.content;
        if (typeof t === "string" && t.trim()) return t.trim();
      }
    }
    return "";
  }
  if (typeof c === "object") {
    const t = (c as any).text?.value ?? (c as any).text ?? (c as any).value ?? (c as any).content;
    if (typeof t === "string") return t.trim();
  }
  return "";
};

const flattenMessages = (msgs: any[] | undefined) => {
  if (!msgs?.length) return [] as any[];
  const out: any[] = [];
  for (const m of msgs) {
    if (!m) continue;
    if (typeof m.role === "string") { out.push(m); continue; }
    const id = m.id || genId("msg");
    if (m.user) out.push({ id: `${id}-user`, role: "user", content: m.user.content });
    if (m.assistant) out.push({ id: `${id}-assistant`, role: "assistant", content: m.assistant.content });
  }
  return out;
};

const normalizeForkId = (id?: string | null) =>
  (id || "").replace(/(-assistant|-user|-a|-u|_a|_u)$/i, "");

const derivePreview = (node: NodeData | null | undefined): string => {
  if (!node) return "";
  if (node.type === "entry") {
    const contract = (node as any).contextContract;
    if (typeof contract === "string" && contract.trim()) return contract.trim();
  }
  const msgs = flattenMessages(node.chatMessages);
  for (let i = msgs.length - 1; i >= 0; i--) {
    const t = textFrom(msgs[i]?.content);
    if (t) return t;
  }
  return node.name?.trim() || "";
};

const isProcessingExternalNode = (node: NodeData | null | undefined) => {
  if (!node || node.type !== "externalContext") return false;
  const data = typeof node.data === "object" && node.data ? (node.data as Record<string, any>) : {};
  const content = typeof data.content === "string" ? data.content.trim() : "";
  const error = typeof data.error === "string" ? data.error.trim() : "";
  const contract = typeof (node as any).contextContract === "string" ? (node as any).contextContract.trim().toLowerCase() : "";
  return !error && !content && (Boolean(data.loading) || contract === "processing...");
};

const isReadyExternalNode = (node: NodeData | null | undefined) => {
  if (!node || node.type !== "externalContext") return true;
  const data = typeof node.data === "object" && node.data ? (node.data as Record<string, any>) : {};
  const content = typeof data.content === "string" ? data.content.trim() : "";
  const error = typeof data.error === "string" ? data.error.trim() : "";
  return Boolean(content) && !error;
};

const lengthTag = (text: string): "short" | "medium" | "long" => {
  const len = text.trim().length;
  return len <= 80 ? "short" : len <= 220 ? "medium" : "long";
};

const truncate = (s: string, fallback: string, max = 60) => {
  const t = s.replace(/\s+/g, " ").trim();
  if (!t) return fallback;
  return t.length <= max ? t : `${t.slice(0, max - 3).trimEnd()}...`;
};

const branchBadge = (idx?: number) => {
  if (idx === undefined) return undefined;
  const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return idx < a.length ? a[idx] : `B${idx + 1}`;
};

const colorScheme = (bg: string) => {
  const map: Record<string, { text: string; dot: string; edge: string }> = {
    "#e0e7ff": { text: "#4338ca", dot: "#6366f1", edge: "#a5b4fc" },
    "#dcfce7": { text: "#15803d", dot: "#22c55e", edge: "#86efac" },
    "#fef3c7": { text: "#d97706", dot: "#f59e0b", edge: "#fcd34d" },
    "#fce7f3": { text: "#be185d", dot: "#ec4899", edge: "#f9a8d4" },
    "#e0f2fe": { text: "#0891b2", dot: "#06b6d4", edge: "#67e8f9" },
    "#f3e8ff": { text: "#7c3aed", dot: "#8b5cf6", edge: "#c4b5fd" },
    "#fed7d7": { text: "#dc2626", dot: "#ef4444", edge: "#fca5a5" },
    "#f0f9ff": { text: "#1d4ed8", dot: "#3b82f6", edge: "#93c5fd" },
  };
  return map[bg] || { text: "#475569", dot: "#64748b", edge: "#94a3b8" };
};

const snapPoint = (position: XYPosition): XYPosition => ({
  x: Math.round(position.x / SNAP_GRID[0]) * SNAP_GRID[0],
  y: Math.round(position.y / SNAP_GRID[1]) * SNAP_GRID[1],
});

const distanceSquared = (a: XYPosition, b: XYPosition) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

// ─── Layout algorithm (BFS tree) ────────────────────────────
const computeLayout = (nodes: NodeData[], expanded?: Set<string>) => {
  const depthMap = new Map<string, number>();
  const branchMap = new Map<string, number>();
  const badgeMap = new Map<string, number>();
  const overflowByParent = new Map<string, number>();
  const hidden = new Set<string>();

  const children = new Map<string | undefined, NodeData[]>();
  for (const n of nodes) {
    const pid = (n as any).parentNodeId as string | undefined;
    if (!children.has(pid)) children.set(pid, []);
    children.get(pid)!.push(n);
  }
  children.forEach((list, key) => {
    children.set(key, [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
  });

  const roots = (children.get(undefined) || []).sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const queue: string[] = [];
  roots.forEach((r, i) => {
    depthMap.set(r._id, 0);
    branchMap.set(r._id, i);
    queue.push(r._id);
  });

  const altOffsets = [-1, 1, -2];
  while (queue.length) {
    const id = queue.shift()!;
    const d = depthMap.get(id) ?? 0;
    const b = branchMap.get(id) ?? 0;
    const kids = children.get(id) || [];
    const continuations = kids.filter((c) => c.type !== "branch");
    const alternatives = kids.filter((c) => c.type === "branch");

    for (const c of continuations) {
      depthMap.set(c._id, d + 1);
      branchMap.set(c._id, b);
      queue.push(c._id);
    }
    for (let i = 0; i < alternatives.length; i++) {
      const c = alternatives[i];
      badgeMap.set(c._id, i);
      if (i >= MAX_VISIBLE_ALTERNATIVES && !expanded?.has(id)) {
        hidden.add(c._id);
        overflowByParent.set(id, (overflowByParent.get(id) || 0) + 1);
        continue;
      }
      const offset = altOffsets[Math.min(i, altOffsets.length - 1)];
      depthMap.set(c._id, d + 1);
      branchMap.set(c._id, b + offset);
      queue.push(c._id);
    }
  }
  return { depthMap, branchMap, badgeMap, overflowByParent, hidden };
};

const getLineageEdges = (canvas: CanvasData | null, nodeId: string | null) => {
  const ids = new Set<string>();
  if (!canvas || !nodeId) return ids;
  const nodeMap = new Map(canvas.nodes.map((n) => [n._id, n]));
  const edgeMap = new Map(canvas.edges.map((e) => [`${e.from}::${e.to}`, e]));
  let cur: string | undefined = nodeId;
  const visited = new Set<string>();
  while (cur && !visited.has(cur)) {
    visited.add(cur);
    const node = nodeMap.get(cur);
    const pid = (node as any)?.parentNodeId;
    if (!pid) break;
    const edge = edgeMap.get(`${pid}::${cur}`);
    if (edge) ids.add(edge._id);
    cur = pid;
  }
  return ids;
};

const deriveParentMessage = (node?: NodeData) => {
  if (!node) return { messageId: undefined as string | undefined, text: "" };
  const flat = flattenMessages(node.chatMessages);
  if (!flat.length) return { messageId: undefined, text: "" };
  const last = [...flat].reverse().find((m) => m.role === "assistant") || flat[flat.length - 1];
  return { messageId: normalizeForkId(last?.id), text: textFrom(last?.content).trim() };
};

// ─── Stored layout helpers ───────────────────────────────────
interface StoredLayout {
  nodes: { id: string; position: { x: number; y: number }; width?: number; height?: number }[];
  viewport?: { x: number; y: number; zoom: number };
}

const loadLayout = (canvasId: string): StoredLayout | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${FLOW_LAYOUT_STORAGE_PREFIX}${canvasId}`);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return p?.nodes ? p : null;
  } catch { return null; }
};

const mergeLayout = (nodes: Node[], stored: StoredLayout | null): Node[] => {
  if (!stored?.nodes?.length) return nodes;
  const map = new Map(stored.nodes.map((n) => [n.id, n]));
  return nodes.map((n) => {
    const s = map.get(n.id);
    if (!s) return n;
    const style: any = { ...(n.style || {}) };
    if (s.width) style.width = s.width;
    if (s.height) style.height = s.height;
    return { ...n, position: s.position || n.position, style };
  });
};

const mergeCanvasData = (remote: CanvasData, local: CanvasData | null): CanvasData => {
  if (!local) return remote;
  const remoteNodeIds = new Set(remote.nodes.map((n) => n._id));
  const localOnlyNodes = local.nodes.filter((n) => !remoteNodeIds.has(n._id));
  const remoteEdgeIds = new Set(remote.edges.map((e) => e._id));
  const localOnlyEdges = local.edges.filter((e) => !remoteEdgeIds.has(e._id));
  return {
    ...remote,
    nodes: [...remote.nodes, ...localOnlyNodes],
    edges: [...remote.edges, ...localOnlyEdges],
  };
};

// ─── Component ───────────────────────────────────────────────
interface CanvasAreaProps {
  canvasId: string;
  selectedNode: string | null;
  onNodeSelect: (nodeId: string | null, nodeName?: string, nodeType?: string) => void;
}

export function CanvasArea({ canvasId, selectedNode, onNodeSelect }: CanvasAreaProps) {
  const flow = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [canvas, setCanvas] = useState<CanvasData | null>(null);
  const [expandedOverflow, setExpandedOverflow] = useState<Set<string>>(new Set());
  const [collapsedNodes] = useState<Set<string>>(new Set());
  const [pendingConn, setPendingConn] = useState<{ sourceId: string } | null>(null);
  const [pendingBranchDrop, setPendingBranchDrop] = useState<{ parentId: string; position: { x: number; y: number } } | null>(null);
  const [branchDropModel, setBranchDropModel] = useState<string>(() => getDefaultModel());
  const [branchDropName, setBranchDropName] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingCanvas, setIsLoadingCanvas] = useState(true);
  const lastViewportRef = useRef<Viewport | null>(null);
  // Keep viewport in a ref so debounced savers don't force callback re-creation
  // on every pan frame (big perf win when the canvas has many nodes).
  const viewportRef = useRef<Viewport>({ x: 0, y: 0, zoom: 1 });
  // Tracks the canvasId we are currently loading so late responses from a
  // previously-selected canvas cannot overwrite the newer one.
  const loadTokenRef = useRef(0);
  const activeCanvasIdRef = useRef<string>(canvasId);
  useEffect(() => {
    activeCanvasIdRef.current = canvasId;
  }, [canvasId]);

  // Debounce refs
  const layoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingLayoutRef = useRef<{ nodes: Map<string, { x: number; y: number }>; viewport?: Viewport } | null>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const parentQueueRef = useRef<Record<string, any>>({});
  const parentTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Debounced API helpers ──────────────────────────────
  const scheduleParentUpdate = useCallback((nodeId: string, updates: any) => {
    parentQueueRef.current[nodeId] = { ...(parentQueueRef.current[nodeId] || {}), ...updates };
    if (parentTimerRef.current) clearTimeout(parentTimerRef.current);
    parentTimerRef.current = setTimeout(() => {
      const batch = parentQueueRef.current;
      parentQueueRef.current = {};
      Object.entries(batch).forEach(([id, body]) => {
        fetch(`/api/canvases/${canvasId}/nodes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }).catch(() => {});
      });
    }, 1000);
  }, [canvasId]);

  const scheduleCanvasSave = useCallback((data: CanvasData) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      fetch(`/api/canvases/${canvasId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, viewportState: viewportRef.current }),
      }).catch(() => toast.error("Failed to save"));
    }, 8000);
  }, [canvasId]);

  const persistCanvasNow = useCallback(async (data: CanvasData) => {
    const res = await fetch(`/api/canvases/${canvasId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, viewportState: viewportRef.current }),
    });

    if (!res.ok) {
      throw new Error(`Failed to persist canvas (${res.status})`);
    }
  }, [canvasId]);

  const flushLayout = useCallback(async () => {
    if (layoutTimerRef.current) { clearTimeout(layoutTimerRef.current); layoutTimerRef.current = null; }
    const pending = pendingLayoutRef.current;
    if (!pending) return;
    const nodesPayload = Array.from(pending.nodes.entries()).map(([id, pos]) => ({ id, position: pos }));
    pendingLayoutRef.current = null;
    if (!nodesPayload.length && !pending.viewport) return;
    try {
      await fetch(`/api/canvases/${canvasId}/layout`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(nodesPayload.length ? { nodes: nodesPayload } : {}),
          ...(pending.viewport ? { viewport: pending.viewport } : {}),
        }),
      });
    } catch {}
  }, [canvasId]);

  const scheduleLayoutPatch = useCallback((update: { nodes?: { id: string; position: { x: number; y: number } }[]; viewport?: Viewport }) => {
    if (!pendingLayoutRef.current) pendingLayoutRef.current = { nodes: new Map() };
    if (update.nodes) for (const n of update.nodes) pendingLayoutRef.current.nodes.set(n.id, n.position);
    if (update.viewport) pendingLayoutRef.current.viewport = update.viewport;
    if (layoutTimerRef.current) clearTimeout(layoutTimerRef.current);
    layoutTimerRef.current = setTimeout(() => void flushLayout(), LAYOUT_SAVE_DEBOUNCE_MS);
  }, [flushLayout]);

  useEffect(() => () => { if (layoutTimerRef.current) clearTimeout(layoutTimerRef.current); void flushLayout(); }, [flushLayout]);

  // ─── Zoom to node ─────────────────────────────────────────
  const zoomTo = useCallback((nodeId: string) => {
    const node = flow.getNode(nodeId);
    if (!node) return;
    const pos = node.position;
    const w = node.measured?.width ?? node.width ?? 200;
    const h = node.measured?.height ?? node.height ?? 120;
    flow.setCenter(pos.x + w / 2, pos.y + h / 2, { zoom: Math.min(1.5, Math.max(0.8, (flow.getViewport().zoom || 1) + 0.2)), duration: 400 });
  }, [flow]);

  // ─── Node collapse check ──────────────────────────────────
  const isHiddenByCollapse = useCallback((nodeId: string, nodesList: NodeData[]) => {
    const lookup = new Map(nodesList.map((n) => [n._id, n]));
    let cur: string | undefined = nodeId;
    while (cur) {
      if (collapsedNodes.has(cur)) return true;
      cur = (lookup.get(cur) as any)?.parentNodeId;
    }
    return false;
  }, [collapsedNodes]);

  const getNodeRuntimePosition = useCallback((nodeId: string): XYPosition | null => {
    const liveNode = flow.getNode(nodeId);
    if (liveNode?.position) return liveNode.position;

    const renderedNode = nodes.find((node) => node.id === nodeId);
    if (renderedNode?.position) return renderedNode.position;

    const storedNode = canvas?.nodes.find((node) => node._id === nodeId);
    return storedNode?.position || null;
  }, [canvas?.nodes, flow, nodes]);

  const getSmartChildPosition = useCallback((
    parentId: string,
    childType: NodeData["type"],
    preferredPosition?: XYPosition,
    excludeNodeId?: string
  ): XYPosition => {
    const parentPosition = getNodeRuntimePosition(parentId) || { x: 0, y: 0 };
    const existingNodes = (canvas?.nodes || []).filter((node) => node._id !== excludeNodeId);
    const siblingCount = existingNodes.filter((node) =>
      (node as any).parentNodeId === parentId &&
      (childType === "branch" ? node.type === "branch" : node.type !== "branch")
    ).length;

    const occupiedPositions = existingNodes
      .map((node) => getNodeRuntimePosition(node._id) || node.position)
      .filter(Boolean) as XYPosition[];

    const candidates = CHILD_POSITION_VECTORS.map((vector, index) => {
      const adjustedVector =
        childType === "branch"
          ? vector
          : index === 0
            ? { x: 0, y: VERTICAL_GAP }
            : {
                x: Math.round(vector.x * 0.55),
                y: Math.round(vector.y + (Math.abs(vector.x) > HORIZONTAL_GAP ? 18 : 0)),
              };

      const position = snapPoint({
        x: parentPosition.x + adjustedVector.x,
        y: parentPosition.y + adjustedVector.y,
      });
      const openness = occupiedPositions.length
        ? Math.min(...occupiedPositions.map((point) => distanceSquared(point, position)))
        : Number.MAX_SAFE_INTEGER;

      return {
        position,
        openness,
        preferredDistance: preferredPosition ? distanceSquared(position, preferredPosition) : 0,
        siblingDistance: Math.abs(index - Math.min(siblingCount, CHILD_POSITION_VECTORS.length - 1)),
      };
    });

    const ranked = candidates.sort((a, b) => {
      if (preferredPosition && Math.abs(a.preferredDistance - b.preferredDistance) > 4000) {
        return a.preferredDistance - b.preferredDistance;
      }
      if (a.siblingDistance !== b.siblingDistance) {
        return a.siblingDistance - b.siblingDistance;
      }
      return b.openness - a.openness;
    });

    const fallbackRow = Math.floor(siblingCount / 3) + 1;
    const fallbackDirection = siblingCount % 2 === 0 ? -1 : 1;

    return ranked[0]?.position || snapPoint({
      x: parentPosition.x + fallbackDirection * HORIZONTAL_GAP * (0.85 + fallbackRow * 0.2),
      y: parentPosition.y + VERTICAL_GAP * (1 + fallbackRow * 0.5),
    });
  }, [canvas?.nodes, getNodeRuntimePosition]);

  // ─── Build ReactFlow graph from canvas data ───────────────
  const buildFlow = useCallback((data: CanvasData): { nodes: Node[]; edges: Edge[]; viewport?: Viewport } => {
    const layout = computeLayout(data.nodes, expandedOverflow);
    const { depthMap, branchMap, badgeMap, overflowByParent, hidden } = layout;
    const animatedEdges = getLineageEdges(data, selectedNode);

    const flowNodes: Node[] = data.nodes
      .filter((n) => !hidden.has(n._id))
      .map((node) => {
        if (node.type === "group") {
          const dims = node.dimensions || (node.data as any)?.dimensions || GROUP_DEFAULTS;
          return {
            id: node._id,
            type: "group",
            position: node.position || { x: 160, y: 120 },
            data: {
              label: node.name || "Group",
              color: node.color || "rgba(148,163,184,0.1)",
              textColor: node.textColor || "#64748b",
              borderColor: node.dotColor || "rgba(148,163,184,0.4)",
              onResize: (size: { width: number; height: number }) => handleGroupResize(node._id, size),
              onResizeEnd: (size: { width: number; height: number }) => handleGroupResizeEnd(node._id, size),
            },
            style: { width: dims.width, height: dims.height, zIndex: 0 },
            draggable: true,
            selectable: true,
          } as Node;
        }

        const nodeColor = node.color || (node.type === "entry" ? "#e8ecf3" : undefined);
        const cs = colorScheme(nodeColor || "#f8fafc");
        const nodeData = typeof node.data === "object" && node.data ? { ...node.data } : {};
        const nodeError = (nodeData as any).error || (node as any).error;

        // External context resolution
        if (node.type === "externalContext") {
          const content = (nodeData as any).content || (node as any).content || "";
          const isProcessing = isProcessingExternalNode(node);
          if (content) (nodeData as any).content = content;
          (nodeData as any).previewText = isProcessing
            ? "Processing..."
            : content || (node as any).contextContract || "";
          (nodeData as any).loading = !nodeError && isProcessing;
          (nodeData as any).disabled = isProcessing;
          if (nodeError) (nodeData as any).error = nodeError;
        }

        const preview = derivePreview(node);
        const depth = depthMap.get(node._id) ?? 0;
        const branch = branchMap.get(node._id) ?? 0;
        const parentNode = data.nodes.find((n) => n._id === (node as any).parentNodeId);
        const parentName = parentNode?.name || (parentNode?.type === "entry" ? "Base Context" : undefined);
        const storedPos = node.position || (nodeData as any)?.position;
        const hasValidStoredPos =
          storedPos &&
          typeof storedPos.x === "number" &&
          typeof storedPos.y === "number" &&
          // Treat (0,0) as "never positioned" so multiple unpositioned nodes
          // don't stack on top of each other.
          !(storedPos.x === 0 && storedPos.y === 0);
        // Keep the base entry node anchored to the computed tree root, but let
        // every other node retain manual drag positions once they exist.
        const position = node.type !== "entry" && hasValidStoredPos
          ? storedPos
          : { x: branch * HORIZONTAL_GAP, y: depth * VERTICAL_GAP };

        return {
          id: node._id,
          type: node.type,
          position,
          data: {
            ...nodeData,
            label: node.name || (node.type === "entry" ? "Base Context" : node.type === "branch" ? "Branch" : "Context"),
            messageCount: node.chatMessages?.length || 0,
            model: node.model,
            isSelected: selectedNode === node._id,
            color: nodeColor,
            textColor: cs.text,
            dotColor: cs.dot,
            preview,
            lengthTag: lengthTag(preview),
            timestamp: node.chatMessages?.slice(-1)[0]?.timestamp || node.createdAt,
            metaForkLabel: node.type === "branch" ? `Branched from ${parentName || "Base Context"}` : undefined,
            branchBadge: node.type === "branch" ? branchBadge(badgeMap.get(node._id)) : undefined,
            sharedLabel: node.type === "entry" ? "Shared by all branches" : undefined,
            primary: node.primary,
            highlightTier: undefined,
            onClick: () => onNodeSelect(node._id, node.name || (node.type === "entry" ? "Base Context" : "Node"), node.type),
            onFocus: () => zoomTo(node._id),
            onDelete: () => deleteNode(node._id),
            onRetry: () => retryExternal(node._id, (nodeData as any)?.fileId || (node as any).fileId),
          },
          style: { zIndex: 2 },
          hidden: isHiddenByCollapse(node._id, data.nodes),
          draggable: node.type !== "entry" && !(node.type === "externalContext" && isProcessingExternalNode(node)),
          connectable: !(node.type === "externalContext" && isProcessingExternalNode(node)),
        } as Node;
      });

    const flowEdges: Edge[] = data.edges
      .filter((e) => !hidden.has(e.from) && !hidden.has(e.to))
      .map((edge) => {
        const isAnimated = animatedEdges.has(edge._id);
        const src = data.nodes.find((n) => n._id === edge.from);
        const tgt = data.nodes.find((n) => n._id === edge.to);
        const isExternal = src?.type === "externalContext" || tgt?.type === "externalContext";
        const ec = isExternal ? "#f59e0b" : colorScheme(src?.color || "#f8fafc").edge || "#cbd5e1";
        const stroke = isAnimated ? EDGE_HIGHLIGHT_COLOR : ec;
        return {
          id: edge._id,
          source: edge.from,
          target: edge.to,
          type: "custom",
          animated: isAnimated,
          data: {
            ...(edge.meta || {}),
            animated: isAnimated,
            onDelete: (id: string) => deleteEdge(id),
          },
          style: { stroke, strokeWidth: isAnimated ? 2.2 : 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: stroke, width: 16, height: 16 },
          selectable: true,
          hidden: isHiddenByCollapse(edge.from, data.nodes) || isHiddenByCollapse(edge.to, data.nodes),
        } as Edge;
      });

    // Overflow nodes
    overflowByParent.forEach((count, parentId) => {
      if (count <= 0) return;
      const d = (depthMap.get(parentId) ?? 0) + 1;
      const b = (branchMap.get(parentId) ?? 0) + 2;
      const ovId = `overflow-${parentId}`;
      flowNodes.push({
        id: ovId, type: "context",
        position: { x: b * HORIZONTAL_GAP, y: d * VERTICAL_GAP },
        data: {
          label: `+${count} more`, preview: "Click to expand",
          messageCount: 0, isSelected: false, model: "", lengthTag: "short",
          onClick: () => setExpandedOverflow((p) => new Set(p).add(parentId)),
        },
        draggable: false,
      } as Node);
      flowEdges.push({
        id: `overflow-edge-${parentId}`, source: parentId, target: ovId,
        type: "custom", animated: false, selectable: false,
        style: { stroke: "#cbd5e1", strokeWidth: 1.5, strokeDasharray: "6 4" },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#cbd5e1", width: 14, height: 14 },
        data: {},
      } as Edge);
    });

    const stored = loadLayout(canvasId);
    const merged = mergeLayout(flowNodes, stored);
    return { nodes: merged, edges: flowEdges, viewport: stored?.viewport || data.viewportState };
  }, [canvasId, expandedOverflow, selectedNode, onNodeSelect, zoomTo, isHiddenByCollapse]);

  const applyAutoLayout = useCallback((sourceCanvas?: CanvasData | null) => {
    const layoutSource = sourceCanvas || canvas;
    if (!layoutSource) return;

    const layout = computeLayout(layoutSource.nodes, expandedOverflow);
    const updatedNodes = layoutSource.nodes.map((node) => {
      if (node.type === "group") return node;

      return {
        ...node,
        position: snapPoint({
          x: (layout.branchMap.get(node._id) ?? 0) * HORIZONTAL_GAP,
          y: (layout.depthMap.get(node._id) ?? 0) * VERTICAL_GAP,
        }),
      };
    });

    const updatedCanvas: CanvasData = {
      ...layoutSource,
      nodes: updatedNodes,
      updatedAt: new Date().toISOString(),
    };

    storageService.saveCanvas(updatedCanvas);
    setCanvas(updatedCanvas);

    const built = buildFlow(updatedCanvas);
    setNodes(built.nodes);
    setEdges(built.edges);

    scheduleLayoutPatch({
      nodes: updatedNodes
        .filter((node) => node.type !== "group" && node.position)
        .map((node) => ({ id: node._id, position: node.position! })),
    });

    scheduleCanvasSave(updatedCanvas);
    toast.success("Canvas auto-arranged");
  }, [buildFlow, canvas, expandedOverflow, scheduleCanvasSave, scheduleLayoutPatch, setEdges, setNodes]);

  // ─── CRUD operations ──────────────────────────────────────
  const deleteNode = useCallback((nodeId: string) => {
    if (!canvas) return;
    if (nodeId === canvas.primaryNodeId) { toast.error("Cannot delete the main node"); return; }
    if (!confirm("Delete this node?")) return;

    const children = canvas.nodes.filter((n) => (n as any).parentNodeId === nodeId);
    const updated: CanvasData = {
      ...canvas,
      nodes: canvas.nodes.filter((n) => n._id !== nodeId).map((n) =>
        (n as any).parentNodeId === nodeId ? { ...n, parentNodeId: undefined } : n
      ),
      edges: canvas.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
      updatedAt: new Date().toISOString(),
    };
    storageService.saveCanvas(updated);
    setCanvas(updated);
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    scheduleCanvasSave(updated);
    if (selectedNode === nodeId) onNodeSelect(null);
    void persistCanvasNow(updated).catch(() => {
      toast.error("Failed to sync node deletion");
    });
    children.forEach((c) => scheduleParentUpdate(c._id, { parentNodeId: undefined }));
  }, [canvas, persistCanvasNow, selectedNode, onNodeSelect, scheduleCanvasSave, scheduleParentUpdate, setNodes, setEdges]);

  const deleteEdge = useCallback((edgeId: string) => {
    if (!canvas || !confirm("Delete this connection?")) return;
    const edge = canvas.edges.find((e) => e._id === edgeId);
    const updatedEdges = canvas.edges.filter((e) => e._id !== edgeId);
    let updatedNodes = canvas.nodes;
    if (edge) {
      const target = canvas.nodes.find((n) => n._id === edge.to);
      if (target && (target as any).parentNodeId === edge.from && !updatedEdges.some((e) => e.to === edge.to)) {
        updatedNodes = canvas.nodes.map((n) => n._id === edge.to ? { ...n, parentNodeId: undefined } : n);
        scheduleParentUpdate(edge.to, { parentNodeId: undefined });
      }
    }
    const updated = { ...canvas, edges: updatedEdges, nodes: updatedNodes, updatedAt: new Date().toISOString() };
    storageService.saveCanvas(updated);
    setCanvas(updated);
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    fetch(`/api/canvases/${canvasId}/edges/${edgeId}`, { method: "DELETE" }).catch(() => {});
  }, [canvas, canvasId, scheduleParentUpdate, setEdges]);

  const pollForExternalContent = useCallback(async (nodeId: string, label: string) => {
    for (let attempt = 0; attempt < 18; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, attempt < 6 ? 1500 : 3000));

      try {
        const res = await fetch(`/api/canvases/${canvasId}`, { cache: "no-cache" });
        if (!res.ok) continue;

        const payload = await res.json();
        const refreshed = payload?.canvas as CanvasData | undefined;
        if (!refreshed) continue;

        const nextCanvas = mergeCanvasData(refreshed, storageService.getCanvas(canvasId));
        const node = nextCanvas.nodes.find((item) => item._id === nodeId);
        const nodeData = (node?.data && typeof node.data === "object" ? node.data : {}) as Record<string, any>;
        const content = typeof nodeData.content === "string" ? nodeData.content.trim() : "";
        const error = typeof nodeData.error === "string" ? nodeData.error.trim() : "";

        if (!node) continue;

        storageService.saveCanvas(nextCanvas);
        setCanvas(nextCanvas);

        if (error) {
          toast.error(`Failed to process ${label}`);
          return;
        }

        if (content) {
          toast.success(`${label} is ready`);
          return;
        }
      } catch {
        // Keep polling quietly while the background worker finishes.
      }
    }
  }, [canvasId]);

  const retryExternal = useCallback(async (nodeId: string, fileId: string) => {
    if (!fileId) return;
    try {
      const res = await fetch("/api/files/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId, canvasId, fileId }),
      });
      if (res.ok) {
        const nodeLabel =
          canvas?.nodes.find((item) => item._id === nodeId)?.name || "file";
        toast.success("Reprocessing file...");
        void pollForExternalContent(nodeId, nodeLabel);
      } else {
        toast.error("Failed to reprocess");
      }
    } catch {
      toast.error("Failed to reprocess");
    }
  }, [canvas?.nodes, canvasId, pollForExternalContent]);

  const handleGroupResize = useCallback((nodeId: string, size: { width: number; height: number }) => {
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, style: { ...n.style, width: size.width, height: size.height } } : n));
  }, [setNodes]);

  const handleGroupResizeEnd = useCallback(async (nodeId: string, size: { width: number; height: number }) => {
    if (!canvas) return;
    const updated = {
      ...canvas,
      nodes: canvas.nodes.map((n) => n._id !== nodeId ? n : { ...n, dimensions: size, data: { ...(n.data || {}), dimensions: size } } as NodeData),
      updatedAt: new Date().toISOString(),
    };
    storageService.saveCanvas(updated);
    setCanvas(updated);
    try {
      await fetch(`/api/canvases/${canvasId}/nodes/${nodeId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dimensions: size }),
      });
    } catch {}
  }, [canvas, canvasId]);

  // ─── Create branch from parent ────────────────────────────
  const createBranch = useCallback((parentId: string, position?: { x: number; y: number }, model?: string, overrideName?: string) => {
    if (!canvas) return;
    const parent = canvas.nodes.find((n) => n._id === parentId);
    if (!parent || parent.type === "context" || parent.type === "externalContext") return;

    const { messageId, text } = deriveParentMessage(parent);
    const forkId = messageId || genId("msgref");
    const pos = getSmartChildPosition(parentId, "branch", position);

    const now = new Date().toISOString();
    const nodeId = genId("node");
    const cs = colorScheme(parent.color || "#f8fafc");
    const fallbackLabel = truncate(text, parent.name ? `${parent.name} branch` : "New Branch");
    const label = overrideName?.trim() || fallbackLabel;

    const newNode: NodeData = {
      _id: nodeId, primary: false, type: "branch", name: label,
      color: parent.color, textColor: cs.text, dotColor: cs.dot,
      chatMessages: [], runningSummary: "", contextContract: "",
      model: model || parent.model || canvas.settings?.defaultModel || getDefaultModel(),
      metaTags: parent.metaTags || [],
      parentNodeId: parentId, forkedFromMessageId: forkId, createdAt: now, position: pos,
    };
    const edgeId = genId("edge");
    const newEdge: EdgeData = { _id: edgeId, from: parentId, to: nodeId, createdAt: now, meta: {} };

    const updated: CanvasData = {
      ...canvas,
      nodes: [...canvas.nodes, newNode],
      edges: [...canvas.edges, newEdge],
      updatedAt: now,
    };
    storageService.saveCanvas(updated);
    setCanvas(updated);

    fetch(`/api/canvases/${canvasId}/nodes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...newNode, forkedFromMessageId: forkId }) }).catch(() => {});
    fetch(`/api/canvases/${canvasId}/edges`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newEdge) }).catch(() => {});
    scheduleParentUpdate(nodeId, { parentNodeId: parentId, forkedFromMessageId: forkId });
    onNodeSelect(nodeId, label, "branch");
    toast.success("Branch created");
  }, [canvas, canvasId, getSmartChildPosition, onNodeSelect, scheduleParentUpdate]);

  // ─── Event handlers ───────────────────────────────────────
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === "group") return;
    onNodeSelect(node.id, (node.data as any)?.label || "Node", node.type);
  }, [onNodeSelect]);

  const onConnect = useCallback((params: Connection) => {
    if (!canvas || !params.source || !params.target) return;
    let srcId = params.source, tgtId = params.target;
    const srcNode = canvas.nodes.find((n) => n._id === srcId);
    const tgtNode = canvas.nodes.find((n) => n._id === tgtId);
    if (!srcNode || !tgtNode) return;

    // Normalize: entry stays root
    if (tgtNode.type === "entry" && srcNode.type !== "entry") {
      [srcId, tgtId] = [tgtId, srcId];
    }
    if (srcNode.type === "externalContext" && tgtNode.type === "externalContext") {
      toast.error("Cannot connect file nodes"); return;
    }
    if (!isReadyExternalNode(srcNode) || !isReadyExternalNode(tgtNode)) {
      toast.error("Wait for the file to finish processing before connecting it");
      return;
    }

    const edgeData: EdgeData = {
      _id: `edge_${Date.now()}`, from: srcId, to: tgtId,
      createdAt: new Date().toISOString(), meta: {},
    };
    const updatedNodes = canvas.nodes.map((n) =>
      n._id === tgtId && n.type !== "entry" ? { ...n, parentNodeId: srcId } as any : n
    );
    const updated: CanvasData = { ...canvas, nodes: updatedNodes, edges: [...canvas.edges, edgeData], updatedAt: new Date().toISOString() };
    storageService.saveCanvas(updated);
    setCanvas(updated);
    fetch(`/api/canvases/${canvasId}/edges`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(edgeData) }).catch(() => {});
    if (tgtNode.type !== "entry") scheduleParentUpdate(tgtId, { parentNodeId: srcId });

    const ec = colorScheme(srcNode?.color || "#f8fafc").edge || "#cbd5e1";
    setEdges((eds) => addEdge({
      id: edgeData._id, source: srcId, target: tgtId, type: "custom",
      data: { onDelete: (id: string) => deleteEdge(id) },
      style: { stroke: ec, strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: ec, width: 16, height: 16 },
    }, eds));
  }, [canvas, canvasId, scheduleParentUpdate, setEdges, deleteEdge]);

  const onConnectStart = useCallback((_: MouseEvent | TouchEvent, params: any) => {
    if (!params?.nodeId || params.handleType === "target") {
      setPendingConn(null);
      return;
    }

    const sourceNode = canvas?.nodes.find((node) => node._id === params.nodeId);
    if (sourceNode && !isReadyExternalNode(sourceNode)) {
      toast.error("Wait for the file to finish processing before connecting it");
      setPendingConn(null);
      return;
    }

    setPendingConn({ sourceId: params.nodeId });
  }, [canvas]);

  const isValidConnection = useCallback((connection: Connection) => {
    if (!canvas || !connection.source || !connection.target) return false;
    const sourceNode = canvas.nodes.find((node) => node._id === connection.source);
    const targetNode = canvas.nodes.find((node) => node._id === connection.target);
    if (!sourceNode || !targetNode) return false;
    if (!isReadyExternalNode(sourceNode) || !isReadyExternalNode(targetNode)) return false;
    if (sourceNode.type === "externalContext" && targetNode.type === "externalContext") return false;
    return true;
  }, [canvas]);

  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
    if (!pendingConn || !canvas) { setPendingConn(null); return; }
    const target = event.target as HTMLElement;
    if (!target?.classList?.contains("react-flow__pane") && !target?.closest?.(".react-flow__pane")) {
      setPendingConn(null); return;
    }
    if (!wrapperRef.current) { setPendingConn(null); return; }

    const bounds = wrapperRef.current.getBoundingClientRect();
    const clientX = event instanceof MouseEvent ? event.clientX : (event as TouchEvent).changedTouches?.[0]?.clientX;
    const clientY = event instanceof MouseEvent ? event.clientY : (event as TouchEvent).changedTouches?.[0]?.clientY;
    if (typeof clientX !== "number" || typeof clientY !== "number") { setPendingConn(null); return; }

    const pos = flow.screenToFlowPosition({ x: clientX - bounds.left, y: clientY - bounds.top });
    const parent = canvas.nodes.find((n) => n._id === pendingConn.sourceId);
    setBranchDropModel(parent?.model || canvas.settings?.defaultModel || getDefaultModel());
    const suggestedName = truncate(
      deriveParentMessage(parent).text,
      parent?.name ? `${parent.name} branch` : "New Branch"
    );
    setBranchDropName(suggestedName);
    setPendingBranchDrop({ parentId: pendingConn.sourceId, position: pos });
    setPendingConn(null);
  }, [pendingConn, canvas, flow]);

  const onNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
    scheduleLayoutPatch({ nodes: [{ id: node.id, position: node.position }] });
    if (canvas) {
      const updated = {
        ...canvas,
        nodes: canvas.nodes.map((n) => n._id === node.id ? { ...n, position: node.position } : n),
      };
      storageService.saveCanvas(updated);
      setCanvas(updated);
    }
  }, [canvas, scheduleLayoutPatch]);

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
  }, [onNodesChange]);

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);
  }, [onEdgesChange]);

  const handleMoveEnd = useCallback((_: any, vp: Viewport) => {
    scheduleLayoutPatch({ viewport: vp });
  }, [scheduleLayoutPatch]);

  // ─── File drop handler ────────────────────────────────────
  const onDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();
    if (!canvas || !wrapperRef.current) return;

    const files = event.dataTransfer.files;
    if (!files?.length) return;

    const bounds = wrapperRef.current.getBoundingClientRect();
    const pos = flow.screenToFlowPosition({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
    let workingCanvas = canvas;

    for (const file of Array.from(files)) {
      const nodeId = genId("node");
      const now = new Date().toISOString();
      const newNode: NodeData = {
        _id: nodeId, name: file.name, primary: false, type: "externalContext",
        chatMessages: [], runningSummary: "", contextContract: "Processing...",
        model: "", createdAt: now, position: pos,
        data: { label: file.name, fileType: file.type, size: file.size, loading: true },
      } as any;

      workingCanvas = { ...workingCanvas, nodes: [...workingCanvas.nodes, newNode], updatedAt: now };
      storageService.saveCanvas(workingCanvas);
      setCanvas(workingCanvas);

      const removeOptimisticNode = () => {
        workingCanvas = {
          ...workingCanvas,
          nodes: workingCanvas.nodes.filter((n) => n._id !== nodeId),
          edges: workingCanvas.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
          updatedAt: new Date().toISOString(),
        };
        storageService.saveCanvas(workingCanvas);
        setCanvas(workingCanvas);
      };

      try {
        const nodeRes = await fetch(`/api/canvases/${canvasId}/nodes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newNode),
        });

        if (!nodeRes.ok) {
          const detail = await nodeRes.json().catch(() => null);
          const message =
            detail?.error || `Failed to create upload node for ${file.name}`;

          removeOptimisticNode();
          toast.error(message);
          continue;
        }
      } catch {
        removeOptimisticNode();
        toast.error(`Failed to create upload node for ${file.name}`);
        continue;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("canvasId", canvasId);
      formData.append("nodeId", nodeId);
      formData.append("position", JSON.stringify(pos));

      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          workingCanvas = {
            ...workingCanvas,
            nodes: workingCanvas.nodes.map((n) =>
              n._id === nodeId
                ? {
                    ...n,
                    contextContract: "Processing...",
                    data: {
                      ...((n.data || {}) as any),
                      loading: true,
                      fileId: data.fileId,
                      error: undefined,
                    },
                  } as any
                : n
            ),
          };
          storageService.saveCanvas(workingCanvas);
          setCanvas(workingCanvas);
          toast.success(`${file.name} uploaded. Processing started.`);
          void pollForExternalContent(nodeId, file.name);
        } else {
          const detail = await res.json().catch(() => null);
          workingCanvas = {
            ...workingCanvas,
            nodes: workingCanvas.nodes.map((n) =>
              n._id === nodeId
                ? {
                    ...n,
                    contextContract: "Upload failed",
                    data: {
                      ...((n.data || {}) as any),
                      loading: false,
                      error: detail?.error || "Upload failed",
                    },
                  } as any
                : n
            ),
          };
          storageService.saveCanvas(workingCanvas);
          setCanvas(workingCanvas);
          fetch(`/api/canvases/${canvasId}/nodes/${nodeId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contextContract: "Upload failed",
              data: {
                ...((newNode.data || {}) as any),
                loading: false,
                error: detail?.error || "Upload failed",
              },
            }),
          }).catch(() => {});
          toast.error(detail?.error || `Failed to upload ${file.name}`);
        }
      } catch {
        workingCanvas = {
          ...workingCanvas,
          nodes: workingCanvas.nodes.map((n) =>
            n._id === nodeId
              ? {
                  ...n,
                  contextContract: "Upload failed",
                  data: { ...((n.data || {}) as any), loading: false, error: "Upload failed" },
                } as any
              : n
          ),
        };
        storageService.saveCanvas(workingCanvas);
        setCanvas(workingCanvas);
        fetch(`/api/canvases/${canvasId}/nodes/${nodeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contextContract: "Upload failed",
            data: {
              ...((newNode.data || {}) as any),
              loading: false,
              error: "Upload failed",
            },
          }),
        }).catch(() => {});
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  }, [canvas, canvasId, flow, pollForExternalContent]);

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }, []);

  // ─── Load canvas ──────────────────────────────────────────
  // Race-safe: each load gets a unique token. Only the most recent response
  // is allowed to commit. Aborts in-flight fetches when the user switches
  // canvases so we never paint the wrong graph.
  useEffect(() => {
    if (!canvasId) return;
    const token = ++loadTokenRef.current;
    const controller = new AbortController();

    // Optimistic: seed state from localStorage so switching feels instant.
    const cached = storageService.getCanvas(canvasId);
    if (cached) {
      setCanvas(cached);
      setLoadError(null);
    } else {
      setCanvas(null);
      setNodes([]);
      setEdges([]);
    }
    setIsLoadingCanvas(true);

    const load = async () => {
      let data: CanvasData | null = null;
      let failed = false;
      try {
        const res = await fetch(`/api/canvases/${canvasId}`, {
          cache: "no-cache",
          signal: controller.signal,
        });
        if (res.ok) {
          const json = await res.json();
          const local = storageService.getCanvas(canvasId);
          data = json.canvas ? mergeCanvasData(json.canvas, local) : json.canvas;
          if (data) storageService.saveCanvas(data);
        } else if (res.status === 404) {
          failed = true;
        } else {
          data = storageService.getCanvas(canvasId);
        }
      } catch (e: any) {
        if (e?.name === "AbortError") return; // silent
        data = storageService.getCanvas(canvasId);
        if (!data) failed = true;
      }

      // Stale response guard: if the user already switched canvases, drop.
      if (loadTokenRef.current !== token) return;
      if (activeCanvasIdRef.current !== canvasId) return;

      setIsLoadingCanvas(false);

      if (failed && !data) {
        setLoadError("Couldn't load this canvas. It may have been deleted.");
        setCanvas(null);
        setNodes([]);
        setEdges([]);
        return;
      }

      if (data) {
        setLoadError(null);
        setCanvas(data);
        if (data.viewportState) {
          lastViewportRef.current = data.viewportState;
          viewportRef.current = data.viewportState;
          // Use requestAnimationFrame so the viewport is applied after the
          // graph has had a chance to render the new nodes.
          requestAnimationFrame(() => {
            if (activeCanvasIdRef.current === canvasId) {
              flow.setViewport(data!.viewportState!, { duration: 0 });
            }
          });
        }
      }
    };
    load();

    return () => {
      controller.abort();
    };
  }, [canvasId, flow, setEdges, setNodes]);

  // Rebuild ReactFlow graph when the underlying canvas, selection, or
  // overflow expansion changes. This is the SINGLE source of truth for
  // rendering — the loader only touches `canvas`.
  useEffect(() => {
    if (!canvas) return;
    const built = buildFlow(canvas);
    setNodes(built.nodes);
    setEdges(built.edges);
  }, [canvas, expandedOverflow, selectedNode, buildFlow, setEdges, setNodes]);

  // Zoom to selected node
  useEffect(() => {
    if (selectedNode) zoomTo(selectedNode);
  }, [selectedNode, zoomTo]);

  // Listen for fork events from chat panel. We dedupe by node id so a late
  // server echo (from the chat panel's fire-and-forget POST) doesn't add the
  // same node/edge twice — a common cause of "duplicate node" flicker.
  useEffect(() => {
    const handler = (e: any) => {
      const { canvasId: cid, node, edge } = e.detail || {};
      if (cid !== canvasId || !node) return;

      const positionedNode = node.parentNodeId
        ? {
            ...node,
            position: getSmartChildPosition(
              node.parentNodeId,
              node.type,
              node.position,
              node._id
            ),
          }
        : node;

      setCanvas((prev) => {
        if (!prev) return prev;
        const alreadyHasNode = prev.nodes.some((n) => n._id === positionedNode._id);
        const alreadyHasEdge = edge
          ? prev.edges.some(
              (e) => e._id === edge._id || (e.from === edge.from && e.to === edge.to)
            )
          : true;
        if (alreadyHasNode && alreadyHasEdge) return prev;
        const updated = {
          ...prev,
          nodes: alreadyHasNode ? prev.nodes : [...prev.nodes, positionedNode],
          edges: edge && !alreadyHasEdge ? [...prev.edges, edge] : prev.edges,
        };
        storageService.saveCanvas(updated);
        return updated;
      });

      if (positionedNode.position) {
        scheduleLayoutPatch({
          nodes: [{ id: positionedNode._id, position: positionedNode.position }],
        });

        fetch(`/api/canvases/${canvasId}/nodes/${positionedNode._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: positionedNode.position }),
        }).catch(() => {});
      }
    };
    window.addEventListener("canvas-fork-node", handler);
    return () => window.removeEventListener("canvas-fork-node", handler);
  }, [canvasId, getSmartChildPosition, scheduleLayoutPatch]);

  // Listen for node updates from chat panel
  useEffect(() => {
    const handler = (e: any) => {
      const { nodeId, updates } = e.detail || {};
      if (!nodeId || !updates) return;
      setCanvas((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          nodes: prev.nodes.map((n) => n._id === nodeId ? { ...n, ...updates } : n),
        };
      });
    };
    window.addEventListener("canvas-update-node", handler);
    return () => window.removeEventListener("canvas-update-node", handler);
  }, []);

  // Listen for node selection from chat panel
  useEffect(() => {
    const handler = (e: any) => {
      const { nodeId, nodeName, nodeType } = e.detail || {};
      if (!nodeId) return;
      const node = canvas?.nodes.find((n) => n._id === nodeId);
      onNodeSelect(nodeId, node?.name || nodeName, node?.type || nodeType || "branch");
    };
    window.addEventListener("canvas-select-node", handler);
    return () => window.removeEventListener("canvas-select-node", handler);
  }, [canvas, onNodeSelect]);

  // Listen for canvas data updates
  useEffect(() => {
    const handler = (e: any) => {
      const updated = e.detail;
      if (updated?._id === canvasId) setCanvas(updated);
    };
    window.addEventListener("canvas-data-updated", handler);
    return () => window.removeEventListener("canvas-data-updated", handler);
  }, [canvasId]);

  // Reset pending connection on canvas change
  useEffect(() => { setPendingConn(null); }, [canvasId]);

  // ─── Keyboard shortcuts ───────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
        e.preventDefault();
        applyAutoLayout();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [applyAutoLayout]);

  // ─── Render ───────────────────────────────────────────────
  const hasNoVisibleNodes = !isLoadingCanvas && canvas && canvas.nodes.length === 0;

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]"
      ref={wrapperRef}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(248,250,252,0.94)_42%,_rgba(241,245,249,0.84)_100%)]" />

      {/* Loading shimmer — shown only when we have no cached canvas yet */}
      {isLoadingCanvas && !canvas && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" />
            <p className="text-xs font-medium text-slate-500">Loading canvas…</p>
          </div>
        </div>
      )}

      {/* Error state — bad canvas id or server failure */}
      {loadError && !isLoadingCanvas && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="max-w-sm text-center space-y-3 px-6">
            <div className="mx-auto w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
              <LayoutGrid size={20} />
            </div>
            <p className="text-sm font-semibold text-slate-900">{loadError}</p>
            <button
              onClick={() => {
                setLoadError(null);
                setIsLoadingCanvas(true);
                loadTokenRef.current += 1;
                // Trigger a retry by bumping activeCanvasIdRef
                const t = canvasId;
                activeCanvasIdRef.current = "";
                requestAnimationFrame(() => {
                  activeCanvasIdRef.current = t;
                  setCanvas((c) => c); // no-op state update to re-run effects
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium px-3 py-1.5 hover:bg-slate-800 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Empty canvas hint */}
      {hasNoVisibleNodes && !loadError && (
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="pointer-events-auto text-center space-y-2 px-6 py-4 rounded-2xl bg-white/80 backdrop-blur border border-slate-200 shadow-sm">
            <p className="text-sm font-medium text-slate-700">This canvas is empty</p>
            <p className="text-xs text-slate-500">Right-click anywhere to drop your first node</p>
          </div>
        </div>
      )}

      {/* Canvas insights chip — small, always-on summary of the graph */}
      {canvas && canvas.nodes.length > 0 && !loadError && (
        <div className="pointer-events-none absolute top-4 left-4 z-20 select-none">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/85 backdrop-blur-md px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
              <span className="tabular-nums text-slate-900">{canvas.nodes.length}</span>
              <span className="text-slate-400">nodes</span>
            </span>
            <span className="h-3 w-px bg-slate-200" />
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              <span className="tabular-nums text-slate-900">
                {canvas.nodes.filter((n: any) => n.type === "branch").length}
              </span>
              <span className="text-slate-400">branches</span>
            </span>
            <span className="h-3 w-px bg-slate-200" />
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              <span className="tabular-nums text-slate-900">
                {new Set(canvas.nodes.map((n: any) => n.model).filter(Boolean)).size}
              </span>
              <span className="text-slate-400">models</span>
            </span>
          </div>
        </div>
      )}
      {/* Model picker — shown when user drops a new branch by dragging an edge */}
      {pendingBranchDrop && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]">
          <div className="flex max-h-[88vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-950">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600">
                      <GitBranch size={15} />
                    </span>
                    New branch
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Name the branch and choose the model it should use.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingBranchDrop(null)}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close branch dialog"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <div className="mb-5 space-y-2">
                <label
                  htmlFor="branch-drop-name"
                  className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
                >
                  Node Name
                </label>
                <Input
                  autoFocus
                  id="branch-drop-name"
                  value={branchDropName}
                  onChange={(event) => setBranchDropName(event.target.value)}
                  placeholder="Branch from current node"
                  className="h-11 rounded-lg border-slate-300 bg-white text-sm font-medium text-slate-900 shadow-none focus-visible:ring-2 focus-visible:ring-slate-900/10"
                  data-slot="branch-drop-name-input"
                />
                <p className="text-xs text-slate-500">
                  This label appears on the branch card in the canvas.
                </p>
              </div>
              <ModelSelectionPanel
                selectedModel={branchDropModel}
                onSelect={setBranchDropModel}
                compact
              />
            </div>
            <div className="flex gap-3 border-t border-slate-200 bg-white px-5 py-4">
              <Button
                variant="outline"
                onClick={() => setPendingBranchDrop(null)}
                className="h-10 flex-1 rounded-lg border-slate-200 text-sm font-medium"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const { parentId, position } = pendingBranchDrop;
                  setPendingBranchDrop(null);
                  createBranch(parentId, position, branchDropModel, branchDropName);
                }}
                className="h-10 flex-1 rounded-lg bg-slate-950 text-sm font-medium text-white hover:bg-slate-800"
              >
                Create Branch
              </Button>
            </div>
          </div>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        isValidConnection={isValidConnection}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={() => onNodeSelect(null)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineComponent={FloatingConnectionLine}
        connectionLineStyle={{ stroke: "#cbd5e1", strokeWidth: 1.35 }}
        defaultEdgeOptions={{
          type: "custom",
          style: { stroke: "#d5dee8", strokeWidth: 1.35 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#cbd5e1", width: 14, height: 14 },
        }}
        onInit={(instance) => {
          if (canvas?.viewportState) {
            instance.setViewport(canvas.viewportState);
            viewportRef.current = canvas.viewportState;
          } else {
            setTimeout(() => {
              instance.fitView({ padding: 0.15 });
              viewportRef.current = instance.getViewport();
            }, 100);
          }
        }}
        // onMove runs on every pan frame. Store only to ref (no re-render)
        // to keep dragging buttery-smooth even on large graphs.
        onMove={(_, vp) => {
          lastViewportRef.current = vp;
          viewportRef.current = vp;
        }}
        onMoveEnd={handleMoveEnd}
        panOnDrag
        snapToGrid
        snapGrid={SNAP_GRID}
        selectNodesOnDrag
        multiSelectionKeyCode="Shift"
        selectionKeyCode="Shift"
        minZoom={0.35}
        maxZoom={1.8}
        className="relative z-10 !bg-transparent"
      >
        <Background
          id="minor-grid"
          variant={BackgroundVariant.Lines}
          gap={24}
          lineWidth={1}
          color="#edf2f7"
        />
        <Background
          id="major-grid"
          variant={BackgroundVariant.Lines}
          gap={120}
          lineWidth={1}
          color="#e2e8f0"
        />
        <MiniMap
          pannable
          zoomable
          ariaLabel="Canvas overview"
          position="bottom-right"
          nodeBorderRadius={8}
          nodeStrokeWidth={1.2}
          bgColor="rgba(255,255,255,0.96)"
          maskColor="rgba(15,23,42,0.04)"
          maskStrokeColor="#e2e8f0"
          maskStrokeWidth={1}
          style={{ height: 100, width: 150 }}
          nodeColor={(node) => {
            if (node.id === selectedNode) return "#4f46e5";
            if (node.type === "entry") return "#0f172a";
            if (node.type === "branch") return "#a78bfa";
            if (node.type === "externalContext") return "#f59e0b";
            return ((node.data as any)?.color as string | undefined) || "#cbd5e1";
          }}
          nodeStrokeColor={(node) => {
            if (node.id === selectedNode) return "#4f46e5";
            if (node.type === "entry") return "#0f172a";
            return "#e2e8f0";
          }}
          className="!rounded-xl !border !border-slate-200/80 !bg-white/95 !shadow-lg backdrop-blur-md"
          onNodeClick={(_, node) =>
            onNodeSelect(
              node.id,
              ((node.data as any)?.label as string | undefined) || "Node",
              node.type
            )
          }
        />
        <Controls
          showInteractive={false}
          className="!rounded-2xl !border !border-slate-200/80 !bg-white/95 !shadow-xl backdrop-blur-md [&>button]:!border-slate-200/80 [&>button]:!bg-white/90 [&>button]:!text-slate-600 [&>button]:hover:!bg-slate-50 [&>button]:hover:!text-slate-900"
        >
          <ControlButton
            onClick={() => applyAutoLayout()}
            title="Auto arrange"
            aria-label="Auto arrange nodes"
          >
            <LayoutGrid className="h-4 w-4" />
          </ControlButton>
          {selectedNode && (
            <ControlButton
              onClick={() => zoomTo(selectedNode)}
              title="Focus selected node"
              aria-label="Focus selected node"
            >
              <Focus className="h-4 w-4" />
            </ControlButton>
          )}
        </Controls>
      </ReactFlow>
    </div>
  );
}
