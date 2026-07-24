"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  ConnectionMode,
  MiniMap,
  Panel,
  Handle,
  Position,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toast } from "sonner";
import {
  FileText,
  LayoutGrid,
  Maximize2,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { BrandLoader } from "@/components/brand-loader";
import { ChatNode } from "@/components/nodes/chat-node";
import { CompareModal } from "@/components/compare/compare-modal";
import { NodeDetailsDialog } from "@/components/node-details-dialog";
import {
  storageService,
  type CanvasData,
  type NodeData,
} from "@/lib/storage";
import { layoutTree } from "@/lib/canvas-layout";
import { MAX_NODES_PER_CANVAS } from "@/lib/limits";
import {
  isAllowedContextFile,
  MAX_CONTEXT_FILE_MB,
} from "@/lib/file-types";
import { cn } from "@/lib/utils";

// ─── Pure helpers ────────────────────────────────────────────

const genId = (prefix: string) =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}_${crypto.randomUUID()}`
    : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const textFrom = (c: unknown): string => {
  if (!c) return "";
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    for (const p of c) {
      if (typeof p === "string" && p.trim()) return p.trim();
      if (p && typeof p === "object") {
        const t =
          (p as any)?.text?.value ?? (p as any)?.text ?? (p as any)?.value ?? (p as any)?.content;
        if (typeof t === "string" && t.trim()) return t.trim();
      }
    }
    return "";
  }
  if (typeof c === "object") {
    const t =
      (c as any).text?.value ?? (c as any).text ?? (c as any).value ?? (c as any).content;
    if (typeof t === "string") return t.trim();
  }
  return "";
};

const flattenMessages = (msgs: any[] | undefined) => {
  if (!msgs?.length) return [] as any[];
  const out: any[] = [];
  for (const m of msgs) {
    if (!m) continue;
    if (typeof m.role === "string") {
      out.push(m);
      continue;
    }
    const id = m.id || genId("msg");
    if (m.user) out.push({ id: `${id}-user`, role: "user", content: m.user.content });
    if (m.assistant)
      out.push({ id: `${id}-assistant`, role: "assistant", content: m.assistant.content });
  }
  return out;
};

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

/** Lineage hue: stable hash of the tree root's id → one of 8 CSS vars. */
const lineageVarFor = (rootId: string): string => {
  let sum = 0;
  for (let i = 0; i < rootId.length; i++) sum += rootId.charCodeAt(i);
  return `var(--lineage-${sum % 8})`;
};

const defaultNodeName = (node: NodeData): string =>
  node.name ||
  (node.type === "entry"
    ? "Base Context"
    : node.type === "branch"
      ? "Branch"
      : // File nodes created before `name` was persisted carry the
        // filename in data.label — show it instead of a bare "Context".
        ((node as any).data?.label as string) || "Context");

/** Merge server canvas with locally-cached nodes/edges the server may lag on. */
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

// ─── ContextCard node (context + externalContext) ───────────

interface ContextCardData {
  label: string;
  preview?: string;
  isSelected?: boolean;
  loading?: boolean;
  error?: string;
  /** True when an edge links this card to the currently selected chat node. */
  linkedToActive?: boolean;
  onClick?: () => void;
  [key: string]: unknown;
}

type ContextCardNode = Node<ContextCardData>;

const hiddenHandleClass = "!h-1 !w-1 !min-h-0 !min-w-0 !border-0 !bg-transparent";

function ContextCardComponent({ data, selected, isConnectable }: NodeProps<ContextCardNode>) {
  const active = selected || data.isSelected;
  return (
    <div
      className={cn(
        "group w-[240px] cursor-pointer rounded-xl border border-border bg-card px-3.5 py-3",
        "transition-all duration-200 ease-out hover:border-white/15 hover:shadow-md",
        active && "ring-2 ring-primary"
      )}
      onClick={() => data.onClick?.()}
      data-slot="context-card"
    >
      <div className="flex items-center gap-2">
        <FileText size={14} className="shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {data.label || "Context"}
        </span>
        {data.linkedToActive && !data.loading && (
          <span
            title="In the selected node's context"
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-500"
          >
            <span className="h-[5px] w-[5px] rounded-full bg-emerald-500" />
            linked
          </span>
        )}
        {data.loading && (
          <span
            aria-label="Processing"
            className="h-[6px] w-[6px] shrink-0 animate-pulse rounded-full bg-primary"
          />
        )}
      </div>
      {(data.error || data.preview) && (
        <p
          className={cn(
            "mt-1 truncate text-xs",
            data.error ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {data.error || data.preview}
        </p>
      )}
      {/* Target handle is the drop point for chat → context connections:
          a dot on hover; drags also snap to it via connectionRadius. */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        title="Drag here from a chat node to connect this context"
        className="!h-2.5 !w-2.5 !rounded-full !border-2 !border-background !bg-primary opacity-0 transition-opacity duration-150 group-hover:opacity-100"
      />
      <Handle type="source" position={Position.Bottom} isConnectable={false} className={hiddenHandleClass} />
    </div>
  );
}

const ContextCard = memo(ContextCardComponent);

// ─── DemotedChip node (collapsed pill for demoted branches) ──
// Losers of a compare-and-promote collapse to this pill. Clicking still
// opens the console; the RotateCcw button un-demotes — never hidden,
// never deleted.

interface DemotedChipData {
  label: string;
  lineageColor?: string;
  isSelected?: boolean;
  onClick?: () => void;
  onRestore?: () => void;
  [key: string]: unknown;
}

type DemotedChipNode = Node<DemotedChipData>;

function DemotedChipComponent({ data, selected }: NodeProps<DemotedChipNode>) {
  const active = selected || data.isSelected;
  return (
    <div
      className={cn(
        "flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3",
        "transition-all duration-200 ease-out hover:border-white/15 hover:shadow-md",
        active && "ring-2 ring-primary"
      )}
      onClick={() => data.onClick?.()}
      title={`${data.label} — demoted branch`}
      data-slot="demoted-chip"
    >
      <span
        aria-hidden
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: data.lineageColor || "rgba(255,255,255,0.3)" }}
      />
      <span className="type-meta max-w-[140px] truncate text-muted-foreground">
        {data.label}
      </span>
      <button
        type="button"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        onClick={(e) => {
          e.stopPropagation();
          data.onRestore?.();
        }}
        aria-label="Restore branch"
        title="Restore branch"
      >
        <RotateCcw size={12} strokeWidth={1.75} />
      </button>
      <Handle type="target" position={Position.Top} isConnectable={false} className={hiddenHandleClass} />
      <Handle type="source" position={Position.Bottom} isConnectable={false} className={hiddenHandleClass} />
    </div>
  );
}

const DemotedChip = memo(DemotedChipComponent);

const nodeTypes: NodeTypes = {
  chat: ChatNode,
  contextCard: ContextCard,
  demotedChat: DemotedChip,
};

const FIT_VIEW_OPTIONS = { padding: 0.2, maxZoom: 1 } as const;

// ─── Component ───────────────────────────────────────────────

interface CanvasViewProps {
  canvasId: string;
  selectedNode: string | null;
  onNodeSelect: (nodeId: string | null, nodeName?: string, nodeType?: string) => void;
}

function CanvasViewInner({ canvasId, selectedNode, onNodeSelect }: CanvasViewProps) {
  const flow = useReactFlow();

  const [canvas, setCanvas] = useState<CanvasData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detailsNodeId, setDetailsNodeId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Compare & promote (F1): shift-click builds a selection of 2-3 chat
  // nodes; compareNodeIds non-null mounts the side-by-side modal.
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [compareNodeIds, setCompareNodeIds] = useState<string[] | null>(null);

  // Live positions while a node is being dragged (id → position). Committed
  // to the canvas (and the layout PATCH) on drag stop.
  const [dragOverrides, setDragOverrides] = useState<
    Map<string, { x: number; y: number }>
  >(() => new Map());

  // Only the latest in-flight load may commit (guards canvas switches).
  const loadTokenRef = useRef(0);

  // Set on unmount so long-lived async work (polling, saves) stops dead.
  const disposedRef = useRef(false);
  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
    };
  }, []);

  /** Deletion wins: once a canvas is removed from the local cache, no save
   *  path may write it back (locally or server-side). */
  const canvasStillExists = useCallback(
    () => storageService.getCanvas(canvasId) != null,
    [canvasId]
  );

  /** Update canvas state and mirror it into the localStorage cache. */
  const applyCanvas = useCallback(
    (updater: (prev: CanvasData) => CanvasData) => {
      setCanvas((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        // Skip the cache write if the canvas was deleted — saving here would
        // resurrect it in localStorage (saveCanvas re-inserts missing ids).
        if (storageService.getCanvas(next._id) != null) {
          storageService.saveCanvas(next);
        }
        return next;
      });
    },
    []
  );

  // ─── Load canvas (server, merged with local cache) ────────
  useEffect(() => {
    if (!canvasId) return;
    const token = ++loadTokenRef.current;
    const controller = new AbortController();

    // Optimistic: seed from localStorage so switching feels instant.
    setCanvas(storageService.getCanvas(canvasId));
    setDragOverrides(new Map());
    setLoadError(null);
    setIsLoading(true);

    (async () => {
      let data: CanvasData | null = null;
      let failed = false;
      try {
        const res = await fetch(`/api/canvases/${canvasId}`, {
          cache: "no-cache",
          signal: controller.signal,
        });
        if (res.ok) {
          const json = await res.json();
          data = json.canvas
            ? mergeCanvasData(json.canvas, storageService.getCanvas(canvasId))
            : null;
          if (data) storageService.saveCanvas(data);
          if (!data) failed = true;
        } else if (res.status === 404) {
          failed = true;
        } else {
          data = storageService.getCanvas(canvasId);
        }
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        data = storageService.getCanvas(canvasId);
        if (!data) failed = true;
      }

      if (loadTokenRef.current !== token) return;
      setIsLoading(false);
      if (data) {
        setLoadError(null);
        setCanvas(data);
      } else if (failed) {
        setLoadError("Couldn't load this canvas. It may have been deleted.");
        setCanvas(null);
      }
    })();

    return () => controller.abort();
  }, [canvasId, reloadKey]);

  // ─── Window event listeners (console ↔ canvas bridge) ─────

  // Fork created in the console: add node + edge (dedupe late server echoes).
  useEffect(() => {
    const handler = (e: any) => {
      const { canvasId: cid, node, edge } = e.detail || {};
      if (cid !== canvasId || !node) return;
      applyCanvas((prev) => {
        const hasNode = prev.nodes.some((n) => n._id === node._id);
        const hasEdge = edge
          ? prev.edges.some(
              (x) => x._id === edge._id || (x.from === edge.from && x.to === edge.to)
            )
          : true;
        if (hasNode && hasEdge) return prev;
        return {
          ...prev,
          nodes: hasNode ? prev.nodes : [...prev.nodes, node],
          edges: edge && !hasEdge ? [...prev.edges, edge] : prev.edges,
        };
      });
    };
    window.addEventListener("canvas-fork-node", handler);
    return () => window.removeEventListener("canvas-fork-node", handler);
  }, [canvasId, applyCanvas]);

  // Rename / model change / arbitrary node updates from the console.
  // Every field in the event detail (name, model, …) is merged onto the
  // matching node via applyCanvas — state AND the localStorage cache — so
  // the card badge updates instantly and the change survives the next
  // cache-seeded load instead of reverting to the stale cached copy.
  useEffect(() => {
    const handler = (e: any) => {
      const { nodeId, updates } = e.detail || {};
      if (!nodeId || !updates) return;
      applyCanvas((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n._id === nodeId ? { ...n, ...updates } : n)),
      }));
    };
    window.addEventListener("canvas-update-node", handler);
    return () => window.removeEventListener("canvas-update-node", handler);
  }, [applyCanvas]);

  // Selection requests from the console (e.g. after forking).
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

  // Whole-canvas refreshes (e.g. running summaries after a message).
  useEffect(() => {
    const handler = (e: any) => {
      const updated = e.detail;
      if (updated?._id === canvasId) setCanvas(updated);
    };
    window.addEventListener("canvas-data-updated", handler);
    return () => window.removeEventListener("canvas-data-updated", handler);
  }, [canvasId]);

  // ─── Viewport helpers ─────────────────────────────────────
  const zoomToNode = useCallback(
    (nodeId: string) => {
      flow.fitView({
        nodes: [{ id: nodeId }],
        duration: 450,
        padding: 0.4,
        maxZoom: 1.15,
      });
    },
    [flow]
  );

  // ─── Delete node (same confirm + API flow as before) ──────
  const deleteNode = useCallback(
    (nodeId: string) => {
      if (!canvas) return;
      if (nodeId === canvas.primaryNodeId) {
        toast.error("Cannot delete the main node");
        return;
      }
      if (!window.confirm("Delete this node?")) return;

      const updated: CanvasData = {
        ...canvas,
        nodes: canvas.nodes
          .filter((n) => n._id !== nodeId)
          .map((n) =>
            n.parentNodeId === nodeId ? { ...n, parentNodeId: undefined } : n
          ),
        edges: canvas.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
        updatedAt: new Date().toISOString(),
      };
      // Guard: never save a canvas that was deleted (would resurrect it).
      if (canvasStillExists()) storageService.saveCanvas(updated);
      setCanvas(updated);
      if (selectedNode === nodeId) onNodeSelect(null);

      if (!canvasStillExists()) return;
      // Per-node DELETE, never a full-canvas PUT: the PUT path replaces
      // every node's messages from the client's (hollow) copy and wiped
      // parent conversations when deleting a child.
      fetch(`/api/canvases/${canvasId}/nodes/${nodeId}`, { method: "DELETE" })
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to delete node (${res.status})`);
        })
        .catch(() => toast.error("Failed to sync node deletion"));
    },
    [canvas, canvasId, selectedNode, onNodeSelect, canvasStillExists]
  );

  // ─── Compare & promote helpers ────────────────────────────

  /** Un-demote: same PATCH channel as rename; optimistic + persisted. */
  const restoreNode = useCallback(
    (nodeId: string) => {
      applyCanvas((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n._id === nodeId ? { ...n, demoted: false } : n
        ),
      }));
      fetch(`/api/canvases/${canvasId}/nodes/${nodeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoted: false }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to restore (${res.status})`);
        })
        .catch(() => toast.error("Failed to restore branch"));
    },
    [applyCanvas, canvasId]
  );

  /** Pin (or clear) a branch color: optimistic + persisted via node PATCH.
      Descendants pick it up automatically — effective color resolution walks
      ancestors — so one PATCH recolors the whole subtree. */
  const setNodeColor = useCallback(
    (nodeId: string, color: string | null) => {
      applyCanvas((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n._id === nodeId ? { ...n, color: color ?? undefined } : n
        ),
      }));
      fetch(`/api/canvases/${canvasId}/nodes/${nodeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to save color (${res.status})`);
        })
        .catch(() => toast.error("Failed to save branch color"));
    },
    [applyCanvas, canvasId]
  );

  /** Shift-click toggle; capped at 3 branches. */
  const toggleCompareSelect = useCallback((nodeId: string) => {
    setCompareSelection((prev) => {
      if (prev.includes(nodeId)) return prev.filter((id) => id !== nodeId);
      if (prev.length >= 3) {
        toast.error("Compare up to 3 branches at a time");
        return prev;
      }
      return [...prev, nodeId];
    });
  }, []);

  const closeCompare = useCallback(() => {
    setCompareNodeIds(null);
    setCompareSelection([]);
  }, []);

  // Open requests from outside the canvas (console header's
  // "Compare siblings…" dispatches canvas-open-compare with nodeIds).
  // A single id expands to its siblings (same parentNodeId, up to 3 total).
  useEffect(() => {
    const handler = (e: any) => {
      const requested: string[] = e.detail?.nodeIds || [];
      if (!canvas || requested.length === 0) return;
      const isChat = (n: NodeData) => n.type === "entry" || n.type === "branch";
      let ids = requested.filter((id) =>
        canvas.nodes.some((n) => n._id === id && isChat(n))
      );
      if (ids.length === 1) {
        const node = canvas.nodes.find((n) => n._id === ids[0]);
        if (node?.parentNodeId) {
          const siblings = canvas.nodes.filter(
            (s) =>
              s._id !== node._id &&
              s.parentNodeId === node.parentNodeId &&
              isChat(s)
          );
          ids = [node._id, ...siblings.map((s) => s._id)];
        }
      }
      ids = ids.slice(0, 3);
      if (ids.length < 2) {
        toast.error("No sibling branches to compare");
        return;
      }
      setCompareNodeIds(ids);
    };
    window.addEventListener("canvas-open-compare", handler);
    return () => window.removeEventListener("canvas-open-compare", handler);
  }, [canvas]);

  // ─── File drop → externalContext node (kept from old canvas) ─
  const pollForExternalContent = useCallback(
    async (nodeId: string, label: string) => {
      for (let attempt = 0; attempt < 18; attempt++) {
        await new Promise((r) => setTimeout(r, attempt < 6 ? 1500 : 3000));
        // Stop polling once unmounted or the canvas was deleted — otherwise
        // the saveCanvas below would resurrect a deleted canvas in the cache.
        if (disposedRef.current || !canvasStillExists()) return;
        try {
          const res = await fetch(`/api/canvases/${canvasId}`, { cache: "no-cache" });
          if (!res.ok) continue;
          const payload = await res.json();
          const refreshed = payload?.canvas as CanvasData | undefined;
          if (!refreshed) continue;

          const next = mergeCanvasData(refreshed, storageService.getCanvas(canvasId));
          const node = next.nodes.find((n) => n._id === nodeId);
          if (!node) continue;
          if (disposedRef.current || !canvasStillExists()) return;
          const data = (node.data && typeof node.data === "object" ? node.data : {}) as Record<
            string,
            any
          >;
          const content = typeof data.content === "string" ? data.content.trim() : "";
          const error = typeof data.error === "string" ? data.error.trim() : "";

          storageService.saveCanvas(next);
          setCanvas(next);

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
    },
    [canvasId, canvasStillExists]
  );

  const uploadFile = useCallback(
    async (file: File) => {
      if (!isAllowedContextFile(file.name)) {
        toast.error("Unsupported file type — use PDF, TXT, MD, DOC or DOCX");
        return;
      }
      if (file.size > MAX_CONTEXT_FILE_MB * 1024 * 1024) {
        toast.error(`File too large — max ${MAX_CONTEXT_FILE_MB}MB`);
        return;
      }
      if ((canvas?.nodes?.length || 0) >= MAX_NODES_PER_CANVAS) {
        toast.error(
          `Canvas is full — max ${MAX_NODES_PER_CANVAS} nodes. Delete unused branches or start a new canvas.`
        );
        return;
      }
      const nodeId = genId("node");
      const now = new Date().toISOString();
      const newNode: NodeData = {
        _id: nodeId,
        name: file.name,
        primary: false,
        type: "externalContext",
        chatMessages: [],
        runningSummary: "",
        contextContract: "Processing...",
        model: "",
        createdAt: now,
        data: { label: file.name, fileType: file.type, size: file.size, loading: true },
      };

      applyCanvas((prev) => ({ ...prev, nodes: [...prev.nodes, newNode], updatedAt: now }));

      try {
        const nodeRes = await fetch(`/api/canvases/${canvasId}/nodes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newNode),
        });
        if (!nodeRes.ok) {
          const detail = await nodeRes.json().catch(() => null);
          applyCanvas((prev) => ({
            ...prev,
            nodes: prev.nodes.filter((n) => n._id !== nodeId),
          }));
          toast.error(detail?.error || `Failed to create upload node for ${file.name}`);
          return;
        }
      } catch {
        applyCanvas((prev) => ({
          ...prev,
          nodes: prev.nodes.filter((n) => n._id !== nodeId),
        }));
        toast.error(`Failed to create upload node for ${file.name}`);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("canvasId", canvasId);
      formData.append("nodeId", nodeId);
      formData.append("position", JSON.stringify({ x: 0, y: 0 }));

      const markFailed = (message: string) => {
        applyCanvas((prev) => ({
          ...prev,
          nodes: prev.nodes.map((n) =>
            n._id === nodeId
              ? ({
                  ...n,
                  contextContract: "Upload failed",
                  data: { ...((n.data || {}) as any), loading: false, error: message },
                } as NodeData)
              : n
          ),
        }));
        fetch(`/api/canvases/${canvasId}/nodes/${nodeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contextContract: "Upload failed",
            data: { ...((newNode.data || {}) as any), loading: false, error: message },
          }),
        }).catch(() => {});
        toast.error(message);
      };

      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          applyCanvas((prev) => ({
            ...prev,
            nodes: prev.nodes.map((n) =>
              n._id === nodeId
                ? ({
                    ...n,
                    data: {
                      ...((n.data || {}) as any),
                      loading: true,
                      fileId: data?.fileId,
                      error: undefined,
                    },
                  } as NodeData)
                : n
            ),
          }));
          toast.success(`${file.name} uploaded. Processing started.`);
          void pollForExternalContent(nodeId, file.name);
        } else {
          const detail = await res.json().catch(() => null);
          markFailed(detail?.error || `Failed to upload ${file.name}`);
        }
      } catch {
        markFailed(`Failed to upload ${file.name}`);
      }
    },
    [applyCanvas, canvas, canvasId, pollForExternalContent]
  );

  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      if (!canvas) return;
      const files = Array.from(event.dataTransfer.files || []);
      for (const file of files) await uploadFile(file);
    },
    [canvas, uploadFile]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  // ─── Manual layout: drag + persist + Tidy ─────────────────

  /** Persist node positions via the existing V1 layout endpoint. */
  const persistLayout = useCallback(
    (positions: { id: string; position: { x: number; y: number } }[]) => {
      if (!positions.length) return;
      // Deletion wins: never write layout for a canvas removed from the cache.
      if (disposedRef.current || !canvasStillExists()) return;
      fetch(`/api/canvases/${canvasId}/layout`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes: positions }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to save layout (${res.status})`);
        })
        .catch(() => toast.error("Failed to save layout"));
    },
    [canvasId, canvasStillExists]
  );

  // Apply live drag movement (we only consume position changes — selection
  // stays driven by data.isSelected exactly as before).
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    setDragOverrides((prev) => {
      let next: Map<string, { x: number; y: number }> | null = null;
      for (const change of changes) {
        if (change.type === "position" && change.position) {
          if (!next) next = new Map(prev);
          next.set(change.id, change.position);
        }
      }
      return next ?? prev;
    });
  }, []);

  // Drag stop: commit the moved node(s) into canvas state + local cache and
  // persist through PATCH /api/canvases/{canvasId}/layout.
  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node, draggedNodes: Node[]) => {
      const moved = draggedNodes?.length ? draggedNodes : [node];
      const payload = moved
        .filter((n): n is Node => Boolean(n))
        .map((n) => ({
          id: n.id,
          position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
        }));
      if (!payload.length) return;
      applyCanvas((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => {
          const match = payload.find((p) => p.id === n._id);
          return match ? { ...n, position: match.position } : n;
        }),
      }));
      persistLayout(payload);
    },
    [applyCanvas, persistLayout]
  );

  // ─── Manual context connections ───────────────────────────
  // Users connect/disconnect context cards to chat nodes by hand (drag
  // between handles; click a dashed edge to detach). Chat↔chat edges are
  // fork lineage and stay system-managed — deleting one would corrupt the
  // tree, so onConnect rejects those and lineage edges are never clickable.
  // Persistence uses the surgical per-edge endpoints, never a whole-canvas
  // save (dual-writer lesson: a full-document PUT can wipe state the client
  // never owned).

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!canvas || !connection.source || !connection.target) return;
      if (connection.source === connection.target) return;
      const byId = new Map(canvas.nodes.map((n) => [n._id, n]));
      const a = byId.get(connection.source);
      const b = byId.get(connection.target);
      if (!a || !b) return;
      const isCtx = (n: NodeData) => n.type === "context" || n.type === "externalContext";
      const isChat = (n: NodeData) => n.type === "entry" || n.type === "branch";
      // Normalize: context edges always run chat → context, matching the
      // console's chip-row connect (meta.condition "Context").
      let chatN: NodeData | undefined;
      let ctxN: NodeData | undefined;
      if (isChat(a) && isCtx(b)) [chatN, ctxN] = [a, b];
      else if (isCtx(a) && isChat(b)) [chatN, ctxN] = [b, a];
      if (!chatN || !ctxN) {
        toast.error(
          "Connect a context card to a chat node — branch links are managed automatically."
        );
        return;
      }
      const chatId = chatN._id;
      const ctxId = ctxN._id;
      const exists = canvas.edges.some(
        (e) =>
          (e.from === chatId && e.to === ctxId) ||
          (e.from === ctxId && e.to === chatId)
      );
      if (exists) {
        toast(`${ctxN.name || "Context"} is already connected`);
        return;
      }
      const now = new Date().toISOString();
      const edge = {
        _id: genId("edge"),
        from: chatId,
        to: ctxId,
        createdAt: now,
        meta: { condition: "Context" },
      };
      applyCanvas((prev) => ({ ...prev, edges: [...prev.edges, edge], updatedAt: now }));
      fetch(`/api/canvases/${canvasId}/edges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edge),
      })
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          toast.success(`${ctxN!.name || "Context"} connected`);
        })
        .catch(() => {
          applyCanvas((prev) => ({
            ...prev,
            edges: prev.edges.filter((e) => e._id !== edge._id),
          }));
          toast.error("Failed to connect — try again");
        });
    },
    [canvas, canvasId, applyCanvas]
  );

  const handleEdgeClick = useCallback(
    (_event: ReactMouseEvent, flowEdge: Edge) => {
      if (!canvas) return;
      const stored = canvas.edges.find((e) => e._id === flowEdge.id);
      if (!stored) return;
      const byId = new Map(canvas.nodes.map((n) => [n._id, n]));
      const isCtx = (n?: NodeData) =>
        n?.type === "context" || n?.type === "externalContext";
      const ctx = isCtx(byId.get(stored.to))
        ? byId.get(stored.to)
        : isCtx(byId.get(stored.from))
          ? byId.get(stored.from)
          : undefined;
      if (!ctx) return; // lineage edge — not detachable
      applyCanvas((prev) => ({
        ...prev,
        edges: prev.edges.filter((e) => e._id !== stored._id),
      }));
      fetch(`/api/canvases/${canvasId}/edges/${stored._id}`, { method: "DELETE" })
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
        })
        .catch(() => {
          applyCanvas((prev) => ({ ...prev, edges: [...prev.edges, stored] }));
          toast.error("Failed to disconnect — try again");
        });
      toast.success(
        `${ctx.name || "Context"} disconnected — drag from a chat node to reconnect`
      );
    },
    [canvas, canvasId, applyCanvas]
  );

  // Dagre auto-layout for every visible node — the fallback for nodes with
  // no stored position, and the target layout for the Tidy button.
  const autoPositions = useMemo(() => {
    if (!canvas) return new Map<string, { x: number; y: number }>();
    const visible = canvas.nodes.filter((n) => n.type !== "group");
    const visibleIds = new Set(visible.map((n) => n._id));
    return layoutTree(
      visible.map((n) => ({ id: n._id })),
      canvas.edges
        .filter((e) => visibleIds.has(e.from) && visibleIds.has(e.to))
        .map((e) => ({ source: e.from, target: e.to }))
    );
  }, [canvas]);

  /** Tidy: recompute dagre for ALL nodes, apply, and persist — replacing any
   *  manual positions with the tidy ones. */
  const tidyLayout = useCallback(() => {
    if (!canvas || !autoPositions.size) return;
    setDragOverrides(new Map());
    applyCanvas((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => {
        const pos = autoPositions.get(n._id);
        return pos ? { ...n, position: pos } : n;
      }),
    }));
    persistLayout(
      Array.from(autoPositions, ([id, position]) => ({ id, position }))
    );
    requestAnimationFrame(() => flow.fitView({ ...FIT_VIEW_OPTIONS, duration: 400 }));
  }, [canvas, autoPositions, applyCanvas, persistLayout, flow]);

  // ─── Server data → flow graph (single pure derivation) ────
  const { flowNodes, flowEdges, entryNode, isEmpty } = useMemo(() => {
    if (!canvas) {
      return {
        flowNodes: [] as Node[],
        flowEdges: [] as Edge[],
        entryNode: null as NodeData | null,
        isEmpty: false,
      };
    }

    // Groups are ignored entirely: children render flat.
    const visible = canvas.nodes.filter((n) => n.type !== "group");
    const visibleIds = new Set(visible.map((n) => n._id));
    const byId = new Map(visible.map((n) => [n._id, n]));

    // Every node inherits the lineage hue of its tree root.
    const rootCache = new Map<string, string>();
    const rootOf = (id: string): string => {
      const cached = rootCache.get(id);
      if (cached) return cached;
      let cur = id;
      const seen = new Set<string>();
      while (!seen.has(cur)) {
        seen.add(cur);
        const pid = byId.get(cur)?.parentNodeId;
        if (!pid || !byId.has(pid)) break;
        cur = pid;
      }
      rootCache.set(id, cur);
      return cur;
    };
    const lineageColorOf = (id: string) => lineageVarFor(rootOf(id));

    // Effective branch color: the nearest ancestor (or self) with a pinned
    // color wins, and the tint fades as the lineage deepens below it —
    // "decide a colour per child; going down, it gets fainter". With no pin
    // anywhere up the chain, fall back to the root-hash hue faded by depth.
    const FADE_STEP = 14; // % lost per level below the color source
    const FADE_FLOOR = 38; // never fade past this — stays visible
    const fadeOf = (depth: number) =>
      Math.max(FADE_FLOOR, 100 - depth * FADE_STEP);
    const withFade = (color: string, depth: number) => {
      const fade = fadeOf(depth);
      return fade >= 100
        ? color
        : `color-mix(in srgb, ${color} ${fade}%, transparent)`;
    };
    const effectiveColorOf = (id: string): string => {
      let cur = byId.get(id);
      let depth = 0;
      const seen = new Set<string>();
      while (cur && !seen.has(cur._id)) {
        const picked = (cur as any).color;
        if (typeof picked === "string" && picked.trim())
          return withFade(picked.trim(), depth);
        seen.add(cur._id);
        cur = cur.parentNodeId ? byId.get(cur.parentNodeId) : undefined;
        depth++;
      }
      // depth overshoots by 1 when the walk falls off the root
      return withFade(lineageColorOf(id), Math.max(0, depth - 1));
    };

    // Active-node presence: the open node's ancestor chain lights up. Walk
    // parentNodeId from the selected node to its root once (O(depth)) and
    // collect the parent→child edge pairs; each edge below then checks the
    // set in O(1). The whole derivation is already memoized on
    // (canvas, selectedNode), so this costs nothing on unrelated renders.
    const activePathEdges = new Set<string>();
    if (selectedNode) {
      let cur = byId.get(selectedNode);
      const walked = new Set<string>();
      while (cur?.parentNodeId && !walked.has(cur._id)) {
        walked.add(cur._id);
        activePathEdges.add(`${cur.parentNodeId}→${cur._id}`);
        cur = byId.get(cur.parentNodeId);
      }
    }

    // Always auto-align (owner decision): dagre positions only — stored
    // positions and drag overrides are ignored; the tree tidies itself.
    const resolvePosition = (node: NodeData) =>
      autoPositions.get(node._id) || { x: 0, y: 0 };

    const nodes: Node[] = visible.map((node) => {
      const isChat = node.type === "entry" || node.type === "branch";
      const label = defaultNodeName(node);
      const position = resolvePosition(node);
      const parent = node.parentNodeId ? byId.get(node.parentNodeId) : undefined;

      if (isChat) {
        // Demoted (compare losers) collapse to a recoverable pill.
        if (node.demoted) {
          return {
            id: node._id,
            type: "demotedChat",
            position,
            draggable: false,
            connectable: false,
            data: {
              label,
              lineageColor: effectiveColorOf(node._id),
              isSelected: selectedNode === node._id,
              onClick: () => onNodeSelect(node._id, label, node.type),
              onRestore: () => restoreNode(node._id),
            },
          } as Node;
        }

        return {
          id: node._id,
          type: "chat",
          position,
          draggable: false,
          connectable: true, // source handle → drag to a context card
          data: {
            label,
            preview: derivePreview(node),
            model: node.model,
            messageCount: node.chatMessages?.length || 0,
            timestamp: node.chatMessages?.slice(-1)[0]?.timestamp || node.createdAt,
            lineageColor: effectiveColorOf(node._id),
            color: (node as any).color || null,
            onSetColor: (c: string | null) => setNodeColor(node._id, c),
            kind: node.type,
            parentName:
              node.type === "branch" && parent ? defaultNodeName(parent) : undefined,
            isSelected: selectedNode === node._id,
            compareSelected: compareSelection.includes(node._id),
            onClick: () => onNodeSelect(node._id, label, node.type),
            onToggleCompare: () => toggleCompareSelect(node._id),
            onFocus: () => zoomToNode(node._id),
            onShowDetails: () => setDetailsNodeId(node._id),
            onDelete: () => deleteNode(node._id),
          },
        } as Node;
      }

      // context / externalContext (and anything unknown) → compact card.
      const nodeData = (node.data && typeof node.data === "object" ? node.data : {}) as Record<
        string,
        any
      >;
      const content = typeof nodeData.content === "string" ? nodeData.content.trim() : "";
      const error = typeof nodeData.error === "string" ? nodeData.error.trim() : "";
      const contract =
        typeof node.contextContract === "string" ? node.contextContract.trim() : "";
      const processing =
        node.type === "externalContext" &&
        !error &&
        !content &&
        (Boolean(nodeData.loading) || contract.toLowerCase() === "processing...");

      const linkedToActive = Boolean(
        selectedNode &&
          canvas.edges.some(
            (e) =>
              (e.from === selectedNode && e.to === node._id) ||
              (e.to === selectedNode && e.from === node._id)
          )
      );
      return {
        id: node._id,
        type: "contextCard",
        position,
        draggable: false,
        connectable: true, // target handle ← receives chat connections
        data: {
          label,
          preview: processing ? "Processing…" : content || contract || derivePreview(node),
          error: error || undefined,
          loading: processing,
          linkedToActive,
          lineageColor: effectiveColorOf(node._id),
          isSelected: selectedNode === node._id,
          onClick: () => onNodeSelect(node._id, label, node.type),
        },
      } as Node;
    });

    const isCtxType = (n?: NodeData) =>
      n?.type === "context" || n?.type === "externalContext";
    const edges: Edge[] = canvas.edges
      .filter((e) => visibleIds.has(e.from) && visibleIds.has(e.to))
      .map((e) => {
        // Edges on the selected node's ancestor path render at full lineage
        // color and heavier stroke; everything else stays faded.
        const onActivePath = activePathEdges.has(`${e.from}→${e.to}`);
        // Context edges are user-detachable: dashed + clickable (see
        // handleEdgeClick). Lineage edges never capture pointer events.
        const contextEdge = isCtxType(byId.get(e.from)) || isCtxType(byId.get(e.to));
        // Lineage edges take the CHILD's effective color (each child's chosen
        // hue shows on its incoming edge); context edges take the chat side's.
        const strokeSourceId = contextEdge
          ? isCtxType(byId.get(e.from))
            ? e.to
            : e.from
          : e.to;
        const strokeColor = effectiveColorOf(strokeSourceId);
        return {
          id: e._id,
          source: e.from,
          target: e.to,
          type: "default", // bezier
          selectable: false,
          focusable: false,
          interactionWidth: contextEdge ? 16 : 0,
          style: {
            ...(onActivePath
              ? { stroke: strokeColor, strokeWidth: 2 }
              : {
                  stroke: `color-mix(in srgb, ${strokeColor} 45%, transparent)`,
                  strokeWidth: 1.5,
                }),
            ...(contextEdge ? { strokeDasharray: "6 4" } : {}),
          },
        };
      });

    const chatNodes = visible.filter((n) => n.type === "entry" || n.type === "branch");
    const branchCount = chatNodes.filter((n) => n.type === "branch").length;
    const messageTotal = chatNodes.reduce((s, n) => s + (n.chatMessages?.length || 0), 0);
    const entry =
      visible.find((n) => n._id === canvas.primaryNodeId && n.type !== "group") ||
      chatNodes.find((n) => n.type === "entry") ||
      chatNodes[0] ||
      null;

    return {
      flowNodes: nodes,
      flowEdges: edges,
      entryNode: entry,
      isEmpty: chatNodes.length === 0 || (branchCount === 0 && messageTotal === 0),
    };
  }, [
    canvas,
    selectedNode,
    compareSelection,
    dragOverrides,
    autoPositions,
    onNodeSelect,
    zoomToNode,
    deleteNode,
    restoreNode,
    setNodeColor,
    toggleCompareSelect,
  ]);

  // ─── Viewport reactions ───────────────────────────────────

  // Animate fitView when new nodes appear (fork, upload, first load).
  const prevIdsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(flowNodes.map((n) => n.id));
    const prev = prevIdsRef.current;
    prevIdsRef.current = ids;
    // First run: the fitView prop handles the initial fit. Afterwards any
    // newly-appearing node (fork, upload, late load) animates a re-fit.
    if (!prev) return;
    let hasNew = false;
    ids.forEach((id) => {
      if (!prev.has(id)) hasNew = true;
    });
    if (!hasNew) return;
    requestAnimationFrame(() => {
      flow.fitView({ ...FIT_VIEW_OPTIONS, duration: 500 });
    });
  }, [flowNodes, flow]);

  // Zoom to the selected node when selection changes (covers search
  // navigation from GlobalSearch as well as console-driven selection).
  const lastZoomedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedNode) {
      lastZoomedRef.current = null;
      return;
    }
    if (lastZoomedRef.current === selectedNode) return;
    if (!flowNodes.some((n) => n.id === selectedNode)) return; // retry once it renders
    lastZoomedRef.current = selectedNode;
    zoomToNode(selectedNode);
  }, [selectedNode, flowNodes, zoomToNode]);

  // ─── Render ───────────────────────────────────────────────
  const detailsNode = detailsNodeId
    ? canvas?.nodes.find((n) => n._id === detailsNodeId) || null
    : null;
  const detailsParent = detailsNode?.parentNodeId
    ? canvas?.nodes.find((n) => n._id === detailsNode.parentNodeId)
    : null;

  const controlButtonClass =
    "flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-background"
      onDrop={onDrop}
      onDragOver={onDragOver}
      data-slot="canvas-view"
    >
      {/* Loading — only when we have no cached canvas to paint */}
      {isLoading && !canvas && !loadError && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <BrandLoader variant="pulse" size={48} label="Loading canvas" />
            <p className="text-xs font-medium text-muted-foreground">Loading canvas…</p>
          </div>
        </div>
      )}

      {/* Load error */}
      {loadError && !isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <div className="max-w-sm space-y-3 rounded-2xl border border-border bg-card px-8 py-7 text-center shadow-xl">
            <p className="text-sm font-semibold text-foreground">{loadError}</p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Empty state — entry exists but no conversation has started.
          Compact hint card pinned to the lower third so it can never sit on
          top of the entry node card. */}
      {isEmpty && !isLoading && !loadError && !selectedNode && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center px-4">
          <div className="pointer-events-auto flex max-w-xs flex-col items-center gap-1 rounded-xl border border-border bg-card/90 px-5 py-4 text-center shadow-lg backdrop-blur">
            <p className="text-sm font-semibold text-foreground">
              Start your first conversation
            </p>
            <p className="text-xs text-muted-foreground">
              Chat first — branch when a side-question appears.
            </p>
            {entryNode && (
              <button
                type="button"
                onClick={() =>
                  onNodeSelect(entryNode._id, defaultNodeName(entryNode), entryNode.type)
                }
                className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
              >
                Start chatting
              </button>
            )}
          </div>
        </div>
      )}

      {/* elementsSelectable must stay true: with draggable+connectable+
          selectable all false, xyflow marks nodes pointer-events:none and
          clicks fall through to the pane (deselect). Edges opt out
          individually via selectable: false. */}
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onPaneClick={() => onNodeSelect(null)}
        onNodeDoubleClick={(_, node) => zoomToNode(node.id)}
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        edgesFocusable={false}
        zoomOnDoubleClick={false}
        panOnDrag
        onConnect={handleConnect}
        onEdgeClick={handleEdgeClick}
        // Loose: users may start the drag from either end (chat source or
        // context target); handleConnect normalizes direction and rejects
        // chat↔chat. connectionRadius makes drops forgiving — near a valid
        // handle is enough.
        connectionMode={ConnectionMode.Loose}
        connectionRadius={40}
        minZoom={0.25}
        maxZoom={1.75}
        className="!bg-background"
        style={{ background: "var(--background)" }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1.5}
          color="rgba(255,255,255,0.04)"
        />

        {flowNodes.length > 8 && (
          <MiniMap
            pannable
            zoomable
            ariaLabel="Canvas overview"
            position="bottom-right"
            bgColor="var(--card)"
            maskColor="rgba(0,0,0,0.45)"
            maskStrokeColor="rgba(255,255,255,0.12)"
            maskStrokeWidth={1}
            nodeBorderRadius={8}
            nodeStrokeColor="transparent"
            nodeColor={(node) =>
              ((node.data as any)?.lineageColor as string | undefined) ||
              "rgba(255,255,255,0.2)"
            }
            style={{ width: 150, height: 100 }}
            className="!rounded-xl !border !border-border !bg-card !shadow-lg"
          />
        )}

        {/* Compare action bar — appears once 2+ branches are shift-selected */}
        {compareSelection.length >= 2 && (
          <Panel position="bottom-center">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-popover px-3 py-2 shadow-lg">
              <button
                type="button"
                onClick={() => setCompareNodeIds(compareSelection.slice(0, 3))}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Compare {compareSelection.length} branches
              </button>
              <button
                type="button"
                onClick={() => setCompareSelection([])}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Clear compare selection"
                title="Clear selection"
              >
                <X size={14} strokeWidth={1.75} />
              </button>
            </div>
          </Panel>
        )}

        {/* Dark controls cluster — zoom in / zoom out / fit */}
        <Panel position="bottom-left">
          <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            <button
              type="button"
              className={controlButtonClass}
              onClick={() => flow.zoomIn({ duration: 200 })}
              aria-label="Zoom in"
              title="Zoom in"
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              className={controlButtonClass}
              onClick={() => flow.zoomOut({ duration: 200 })}
              aria-label="Zoom out"
              title="Zoom out"
            >
              <ZoomOut size={14} />
            </button>
            <button
              type="button"
              className={controlButtonClass}
              onClick={() => flow.fitView({ ...FIT_VIEW_OPTIONS, duration: 400 })}
              aria-label="Fit view"
              title="Fit view"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </Panel>
      </ReactFlow>

      <NodeDetailsDialog
        open={Boolean(detailsNode)}
        onClose={() => setDetailsNodeId(null)}
        node={detailsNode}
        parentName={
          detailsParent?.name ||
          (detailsParent?.type === "entry" ? "Base Context" : null)
        }
      />

      {compareNodeIds && canvas && (
        <CompareModal
          canvasId={canvasId}
          canvas={canvas}
          nodeIds={compareNodeIds}
          onClose={closeCompare}
          onSelectNode={(node) => {
            closeCompare();
            onNodeSelect(node._id, defaultNodeName(node), node.type);
          }}
        />
      )}
    </div>
  );
}

export function CanvasView(props: CanvasViewProps) {
  return (
    <ReactFlowProvider>
      <CanvasViewInner {...props} />
    </ReactFlowProvider>
  );
}
