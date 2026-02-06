"use client";

import type React from "react";
import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import ReactFlow, {
  type Node,
  type Edge,
  type EdgeChange,
  type NodeChange,
  addEdge,
  type Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  MarkerType,
  useReactFlow,
  type NodeTypes,
  type Viewport,
  ConnectionLineType,
} from "reactflow";
import "reactflow/dist/style.css";
import { PlusSquare, Save, X } from "lucide-react";
import { getDefaultModel } from "@/lib/models";

import { EntryNodeMinimal as EntryNode } from "./nodes/entry-node-minimal";
import { BranchNodeMinimal as BranchNode } from "./nodes/branch-node-minimal";
import { ContextNodeMinimal as ContextNode } from "./nodes/context-node-minimal";
import { GroupNode } from "./nodes/group-node";
import { ExternalContextNode } from "./nodes/external-context-node";

// Simplified React Flow nodes only

// Edge imports
import { CustomEdgeMinimal as CustomEdge } from "./edges/custom-edge-minimal";
import { NodeCustomizationPanel } from "./node-customization/node-customization-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  storageService,
  type CanvasData,
  type NodeData,
  type EdgeData,
} from "@/lib/storage";

// Helper function to get appropriate text color and dot color based on background
const getColorScheme = (bgColor: string) => {
  const lightColors: Record<
    string,
    { text: string; dot: string; edge: string }
  > = {
    "#e0e7ff": { text: "#4338ca", dot: "#6366f1", edge: "#a5b4fc" }, // Light indigo
    "#dcfce7": { text: "#15803d", dot: "#22c55e", edge: "#86efac" }, // Light green
    "#fef3c7": { text: "#d97706", dot: "#f59e0b", edge: "#fcd34d" }, // Light amber
    "#fce7f3": { text: "#be185d", dot: "#ec4899", edge: "#f9a8d4" }, // Light pink
    "#e0f2fe": { text: "#0891b2", dot: "#06b6d4", edge: "#67e8f9" }, // Light cyan
    "#f3e8ff": { text: "#7c3aed", dot: "#8b5cf6", edge: "#c4b5fd" }, // Light purple
    "#fed7d7": { text: "#dc2626", dot: "#ef4444", edge: "#fca5a5" }, // Light red
    "#f0f9ff": { text: "#1d4ed8", dot: "#3b82f6", edge: "#93c5fd" }, // Light blue
  };

  return (
    lightColors[bgColor] || { text: "#475569", dot: "#64748b", edge: "#94a3b8" }
  );
};

// Define nodeTypes outside component to prevent recreation
const basicNodeTypes: NodeTypes = {
  entry: EntryNode,
  branch: BranchNode,
  context: ContextNode,
  group: GroupNode,
  externalContext: ExternalContextNode,
};

// Using basic node types only

// Define edge types
const edgeTypes = {
  custom: CustomEdge,
};

const LAYOUT_SAVE_DEBOUNCE_MS = 800;
const EDGE_HIGHLIGHT_COLOR = "#3b82f6";
const GROUP_DEFAULT_DIMENSIONS = { width: 420, height: 260 } as const;
const FLOW_LAYOUT_STORAGE_PREFIX = "contexttree_flow_layout_";

interface StoredNodeLayout {
  id: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
}

interface StoredFlowLayout {
  nodes: StoredNodeLayout[];
  viewport?: { x: number; y: number; zoom: number };
}

const generateEntityId = (prefix: string) => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const getTextFromContent = (content: any): string => {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    for (const part of content) {
      if (!part) continue;
      if (typeof part === "string") {
        const trimmed = part.trim();
        if (trimmed) return trimmed;
        continue;
      }
      if (typeof part === "object") {
        if (typeof part.text === "string" && part.text.trim()) {
          return part.text.trim();
        }
        if (part.text && typeof part.text.value === "string") {
          const trimmed = part.text.value.trim();
          if (trimmed) return trimmed;
        }
        if (typeof part.value === "string" && part.value.trim()) {
          return part.value.trim();
        }
        if (typeof part.content === "string" && part.content.trim()) {
          return part.content.trim();
        }
      }
    }
    return "";
  }
  if (typeof content === "object") {
    if (typeof (content as any).text === "string") {
      return (content as any).text.trim();
    }
    if (
      (content as any).text &&
      typeof (content as any).text.value === "string"
    ) {
      return (content as any).text.value.trim();
    }
    if (typeof (content as any).value === "string") {
      return (content as any).value.trim();
    }
    if (typeof (content as any).content === "string") {
      return (content as any).content.trim();
    }
  }
  return "";
};

const flattenChatMessages = (messages: any[] | undefined) => {
  if (!messages || !Array.isArray(messages)) return [] as any[];
  const flattened: any[] = [];
  messages.forEach((msg) => {
    if (!msg) return;
    if (typeof msg.role === "string") {
      flattened.push(msg);
      return;
    }
    const baseId = msg.id || generateEntityId("msg");
    if (msg.user) {
      flattened.push({
        id: `${baseId}-user`,
        role: "user",
        content: msg.user.content,
      });
    }
    if (msg.assistant) {
      flattened.push({
        id: `${baseId}-assistant`,
        role: "assistant",
        content: msg.assistant.content,
      });
    }
  });
  return flattened;
};

const normalizeForkMessageId = (id?: string | null) => {
  if (!id) return id || "";
  return id.replace(/(-assistant|-user|-a|-u|_a|_u)$/i, "");
};

const deriveParentMessageDetails = (node: NodeData | undefined) => {
  if (!node) return { messageId: undefined as string | undefined, text: "" };
  const flattened = flattenChatMessages(node.chatMessages);
  if (!flattened.length) {
    return { messageId: undefined, text: "" };
  }
  const reversed = [...flattened].reverse();
  const assistantMessage = reversed.find((msg) => msg.role === "assistant");
  const fallbackMessage = flattened[flattened.length - 1];
  const chosen = assistantMessage || fallbackMessage;
  const messageText = getTextFromContent(chosen?.content).trim();
  return {
    messageId: normalizeForkMessageId(chosen?.id),
    text: messageText,
  };
};

const truncateLabel = (input: string, fallback: string) => {
  const trimmed = input.replace(/\s+/g, " ").trim();
  if (!trimmed) return fallback;
  const max = 60;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 3).trimEnd()}...`;
};

const derivePreviewText = (node: NodeData | undefined | null): string => {
  if (!node) return "";

  // For the base context, prioritize the frozen prompt/context, not replies
  if (node.type === "entry") {
    const contract = (node as any).contextContract;
    if (typeof contract === "string" && contract.trim()) {
      return contract.trim();
    }

    const messages = flattenChatMessages(node.chatMessages);
    // Prefer earliest user/system content to reflect intent
    for (let i = 0; i < messages.length; i++) {
      const role = (messages[i] as any)?.role;
      if (role === "user" || role === "system") {
        const text = getTextFromContent(messages[i]?.content);
        if (text) return text;
      }
    }
    // Fallback to any content if no user/system found
    for (let i = 0; i < messages.length; i++) {
      const text = getTextFromContent(messages[i]?.content);
      if (text) return text;
    }
  }

  const summary = (node as any).runningSummary;
  if (typeof summary === "string" && summary.trim()) {
    return summary.trim();
  }

  const messages = flattenChatMessages(node.chatMessages);
  for (let i = messages.length - 1; i >= 0; i--) {
    const text = getTextFromContent(messages[i]?.content);
    if (text) return text;
  }

  const contract = (node as any).contextContract;
  if (typeof contract === "string" && contract.trim()) {
    return contract.trim();
  }

  if (typeof node.name === "string" && node.name.trim()) {
    return node.name.trim();
  }

  return "";
};

const getLengthTag = (text: string): "short" | "medium" | "long" => {
  const len = text.trim().length;
  if (len <= 80) return "short";
  if (len <= 220) return "medium";
  return "long";
};

const getLineageEdgeIds = (
  canvas: CanvasData | null,
  nodeId: string | null
) => {
  const highlighted = new Set<string>();
  if (!canvas || !nodeId) return highlighted;

  const nodeMap = new Map<string, NodeData>(
    canvas.nodes.map((node) => [node._id, node])
  );
  const edgeMap = new Map<string, EdgeData>(
    canvas.edges.map((edge) => [`${edge.from}::${edge.to}`, edge])
  );

  let currentId: string | undefined | null = nodeId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);

    const currentNode = nodeMap.get(currentId);
    if (!currentNode) break;

    const parentId = (currentNode as any)?.parentNodeId;
    if (!parentId || typeof parentId !== "string") break;

    const parentEdge = edgeMap.get(`${parentId}::${currentId}`);
    if (parentEdge) highlighted.add(parentEdge._id);

    currentId = parentId;
  }

  if (highlighted.size === 0 && canvas.primaryNodeId) {
    canvas.edges.forEach((edge) => {
      if (edge.to === nodeId && edge.from === canvas.primaryNodeId) {
        highlighted.add(edge._id);
      }
    });
  }

  return highlighted;
};

const HORIZONTAL_GAP = 260;
const VERTICAL_GAP = 180;
const MAX_VISIBLE_ALTERNATIVES = 3;

const getLineageNodeSet = (canvas: CanvasData | null, nodeId: string | null) => {
  const set = new Set<string>();
  if (!canvas || !nodeId) return set;
  const parentMap = new Map<string, string | undefined>();
  const childrenMap = new Map<string, string[]>();

  canvas.nodes.forEach((n) => {
    const parentId = (n as any).parentNodeId as string | undefined;
    parentMap.set(n._id, parentId);
    if (!childrenMap.has(parentId || "root")) childrenMap.set(parentId || "root", []);
    childrenMap.get(parentId || "root")!.push(n._id);
  });

  const collectAncestors = (id: string | undefined | null) => {
    let current = id;
    while (current) {
      if (set.has(current)) break;
      set.add(current);
      current = parentMap.get(current);
    }
  };

  const collectDescendants = (id: string) => {
    const kids = childrenMap.get(id) || [];
    for (const child of kids) {
      if (set.has(child)) continue;
      set.add(child);
      collectDescendants(child);
    }
  };

  set.add(nodeId);
  collectAncestors(parentMap.get(nodeId));
  collectDescendants(nodeId);
  return set;
};

const computeLayout = (nodes: NodeData[], expandedOverflowParents?: Set<string>) => {
  const depthMap = new Map<string, number>();
  const branchIndexMap = new Map<string, number>();
  const branchBadgeIndexMap = new Map<string, number>();
  const overflowByParent = new Map<string, number>();
  const hiddenAlternatives = new Set<string>();

  const childrenByParent = new Map<string | undefined, NodeData[]>();
  nodes.forEach((n) => {
    const parentId = (n as any).parentNodeId as string | undefined;
    const key = parentId ?? undefined;
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key)!.push(n);
  });

  childrenByParent.forEach((list, key) => {
    childrenByParent.set(
      key,
      list.slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    );
  });

  const rootNodes = (childrenByParent.get(undefined) || []).sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const queue: string[] = [];
  rootNodes.forEach((root, idx) => {
    depthMap.set(root._id, 0);
    branchIndexMap.set(root._id, idx);
    queue.push(root._id);
  });

  const altOffsets = [-1, 1, -2];

  while (queue.length) {
    const currentId = queue.shift()!;
    const currentDepth = depthMap.get(currentId) ?? 0;
    const currentBranch = branchIndexMap.get(currentId) ?? 0;

    const children = childrenByParent.get(currentId) || [];
    if (!children.length) continue;

    const continuationChildren = children.filter((c) => c.type !== "branch");
    const alternativeChildren = children.filter((c) => c.type === "branch");

    continuationChildren.forEach((child) => {
      depthMap.set(child._id, currentDepth + 1);
      branchIndexMap.set(child._id, currentBranch);
      queue.push(child._id);
    });

    alternativeChildren.forEach((child, idx) => {
      const badgeIndex = idx;
      branchBadgeIndexMap.set(child._id, badgeIndex);
      const isOverflow = idx >= MAX_VISIBLE_ALTERNATIVES;
      const parentExpanded = expandedOverflowParents?.has(currentId);
      if (isOverflow && !parentExpanded) {
        hiddenAlternatives.add(child._id);
        overflowByParent.set(currentId, (overflowByParent.get(currentId) || 0) + 1);
        return;
      }
      const offset = altOffsets[Math.min(idx, altOffsets.length - 1)];
      const branchIndex = currentBranch + offset;
      depthMap.set(child._id, currentDepth + 1);
      branchIndexMap.set(child._id, branchIndex);
      queue.push(child._id);
    });
  }

  return { depthMap, branchIndexMap, branchBadgeIndexMap, overflowByParent, hiddenAlternatives };
};

const branchBadge = (idx: number | undefined) => {
  if (idx === undefined) return undefined;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (idx < alphabet.length) return alphabet[idx];
  return `B${idx + 1}`;
};

interface CanvasAreaProps {
  canvasId: string;
  selectedNode: string | null;
  onNodeSelect: (nodeId: string | null, nodeName?: string, nodeType?: string) => void;
}

export function CanvasArea({
  canvasId,
  selectedNode,
  onNodeSelect,
}: CanvasAreaProps) {
  const reactFlowInstance = useReactFlow();
  const reactFlowWrapperRef = useRef<HTMLDivElement | null>(null);
  const handleZoomToNode = useCallback(
    (nodeId: string) => {
      const node = reactFlowInstance.getNode(nodeId);
      if (!node) return;

      const absolutePosition = node.positionAbsolute ?? node.position;
      const width = node.width ?? 200;
      const height = node.height ?? 120;
      const centerX = absolutePosition.x + width / 2;
      const centerY = absolutePosition.y + height / 2;

      const currentViewport = reactFlowInstance.getViewport();
      const targetZoom = Math.min(2, Math.max(0.8, currentViewport.zoom + 0.35));

      reactFlowInstance.setCenter(centerX, centerY, {
        zoom: targetZoom,
        duration: 400,
      });
    },
    [reactFlowInstance]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [canvas, setCanvas] = useState<CanvasData | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  // Glass nodes are default (no toggle needed)
  const [showCustomizationPanel, setShowCustomizationPanel] =
    useState<boolean>(false);
  const [nodeCustomizations, setNodeCustomizations] = useState<
    Record<string, any>
  >({});
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  // Add state for editing node/edge
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [nodeNameInput, setNodeNameInput] = useState<string>("");
  const [nodeColorInput, setNodeColorInput] = useState<string>("#A3A3A3");
  const [edgeNameInput, setEdgeNameInput] = useState<string>("");
  const [pendingConnection, setPendingConnection] = useState<
    { sourceId: string; handleId?: string | null } | null
  >(null);
  const [expandedOverflowParents, setExpandedOverflowParents] = useState<
    Set<string>
  >(new Set());

  const loadStoredLayout = useCallback((): StoredFlowLayout | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(
        `${FLOW_LAYOUT_STORAGE_PREFIX}${canvasId}`
      );
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredFlowLayout;
      if (!parsed || !Array.isArray(parsed.nodes)) return null;
      return parsed;
    } catch (error) {
      console.warn("Failed to parse stored flow layout", error);
      return null;
    }
  }, [canvasId]);

  const mergeStoredLayout = useCallback(
    (incoming: Node[], storedLayout?: StoredFlowLayout | null): Node[] => {
      const stored = storedLayout ?? loadStoredLayout();
      if (!stored?.nodes?.length) {
        return incoming;
      }

      const layoutMap = new Map<string, StoredNodeLayout>(
        stored.nodes.map((entry) => [entry.id, entry])
      );

      return incoming.map((node) => {
        const storedEntry = layoutMap.get(node.id);
        if (!storedEntry) {
          return node;
        }

        const nextStyle: Record<string, any> = {
          ...(node.style || {}),
        };

        if (typeof storedEntry.width === "number") {
          nextStyle.width = storedEntry.width;
        }
        if (typeof storedEntry.height === "number") {
          nextStyle.height = storedEntry.height;
        }

        return {
          ...node,
          position: storedEntry.position || node.position,
          style: nextStyle,
        };
      });
    },
    [loadStoredLayout]
  );

  const persistFlowLayout = useCallback(() => {
    if (typeof window === "undefined" || !canvasId) return;
    try {
      const currentNodes = reactFlowInstance.getNodes();
      const payload: StoredFlowLayout = {
        nodes: currentNodes.map((node) => ({
          id: node.id,
          position: { ...node.position },
          width:
            typeof node.width === "number"
              ? node.width
              : (node.style?.width as number | undefined),
          height:
            typeof node.height === "number"
              ? node.height
              : (node.style?.height as number | undefined),
        })),
        viewport: reactFlowInstance.getViewport(),
      };

      window.localStorage.setItem(
        `${FLOW_LAYOUT_STORAGE_PREFIX}${canvasId}`,
        JSON.stringify(payload)
      );
    } catch (error) {
      console.warn("Failed to persist flow layout", error);
    }
  }, [canvasId, reactFlowInstance]);

  const mergeCanvasData = useCallback(
    (remote: CanvasData, local?: CanvasData | null): CanvasData => {
      if (!local) return remote;

      const localNodeMap = new Map(local.nodes.map((node) => [node._id, node]));
      const resolveChatMessages = (target: any): any[] | undefined => {
        if (!target) return undefined;
        if (Array.isArray(target.chatMessages)) return target.chatMessages;
        if (Array.isArray(target?.data?.chatMessages))
          return target.data.chatMessages;
        if (Array.isArray(target?.data?.data?.chatMessages))
          return target.data.data.chatMessages;
        return undefined;
      };

      const mergedNodes = remote.nodes.map((node) => {
        const localNode = localNodeMap.get(node._id);
        if (!localNode) return node;
        const mergedData = {
          ...(localNode.data || {}),
          ...(node.data || {}),
        };
        const position =
          node.position ||
          localNode.position ||
          (localNode.data as any)?.position;
        const dimensions = node.dimensions || localNode.dimensions;
        const remoteChat = resolveChatMessages(node);
        const localChat = resolveChatMessages(localNode);
        const mergedChat =
          remoteChat && remoteChat.length > 0
            ? remoteChat
            : localChat && localChat.length > 0
            ? localChat
            : remoteChat ?? localChat;

        return {
          ...localNode,
          ...node,
          chatMessages: mergedChat,
          data: mergedData,
          position,
          dimensions,
        };
      });

      const remoteNodeIds = new Set(remote.nodes.map((n) => n._id));
      const extraLocalNodes = local.nodes.filter(
        (n) => !remoteNodeIds.has(n._id)
      );
      const allNodes = [...mergedNodes, ...extraLocalNodes];

      const nodeIdSet = new Set(allNodes.map((n) => n._id));
      const remoteEdgeIds = new Set(remote.edges.map((e) => e._id));
      const extraLocalEdges = (local.edges || []).filter(
        (e) =>
          !remoteEdgeIds.has(e._id) &&
          nodeIdSet.has(e.from) &&
          nodeIdSet.has(e.to)
      );

      return {
        ...remote,
        nodes: allNodes,
        edges: [...remote.edges, ...extraLocalEdges],
      };
    },
    []
  );

  const buildFlowFromCanvas = (
    canvasData: CanvasData
  ): { nodes: Node[]; edges: Edge[]; viewportToApply?: Viewport } => {
    const layout = computeLayout(canvasData.nodes, expandedOverflowParents);
    const { depthMap, branchIndexMap, branchBadgeIndexMap, overflowByParent, hiddenAlternatives } = layout;

    const flowNodes: (Node | null)[] = canvasData.nodes.map((node) => {
      if (node.type === "group") {
        const storedDimensions =
          node.dimensions ||
          ((node.data as Record<string, any> | undefined)?.dimensions as
            | { width: number; height: number }
            | undefined);
        const width = storedDimensions?.width || GROUP_DEFAULT_DIMENSIONS.width;
        const height = storedDimensions?.height || GROUP_DEFAULT_DIMENSIONS.height;
        const backgroundColor = node.color || "rgba(148, 163, 184, 0.18)";
        const borderShade = node.dotColor || "rgba(148, 163, 184, 0.55)";

        return {
          id: node._id,
          type: "group",
          position: node.position || { x: 160, y: 120 },
          data: {
            label: node.name || "Group Area",
            color: backgroundColor,
            textColor: node.textColor || "#334155",
            borderColor: borderShade,
            onResize: (size: { width: number; height: number }) =>
              handleGroupResize(node._id, size),
            onResizeEnd: (size: { width: number; height: number }) =>
              handleGroupResizeEnd(node._id, size),
            onSettingsClick: () => handleNodeSettingsClick(node._id),
          },
          draggable: true,
          selectable: true,
          style: {
            width,
            height,
            background: backgroundColor,
            borderColor: borderShade,
            borderStyle: "dashed",
            borderWidth: 2,
            zIndex: 0,
          },
        } as Node;
      }

      const entryBaseColor = "#e8ecf3";
      const nodeColor = node.color || (node.type === "entry" ? entryBaseColor : undefined);
      const colorScheme = getColorScheme(nodeColor || "#f8fafc");
      const nodeData =
        typeof node.data === "object" && node.data !== null ? { ...node.data } : {};
      const nodeError =
        typeof (nodeData as any).error === "string"
          ? (nodeData as any).error
          : typeof (node as any).error === "string"
          ? (node as any).error
          : undefined;
      const nodeFileId =
        (nodeData as any).fileId ||
        (nodeData as any).file_id ||
        (node as any).fileId ||
        (node as any).file_id;
      let resolvedExternalContent: string | undefined;
      let resolvedExternalLoading: boolean | undefined;
      if (node.type === "externalContext") {
        const rootContent =
          typeof (node as any).content === "string" ? (node as any).content : "";
        const nestedContent =
          typeof (nodeData as any).content === "string"
            ? (nodeData as any).content
            : "";
        const contract =
          typeof (node as any).contextContract === "string"
            ? (node as any).contextContract
            : "";
        const contractIsProcessing =
          contract.trim().toLowerCase() === "processing...";
        resolvedExternalContent = nestedContent || rootContent || "";
        if (!resolvedExternalContent && contract && !contractIsProcessing) {
          resolvedExternalContent = contract;
        }
        const nestedLoading =
          typeof (nodeData as any).loading === "boolean"
            ? (nodeData as any).loading
            : undefined;
        const rootLoading =
          typeof (node as any).loading === "boolean" ? (node as any).loading : undefined;
        resolvedExternalLoading =
          !nodeError &&
          !resolvedExternalContent &&
          (nestedLoading ?? rootLoading ?? contractIsProcessing);

        if (resolvedExternalContent) {
          (nodeData as any).content = resolvedExternalContent;
        }
        if (typeof resolvedExternalLoading === "boolean") {
          (nodeData as any).loading = resolvedExternalLoading;
        }
        if (nodeError) {
          (nodeData as any).error = nodeError;
        }
        if (nodeFileId) {
          (nodeData as any).fileId = nodeFileId;
        }
      }
      const lastMessage = [...(node.chatMessages || [])].pop();
      const lastMessageAt = lastMessage?.timestamp || node.createdAt;

      const outgoingConnections = canvasData.edges.filter(
        (edge) => edge.from === node._id
      ).length;
      const incomingConnections = canvasData.edges.filter(
        (edge) => edge.to === node._id
      ).length;
      const totalConnections = outgoingConnections + incomingConnections;

      const branchCount = canvasData.nodes.filter(
        (n) => (n as any).parentNodeId === node._id
      ).length;

      const preview = derivePreviewText(node);
      const lengthTag = getLengthTag(preview);
      if (hiddenAlternatives.has(node._id)) {
        return null;
      }

      const depth = depthMap.get(node._id) ?? 0;
      const branchIndex = branchIndexMap.get(node._id) ?? 0;
      const branchBadgeValue =
        node.type === "branch"
          ? branchBadge(branchBadgeIndexMap.get(node._id))
          : undefined;
      const parentNode = canvasData.nodes.find(
        (n) => n._id === (node as any).parentNodeId
      );
      const parentName = parentNode?.name
        ? parentNode.name
        : parentNode?.type === "entry"
        ? "Base Context"
        : undefined;
      const metaForkLabel =
        node.type === "branch"
          ? parentName
            ? `Branched from ${parentName}`
            : "Branched from Base Context"
          : undefined;
      const timestamp = lastMessageAt || node.createdAt;

      const displayLabel =
        node.type === "entry"
          ? node.name || "Base Context"
          : node.type === "externalContext"
          ? (node.data as any)?.label || node.name || "File"
          : node.name || (node.type === "branch" ? "Branch" : "Context");

      const hiddenByCollapse = isNodeHiddenByCollapse(node._id, canvasData.nodes);

      // Use stored position for externalContext and context nodes to allow free movement
      const storedPosition =
        node.position || (nodeData as any)?.position;
      const nodePosition = ((node.type === "externalContext" || node.type === "context") && storedPosition)
        ? (storedPosition as { x: number; y: number })
        : {
            x: branchIndex * HORIZONTAL_GAP,
            y: depth * VERTICAL_GAP,
          };
      
      const nodeWidth = (node as any).width;
      const nodeHeight = (node as any).height;

      return {
        id: node._id,
        type: node.type,
        position: nodePosition,
        width: nodeWidth,
        height: nodeHeight,
        data: {
          ...nodeData,
          error: nodeError,
          fileId: nodeFileId,
          loading:
            node.type === "externalContext"
              ? resolvedExternalLoading ?? (nodeData as any)?.loading
              : (nodeData as any)?.loading,
          label: displayLabel,
          messageCount: node.chatMessages?.length || 0,
          model: node.model,
          metaTags: node.metaTags || [],
          lastMessageAt,
          createdAt: node.createdAt,
          primary: node.primary,
          isSelected: selectedNode === node._id,
          color: nodeColor,
          textColor: colorScheme.text,
          dotColor: colorScheme.dot,
          parentNodeId: (node as any).parentNodeId,
          forkedFromMessageId: (node as any).forkedFromMessageId,
          preview,
          lengthTag,
          timestamp,
          metaForkLabel,
          depth,
          branchBadge: branchBadgeValue,
          sharedLabel:
            node.type === "entry" ? "Shared by all branches" : undefined,
          connectionCount: totalConnections,
          branchCount: branchCount,
          nodeType: node.type,
          isActive: selectedNode === node._id,
          onClick: () =>
            onNodeSelect(
              node._id,
              node.name ||
                (node.type === "entry"
                    ? "Base Context"
                  : node.type === "branch"
                  ? "Branch"
                  : "Context"),
              node.type
            ),
          onSettingsClick: () => handleNodeSettingsClick(node._id),
          onRetry: () => handleExternalRetry(node._id, nodeFileId),
          onFork: () => handleForkFromNode(node._id),
          onDelete: () => deleteNodeById(node._id, { confirm: true }),
          onEdit: () => handleNodeSettingsClick(node._id),
        },
        style: {
          ...(nodeColor
            ? {
                background: nodeColor,
                color: colorScheme.text,
                borderColor: colorScheme.dot,
              }
            : {}),
          zIndex: 2,
          ...(node.type === "entry" ? { minWidth: 320 } : {}),
          boxShadow:
            depth > 0
              ? `0 ${2 + depth}px ${8 + depth * 2}px rgba(0,0,0,0.06)`
              : undefined,
        },
        hidden: hiddenByCollapse,
        draggable: node.type !== "entry",
      } as Node;
    });

    const animatedEdgeIds = getLineageEdgeIds(canvasData, selectedNode);

    const hiddenNodeIds = hiddenAlternatives;
    const flowEdges: Edge[] = canvasData.edges
      .filter((edge) => !hiddenNodeIds.has(edge.from) && !hiddenNodeIds.has(edge.to))
      .map((edge) => {
        const sanitizedMeta = { ...(edge.meta || {}) } as Record<string, any>;
        if (sanitizedMeta.condition) delete sanitizedMeta.condition;
        const sourceNode = canvasData.nodes.find(
          (node) => node._id === edge.from
        );
        const targetNode = canvasData.nodes.find((node) => node._id === edge.to);
        const isExternalEdge =
          sourceNode?.type === "externalContext" ||
          targetNode?.type === "externalContext";
        const sourceColorScheme = getColorScheme(
          sourceNode?.color || "#f8fafc"
        );

        const edgeColor = isExternalEdge ? "#f59e0b" : sourceColorScheme.edge || "#94a3b8";
        const edgeWidth = isExternalEdge ? 2.6 : 1.8;
        const isAnimatedEdge = animatedEdgeIds.has(edge._id);
        const strokeColor = isAnimatedEdge ? EDGE_HIGHLIGHT_COLOR : edgeColor;

        const edgeHidden =
          isNodeHiddenByCollapse(edge.source, canvasData.nodes) ||
          isNodeHiddenByCollapse(edge.target, canvasData.nodes);

        return {
          id: edge._id,
          source: edge.from,
          target: edge.to,
          type: "custom",
          animated: isAnimatedEdge,
          data: {
            ...sanitizedMeta,
            onEdit: (edgeId: string) => {
              setEditingEdgeId(edgeId);
              const edgeData = canvasData.edges.find((e) => e._id === edgeId);
              setEdgeNameInput(
                edgeData?.meta?.name || edgeData?.meta?.condition || ""
              );
            },
            onDelete: (edgeId: string) => {
              if (confirm("Delete this connection?")) {
                const updatedEdges = canvasData.edges.filter(
                  (e) => e._id !== edgeId
                );
                const updatedCanvas = { ...canvasData, edges: updatedEdges };
                storageService.saveCanvas(updatedCanvas);
                setCanvas(updatedCanvas);
                setEdges((eds) => eds.filter((e) => e.id !== edgeId));
                fetch(`/api/canvases/${canvasId}/edges/${edgeId}`, {
                  method: "DELETE",
                });
              }
            },
            baseColor: edgeColor,
            highlightColor: EDGE_HIGHLIGHT_COLOR,
            animated: isAnimatedEdge,
          },
          style: {
            stroke: strokeColor,
            strokeWidth: isAnimatedEdge ? 2.4 : edgeWidth,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: strokeColor,
            width: isAnimatedEdge ? 20 : 18,
            height: isAnimatedEdge ? 20 : 18,
          },
          selectable: true,
          hidden: edgeHidden,
        };
      });

    const overflowNodes: Node[] = [];
    const overflowEdges: Edge[] = [];
    overflowByParent.forEach((count, parentId) => {
      if (count <= 0) return;
      const parentDepth = depthMap.get(parentId) ?? 0;
      const parentBranch = branchIndexMap.get(parentId) ?? 0;
      const overflowId = `overflow-${parentId}`;
      const depth = parentDepth + 1;
      const branchIndex = parentBranch + 2;
      overflowNodes.push({
        id: overflowId,
        type: "context",
        position: { x: branchIndex * HORIZONTAL_GAP, y: depth * VERTICAL_GAP },
        data: {
          label: `+${count} more alternatives`,
          preview: "Click to expand alternatives",
          messageCount: 0,
          isSelected: false,
          model: "",
          lengthTag: "short",
          timestamp: new Date().toISOString(),
          metaForkLabel: "Collapsed alternatives",
          depth,
          branchBadge: undefined,
          onClick: () => {
            setExpandedOverflowParents((prev) => {
              const next = new Set(prev);
              next.add(parentId);
              return next;
            });
          },
        },
        style: {
          zIndex: 2,
          boxShadow: depth > 0 ? `0 ${2 + depth}px ${8 + depth * 2}px rgba(0,0,0,0.06)` : undefined,
        },
        draggable: false,
      });

      const parentColorScheme = getColorScheme(
        canvasData.nodes.find((n) => n._id === parentId)?.color || "#f8fafc"
      );
      const strokeColor = parentColorScheme.edge || "#94a3b8";
      overflowEdges.push({
        id: `overflow-edge-${parentId}`,
        source: parentId,
        target: overflowId,
        type: "custom",
        animated: false,
        style: {
          stroke: strokeColor,
          strokeWidth: 1.8,
          strokeDasharray: "6 4",
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
          width: 18,
          height: 18,
        },
        selectable: false,
        data: { collapsed: true },
      });
    });

    const filteredNodes = (flowNodes.filter(Boolean) as Node[]).concat(overflowNodes);

    const storedLayout = loadStoredLayout();
    const nodesWithLayout = mergeStoredLayout(filteredNodes, storedLayout);

    const viewportToApply = storedLayout?.viewport || canvasData.viewportState;

    return {
      nodes: nodesWithLayout,
      edges: [...flowEdges, ...overflowEdges],
      viewportToApply,
    };
  };

  const handleNodeSettingsClick = useCallback(
    (nodeId: string) => {
      setEditingNodeId(nodeId);
      const node = nodes.find((n) => n.id === nodeId);
      setNodeNameInput((node as any)?.data?.label || "");
      setNodeColorInput(String(node?.style?.background || "#A3A3A3"));
    },
    [nodes]
  );

  const handleGroupResize = useCallback(
    (nodeId: string, size: { width: number; height: number }) => {
      setNodes((current) =>
        current.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                style: {
                  ...(node.style || {}),
                  width: size.width,
                  height: size.height,
                },
              }
            : node
        )
      );
    },
    [setNodes]
  );

  const handleGroupResizeEnd = useCallback(
    async (nodeId: string, size: { width: number; height: number }) => {
      let updatedCanvas: CanvasData | null = null;

      setCanvas((prev) => {
        if (!prev) return prev;
        const nextNodes = prev.nodes.map((node) => {
          if (node._id !== nodeId) return node;
          const existingData =
            node.data && typeof node.data === "object" ? node.data : {};
          return {
            ...node,
            dimensions: size,
            data: { ...existingData, dimensions: size },
          } as NodeData;
        });

        updatedCanvas = {
          ...prev,
          nodes: nextNodes,
          updatedAt: new Date().toISOString(),
        };
        return updatedCanvas;
      });

      if (updatedCanvas) {
        storageService.saveCanvas(updatedCanvas);
        try {
          const targetNode = updatedCanvas.nodes.find((n) => n._id === nodeId);
          const persistedData =
            targetNode?.data && typeof targetNode.data === "object"
              ? targetNode.data
              : undefined;
          await fetch(`/api/canvases/${canvasId}/nodes/${nodeId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              persistedData
                ? { dimensions: size, data: persistedData }
                : { dimensions: size }
            ),
          });
        } catch (error) {
          console.error("Failed to persist group box resize", error);
        }
      }
    },
    [canvasId]
  );

  const isNodeCollapsed = useCallback(
    (nodeId: string): boolean => {
      return collapsedNodes.has(nodeId);
    },
    [collapsedNodes]
  );

  const isNodeHiddenByCollapse = useCallback(
    (nodeId: string, nodesList: NodeData[]): boolean => {
      let currentId: string | undefined = nodeId;
      const lookup = new Map(nodesList.map((n) => [n._id, n]));
      while (currentId) {
        if (collapsedNodes.has(currentId)) return true;
        const currentNode = lookup.get(currentId);
        const parentId = (currentNode as any)?.parentNodeId as string | undefined;
        currentId = parentId;
      }
      return false;
    },
    [collapsedNodes]
  );

  // Canvas viewport state
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const lastViewportRef = useRef<Viewport | null>(null);
  const [canvasSettings, setCanvasSettings] = useState({
    autoSave: true,
    saveInterval: 8000, // Save every 8 seconds for better performance
  });

  // Batched parent lineage updates to minimize network chatter
  const parentUpdateQueueRef = useRef<Record<string, any>>({});
  const parentUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Canvas save debouncing for optimal performance
  const canvasSaveQueueRef = useRef<CanvasData | null>(null);
  const canvasSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scheduleParentUpdate = useCallback(
    (nodeId: string, updates: any) => {
      parentUpdateQueueRef.current[nodeId] = {
        ...(parentUpdateQueueRef.current[nodeId] || {}),
        ...updates,
      };
      if (parentUpdateTimerRef.current)
        clearTimeout(parentUpdateTimerRef.current);
      parentUpdateTimerRef.current = setTimeout(() => {
        const batch = parentUpdateQueueRef.current;
        parentUpdateQueueRef.current = {};
        parentUpdateTimerRef.current = null;
        Object.entries(batch).forEach(([id, body]) => {
          fetch(`/api/canvases/${canvasId}/nodes/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }).catch((err) =>
            console.error("Batched parent update failed", id, err)
          );
        });
      }, 1000); // debounce window - reduced DB calls
    },
    [canvasId]
  );

  // Debounced canvas save for optimal performance
  const scheduleCanvasSave = useCallback(
    (canvasData: CanvasData) => {
      if (!canvasSettings.autoSave) return;

      canvasSaveQueueRef.current = canvasData;
      if (canvasSaveTimerRef.current) {
        clearTimeout(canvasSaveTimerRef.current);
      }

      canvasSaveTimerRef.current = setTimeout(() => {
        const dataToSave = canvasSaveQueueRef.current;
        if (!dataToSave) return;

        canvasSaveQueueRef.current = null;
        canvasSaveTimerRef.current = null;

        // Save to database
        fetch(`/api/canvases/${canvasId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...dataToSave,
            viewportState: viewport,
          }),
        }).catch((err) => {
          console.error("Failed to save canvas to database:", err);
          toast.error("Failed to save canvas changes", {
            duration: 3000,
          });
        });
      }, canvasSettings.saveInterval);
    },
    [canvasId, canvasSettings.autoSave, canvasSettings.saveInterval, viewport]
  );

  const layoutSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingLayoutRef = useRef<{
    nodes: Map<string, { x: number; y: number }>;
    viewport?: { x: number; y: number; zoom: number };
  } | null>(null);

  const flushLayoutSave = useCallback(async () => {
    if (layoutSaveTimerRef.current) {
      clearTimeout(layoutSaveTimerRef.current);
      layoutSaveTimerRef.current = null;
    }

    const pending = pendingLayoutRef.current;
    if (!pending) return;

    const nodesPayload = Array.from(pending.nodes.entries()).map(
      ([id, position]) => ({ id, position })
    );

    if (!nodesPayload.length && !pending.viewport) {
      pendingLayoutRef.current = null;
      return;
    }

    const body: {
      nodes?: { id: string; position: { x: number; y: number } }[];
      viewport?: { x: number; y: number; zoom: number };
    } = {};

    if (nodesPayload.length) {
      body.nodes = nodesPayload;
    }
    if (pending.viewport) {
      body.viewport = pending.viewport;
    }

    pendingLayoutRef.current = null;

    try {
      const response = await fetch(`/api/canvases/${canvasId}/layout`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const message = await response.text();
        console.error("Failed to persist layout:", message);
      }
    } catch (error) {
      console.error("Failed to persist layout:", error);
    }
  }, [canvasId]);

  const scheduleLayoutPatch = useCallback(
    (update: {
      nodes?: { id: string; position: { x: number; y: number } }[];
      viewport?: { x: number; y: number; zoom: number };
    }) => {
      if (!pendingLayoutRef.current) {
        pendingLayoutRef.current = { nodes: new Map() };
      }

      if (update.nodes) {
        for (const node of update.nodes) {
          if (!node || typeof node.id !== "string") continue;
          const { position } = node;
          if (
            !position ||
            typeof position.x !== "number" ||
            typeof position.y !== "number"
          ) {
            continue;
          }
          pendingLayoutRef.current.nodes.set(node.id, {
            x: position.x,
            y: position.y,
          });
        }
      }

      if (update.viewport) {
        pendingLayoutRef.current.viewport = update.viewport;
      }

      const hasWork =
        pendingLayoutRef.current.nodes.size > 0 ||
        !!pendingLayoutRef.current.viewport;
      if (!hasWork) return;

      if (layoutSaveTimerRef.current) {
        clearTimeout(layoutSaveTimerRef.current);
      }
      layoutSaveTimerRef.current = setTimeout(() => {
        void flushLayoutSave();
      }, LAYOUT_SAVE_DEBOUNCE_MS);
    },
    [flushLayoutSave]
  );

  const createGroupNode = useCallback(
    (position: { x: number; y: number }) => {
      if (!canvas) {
        toast.error("Select a canvas before adding a group area", {
          duration: 2200,
        });
        return;
      }

      const groupId = `group_${Date.now()}`;
      const groupColor = "rgba(148, 163, 184, 0.18)";
      const groupBorder = "rgba(148, 163, 184, 0.55)";
      const dimensions = {
        width: GROUP_DEFAULT_DIMENSIONS.width,
        height: GROUP_DEFAULT_DIMENSIONS.height,
      };

      const groupNode: NodeData = {
        _id: groupId,
        name: "Group Area",
        primary: false,
        type: "group",
        chatMessages: [],
        runningSummary: "",
        contextContract: "",
        model: "",
        createdAt: new Date().toISOString(),
        position,
        color: groupColor,
        textColor: "#334155",
        dotColor: groupBorder,
        dimensions,
        data: { dimensions },
      } as NodeData;

      let updatedCanvas: CanvasData | null = null;
      setCanvas((prev) => {
        if (!prev) return prev;
        updatedCanvas = {
          ...prev,
          nodes: [...prev.nodes, groupNode],
        };
        return updatedCanvas;
      });

      if (!updatedCanvas) {
        console.warn("Failed to append group node: canvas state missing");
        return;
      }

      storageService.saveCanvas(updatedCanvas);
      scheduleCanvasSave(updatedCanvas);

      fetch(`/api/canvases/${canvasId}/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(groupNode),
      }).catch((error) =>
        console.error("Failed to persist group node", error)
      );

      const flowGroupNode: Node = {
        id: groupId,
        type: "group",
        position,
        data: {
          label: groupNode.name,
          color: groupColor,
          textColor: "#334155",
          borderColor: groupBorder,
          onResize: (size: { width: number; height: number }) =>
            handleGroupResize(groupId, size),
          onResizeEnd: (size: { width: number; height: number }) =>
            handleGroupResizeEnd(groupId, size),
          onSettingsClick: () => handleNodeSettingsClick(groupId),
        },
        draggable: true,
        selectable: true,
        style: {
          width: dimensions.width,
          height: dimensions.height,
          background: groupColor,
          borderColor: groupBorder,
          borderStyle: "dashed",
          borderWidth: 2,
          zIndex: 0,
        },
      };

      setNodes((nds) => [...nds, flowGroupNode]);
      toast.success("Group area created", { duration: 2000 });
    },
    [
      canvas,
      canvasId,
      handleGroupResize,
      handleGroupResizeEnd,
      handleNodeSettingsClick,
      scheduleCanvasSave,
      setCanvas,
      setNodes,
    ]
  );

  const handleCreateGroupBox = useCallback(() => {
    if (!reactFlowWrapperRef.current) {
      createGroupNode({ x: 0, y: 0 });
      return;
    }

    const bounds = reactFlowWrapperRef.current.getBoundingClientRect();
    const projected = reactFlowInstance.project({
      x: bounds.width / 2,
      y: bounds.height / 2,
    });

    const position = {
      x: projected.x - GROUP_DEFAULT_DIMENSIONS.width / 2,
      y: projected.y - GROUP_DEFAULT_DIMENSIONS.height / 2,
    };

    createGroupNode(position);
  }, [createGroupNode, reactFlowInstance]);

  const deleteNodeById = useCallback(
    (nodeId: string, options: { confirm?: boolean } = {}) => {
      if (!canvas || !nodeId) return;
      const primaryNodeId = canvas.primaryNodeId;
      if (nodeId === primaryNodeId) {
        alert("Main node cannot be deleted.");
        return;
      }

      if (options.confirm) {
        const ok = window.confirm(
          "Really delete this node? This cannot be undone."
        );
        if (!ok) return;
      }

      const children = canvas.nodes.filter(
        (n) => (n as any).parentNodeId === nodeId
      );
      const updatedNodes = canvas.nodes
        .filter((n) => n._id !== nodeId)
        .map((n) =>
          (n as any).parentNodeId === nodeId
            ? { ...n, parentNodeId: undefined }
            : n
        );
      const updatedEdges = canvas.edges.filter(
        (e) => e.from !== nodeId && e.to !== nodeId
      );
      const updatedCanvas = {
        ...canvas,
        nodes: updatedNodes,
        edges: updatedEdges,
        updatedAt: new Date().toISOString(),
      };

      storageService.saveCanvas(updatedCanvas);
      setCanvas(updatedCanvas);
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
      );
      scheduleCanvasSave(updatedCanvas);

      if (selectedNode === nodeId) {
        onNodeSelect(null);
      }

      fetch(`/api/canvases/${canvasId}/nodes/${nodeId}`, {
        method: "DELETE",
      })
        .then((res) => {
          if (!res.ok) {
            console.error("Failed to delete node from backend", res.status);
          }
        })
        .catch((err) =>
          console.error("Error deleting node from backend", err)
        );

      children.forEach((child) => {
        scheduleParentUpdate(child._id, { parentNodeId: undefined });
      });
    },
    [
      canvas,
      canvasId,
      onNodeSelect,
      scheduleCanvasSave,
      scheduleParentUpdate,
      selectedNode,
      setCanvas,
      setEdges,
      setNodes,
    ]
  );

  const handleForkFromNode = useCallback(
    (nodeId: string) => {
      if (!canvas) return;
      const parentNode = canvas.nodes.find((n) => n._id === nodeId);
      if (!parentNode) return;

      if (parentNode.type === "externalContext" || parentNode.type === "context") {
        toast.error("Cannot fork from context nodes");
        return;
      }

      const { messageId: forkedFromMessageId, text: parentMessageText } =
        deriveParentMessageDetails(parentNode);

      if (!forkedFromMessageId && !parentMessageText) {
        toast.error("No messages found to fork from in this node");
        return;
      }

      const resolvedForkId =
        forkedFromMessageId || generateEntityId("msgref");

      const layout = computeLayout(canvas.nodes, expandedOverflowParents);
      const parentDepth = layout.depthMap.get(parentNode._id) ?? 0;
      const parentBranch = layout.branchIndexMap.get(parentNode._id) ?? 0;
      const existingAltCount = canvas.nodes.filter(
        (n) => (n as any).parentNodeId === parentNode._id && n.type === "branch"
      ).length;
      const altOffsets = [-1, 1, -2];
      const branchIndex =
        parentBranch + altOffsets[Math.min(existingAltCount, altOffsets.length - 1)];
      const position = {
        x: branchIndex * HORIZONTAL_GAP,
        y: (parentDepth + 1) * VERTICAL_GAP,
      };

      const createdAt = new Date().toISOString();
      const newNodeId = generateEntityId("node");
      const baseColor = parentNode.color;
      const colorScheme = getColorScheme(baseColor || "#f8fafc");
      const fallbackLabel = parentNode.name
        ? `${parentNode.name} branch`
        : "New Branch";
      const nodeLabel = truncateLabel(parentMessageText, fallbackLabel);
      const preview = nodeLabel;
      const lengthTag = getLengthTag(preview);
      const parentName =
        parentNode.name ||
        (parentNode.type === "entry" ? "Base Context" : "Node");
      const metaForkLabel = `Branched from ${parentName}`;
      const branchBadgeValue = branchBadge(existingAltCount);

      const newNode: NodeData = {
        _id: newNodeId,
        primary: false,
        type: "branch",
        name: nodeLabel,
        color: baseColor,
        textColor: colorScheme.text,
        dotColor: colorScheme.dot,
        chatMessages: [],
        runningSummary: "",
        contextContract: "",
        model:
          parentNode.model || canvas.settings?.defaultModel || getDefaultModel(),
        metaTags: parentNode.metaTags || [],
        parentNodeId: parentNode._id,
        forkedFromMessageId: resolvedForkId,
        createdAt,
        position,
      };

      const newEdgeId = generateEntityId("edge");
      const newEdge: EdgeData = {
        _id: newEdgeId,
        from: parentNode._id,
        to: newNodeId,
        createdAt,
        meta: {
          parentMessage: parentMessageText,
        },
      };

      const updatedCanvas: CanvasData = {
        ...canvas,
        nodes: [...canvas.nodes, newNode],
        edges: [...canvas.edges, newEdge],
        updatedAt: createdAt,
      };

      storageService.saveCanvas(updatedCanvas);
      setCanvas(updatedCanvas);

      const flowNode: Node = {
        id: newNodeId,
        type: newNode.type,
        position,
        data: {
          label: nodeLabel,
          messageCount: 0,
          model: newNode.model,
          metaTags: newNode.metaTags || [],
          lastMessageAt: createdAt,
          createdAt,
          primary: newNode.primary,
          isSelected: false,
          color: baseColor,
          textColor: colorScheme.text,
          dotColor: colorScheme.dot,
          parentNodeId: parentNode._id,
          forkedFromMessageId: resolvedForkId,
          preview,
          lengthTag,
          timestamp: createdAt,
          metaForkLabel,
          depth: parentDepth + 1,
          branchBadge: branchBadgeValue,
          onClick: () => onNodeSelect(newNodeId, nodeLabel, newNode.type),
          onFork: () => handleForkFromNode(newNodeId),
          onDelete: () => deleteNodeById(newNodeId, { confirm: true }),
          onEdit: () => handleNodeSettingsClick(newNodeId),
        },
        style: {
          ...(baseColor
            ? {
                background: baseColor,
                color: colorScheme.text,
                borderColor: colorScheme.dot,
              }
            : {}),
          zIndex: 2,
          boxShadow:
            parentDepth + 1 > 0
              ? `0 ${2 + parentDepth + 1}px ${8 + (parentDepth + 1) * 2}px rgba(0,0,0,0.06)`
              : undefined,
        },
      };

      setNodes((nds) => [...nds, flowNode]);

      const edgeColor = colorScheme.edge || "#94a3b8";
      const flowEdge: Edge = {
        id: newEdgeId,
        source: parentNode._id,
        target: newNodeId,
        data: {
          ...newEdge.meta,
          baseColor: edgeColor,
          highlightColor: EDGE_HIGHLIGHT_COLOR,
          animated: false,
        },
        type: "custom",
        style: {
          stroke: edgeColor,
          strokeWidth: 1.8,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColor,
          width: 18,
          height: 18,
        },
        animated: false,
        selectable: true,
      };

      setEdges((eds) => addEdge(flowEdge, eds));

      scheduleParentUpdate(newNodeId, {
        parentNodeId: parentNode._id,
        forkedFromMessageId: resolvedForkId,
      });

      fetch(`/api/canvases/${canvasId}/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newNode,
          forkedFromMessageId: resolvedForkId,
        }),
      }).catch((err) => console.error("Failed to save node to MongoDB", err));

      fetch(`/api/canvases/${canvasId}/edges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEdge),
      }).catch((err) => console.error("Failed to save edge to MongoDB", err));

      onNodeSelect(newNodeId, nodeLabel, newNode.type);
      toast.success("Forked from last message", { duration: 2200 });
    },
    [
      canvas,
      canvasId,
      expandedOverflowParents,
      onNodeSelect,
      scheduleParentUpdate,
      setCanvas,
      setEdges,
      setNodes,
      toast,
    ]
  );

  useEffect(() => {
    return () => {
      if (layoutSaveTimerRef.current) {
        clearTimeout(layoutSaveTimerRef.current);
        layoutSaveTimerRef.current = null;
      }
      void flushLayoutSave();
    };
  }, [flushLayoutSave]);

  useEffect(() => {
    setPendingConnection(null);
  }, [canvasId]);

  // Handle node customization
  const handleNodeCustomization = useCallback(
    (nodeId: string, customization: any) => {
      setNodeCustomizations((prev) => ({
        ...prev,
        [nodeId]: customization,
      }));

      // Update node data with customization
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  ...customization,
                  // Preserve existing essential data
                  label: node.data.label,
                  messageCount: node.data.messageCount,
                  isSelected: node.data.isSelected,
                  model: node.data.model,
                  metaTags: node.data.metaTags,
                  preview: (node.data as any).preview,
                  lengthTag: (node.data as any).lengthTag,
                  timestamp: (node.data as any).timestamp,
                  metaForkLabel: (node.data as any).metaForkLabel,
                  sharedLabel: (node.data as any).sharedLabel,
                },
              }
            : node
        )
      );
    },
    [setNodes]
  );

  // Use basic React Flow node types
  const currentNodeTypes = useMemo(() => {
    return basicNodeTypes;
  }, []);

  // Auto-layout function to organize nodes
  const handleAutoLayout = useCallback(() => {
    const actionableNodes = nodes.filter((node) => node.type !== "group");
    if (actionableNodes.length === 0) return;

    const actionableIds = new Set(actionableNodes.map((node) => node.id));

    // Find entry nodes (nodes with no incoming edges)
    const entryNodes = actionableNodes.filter(
      (node) =>
        !edges.some(
          (edge) => edge.target === node.id && actionableIds.has(edge.source)
        )
    );

    const layoutMaps = computeLayout(canvas?.nodes || [], expandedOverflowParents);
    const layoutedNodes = nodes.map((n) => {
      if (n.type === "group") return n;
      const depth = layoutMaps.depthMap.get(n.id) ?? 0;
      const branchIndex = layoutMaps.branchIndexMap.get(n.id) ?? 0;
      return {
        ...n,
        position: {
          x: branchIndex * HORIZONTAL_GAP,
          y: depth * VERTICAL_GAP,
        },
      };
    });

    setNodes(layoutedNodes);

    // Save to storage
    if (canvas) {
      const updatedNodes = canvas.nodes.map((canvasNode) => {
        if (canvasNode.type === "group") {
          return canvasNode;
        }
        const layoutedNode = layoutedNodes.find((n) => n.id === canvasNode._id);
        return layoutedNode
          ? { ...canvasNode, position: layoutedNode.position }
          : canvasNode;
      });

      const updatedCanvas: CanvasData = {
        ...canvas,
        nodes: updatedNodes,
        updatedAt: new Date().toISOString(),
      };

      storageService.saveCanvas(updatedCanvas);
      setCanvas(updatedCanvas);
      scheduleLayoutPatch({
        nodes: updatedNodes
          .filter((node) => node.position)
          .map((node) => ({
            id: node._id,
            position: node.position as { x: number; y: number },
          })),
      });

      toast.success("Canvas auto-arranged!", {
        duration: 2000,
      });
    }
  }, [nodes, edges, canvas, setNodes, scheduleLayoutPatch]);

  // Handle Delete key for node/edge deletion and auto-layout shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Delete") {
        if (selectedNode) {
          deleteNodeById(selectedNode);
        }
        // Delete selected edge
        if (selectedEdge && canvas) {
          const edgeObj = canvas.edges.find((e) => e._id === selectedEdge);
          const updatedEdges = canvas.edges.filter(
            (e) => e._id !== selectedEdge
          );
          let updatedNodes = canvas.nodes;
          if (edgeObj) {
            // If target node uses this source as parent and no other inbound edges remain, clear parent
            const targetNode = canvas.nodes.find((n) => n._id === edgeObj.to);
            if (
              targetNode &&
              (targetNode as any).parentNodeId === edgeObj.from
            ) {
              const stillInbound = updatedEdges.some(
                (e) => e.to === edgeObj.to
              );
              if (!stillInbound) {
                updatedNodes = updatedNodes.map((n) =>
                  n._id === edgeObj.to ? { ...n, parentNodeId: undefined } : n
                );
                // Persist change
                scheduleParentUpdate(edgeObj.to, { parentNodeId: undefined });
                toast.info(
                  `Parent relationship cleared for node: ${edgeObj.to}`,
                  {
                    duration: 2000,
                  }
                );
              }
            }
          }
          const updatedCanvas = {
            ...canvas,
            edges: updatedEdges,
            nodes: updatedNodes,
          };
          storageService.saveCanvas(updatedCanvas);
          setCanvas(updatedCanvas);

          // Auto-save edge deletion
          scheduleCanvasSave(updatedCanvas);

          setEdges((eds) => eds.filter((e) => e.id !== selectedEdge));
          // Delete edge from backend
          fetch(`/api/canvases/${canvasId}/edges/${selectedEdge}`, {
            method: "DELETE",
          });
        }
      }

      // Auto Layout shortcut (Ctrl/Cmd + L)
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "l") {
        event.preventDefault();
        handleAutoLayout();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedNode,
    selectedEdge,
    canvas,
    canvasId,
    setNodes,
    setEdges,
    deleteNodeById,
    handleAutoLayout,
  ]);

  useEffect(() => {
    const loadCanvas = async () => {
      console.log("Loading canvas:", canvasId);
      let canvasData: CanvasData | null = null;

      // First, try to fetch from API/database
      try {
        console.log("Fetching canvas from API:", canvasId);
        const dbResponse = await fetch(`/api/canvases/${canvasId}`, {
          cache: "no-cache",
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        if (dbResponse.ok) {
          const responseData = await dbResponse.json();
          const localCanvas = storageService.getCanvas(canvasId);
          canvasData = responseData.canvas
            ? mergeCanvasData(responseData.canvas, localCanvas)
            : responseData.canvas;
          console.log(
            "Canvas loaded from API:",
            canvasId,
            "with",
            canvasData?.nodes?.length || 0,
            "nodes"
          );

          // Save to localStorage for offline access
          if (canvasData) {
            storageService.saveCanvas(canvasData);
          }
        } else {
          console.log(
            "Canvas not found in API, trying localStorage:",
            canvasId
          );
          // Fallback to localStorage
          canvasData = storageService.getCanvas(canvasId);

          if (canvasData) {
            console.log(
              "Canvas found in localStorage, syncing to database:",
              canvasId
            );
            // Canvas exists in localStorage but not in DB, create it
            const syncResponse = await fetch("/api/canvases", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(canvasData),
            });
            if (syncResponse.ok) {
              console.log("Canvas synced successfully to database");
            } else {
              console.error(
                "Failed to sync canvas to database:",
                await syncResponse.text()
              );
            }
          }
        }
      } catch (err) {
        console.error(
          "Failed to fetch canvas from API, trying localStorage:",
          err
        );
        // Fallback to localStorage
        canvasData = storageService.getCanvas(canvasId);
      }

      if (canvasData) {
        console.log(
          "Setting canvas data with",
          canvasData.nodes?.length || 0,
          "nodes"
        );
        setCanvas(canvasData);

        const { nodes: builtNodes, edges: builtEdges, viewportToApply } =
          buildFlowFromCanvas(canvasData);

        setNodes(builtNodes);
        setEdges(builtEdges);

        if (viewportToApply) {
          lastViewportRef.current = viewportToApply;
          setViewport(viewportToApply);
          reactFlowInstance.setViewport(viewportToApply, { duration: 0 });
        }
      } else {
        console.log("No canvas data found for:", canvasId);
        setCanvas(null);
        setNodes([]);
        setEdges([]);
      }
    };

    if (canvasId) {
      console.log("Canvas ID changed, loading:", canvasId);
      loadCanvas();
    }
  }, [canvasId]);

  useEffect(() => {
    if (!canvas) return;
    const { nodes: builtNodes, edges: builtEdges } = buildFlowFromCanvas(canvas);
    setNodes(builtNodes);
    setEdges(builtEdges);
  }, [canvas, expandedOverflowParents, selectedNode]);

  useEffect(() => {
    setNodes((nds) => {
      if (!selectedNode) {
        let anyChanged = false;
        const reset = nds.map((n) => {
          if (
            (n.data as any).isSelected ||
            (n.data as any).highlightTier !== undefined
          ) {
            anyChanged = true;
            return {
              ...n,
              data: { ...n.data, isSelected: false, highlightTier: undefined },
              style: { ...(n.style || {}), opacity: 1 },
            };
          }
          return n;
        });
        return anyChanged ? reset : nds;
      }

      // Build neighbor tiers from current edges
      const direct = new Set<string>();
      const second = new Set<string>();
      edges.forEach((e) => {
        if (e.source === selectedNode) direct.add(e.target);
        else if (e.target === selectedNode) direct.add(e.source);
      });
      edges.forEach((e) => {
        if (
          direct.has(e.source) &&
          e.target !== selectedNode &&
          !direct.has(e.target)
        )
          second.add(e.target);
        if (
          direct.has(e.target) &&
          e.source !== selectedNode &&
          !direct.has(e.source)
        )
          second.add(e.source);
      });

      let changed = false;
      const updated = nds.map((n) => {
        const tier =
          n.id === selectedNode
            ? 0
            : direct.has(n.id)
            ? 1
            : second.has(n.id)
            ? 2
            : undefined;
        const isSelectedFlag = n.id === selectedNode;
        const prevTier = (n.data as any).highlightTier;
        const prevSelected = (n.data as any).isSelected;
        if (prevTier !== tier || prevSelected !== isSelectedFlag) {
          changed = true;
          return {
            ...n,
            data: {
              ...n.data,
              isSelected: isSelectedFlag,
              highlightTier: tier,
            },
          };
        }
        return n;
      });
      return changed ? updated : nds;
    });
  }, [selectedNode, edges, setNodes]);

  useEffect(() => {
    const animatedEdgeIds = getLineageEdgeIds(canvas, selectedNode);
    const focusedSet = getLineageNodeSet(canvas, focusedNodeId);

    setEdges((eds) => {
      if (!eds.length) return eds;

      let changed = false;
      const updated = eds.map((edge) => {
        const data = (edge.data || {}) as Record<string, any>;
        const baseColor = data.baseColor || "#94a3b8";
        const highlightColor = data.highlightColor || EDGE_HIGHLIGHT_COLOR;
        const shouldAnimate = animatedEdgeIds.has(edge.id);
        const nextStroke = shouldAnimate ? highlightColor : baseColor;
        const nextWidth = shouldAnimate ? 2.4 : 1.8;
        const currentStroke = (edge.style as any)?.stroke || baseColor;
        const currentWidth = (edge.style as any)?.strokeWidth || 1.8;
        const fadeOut =
          focusedNodeId &&
          !(focusedSet.has(edge.source) && focusedSet.has(edge.target));
        const nextOpacity = fadeOut ? 0.25 : (edge.style as any)?.opacity ?? 1;

        if (
          edge.animated !== shouldAnimate ||
          data.animated !== shouldAnimate ||
          currentStroke !== nextStroke ||
          currentWidth !== nextWidth ||
          (edge.style as any)?.opacity !== nextOpacity
        ) {
          changed = true;
          const nextStyle = {
            ...(edge.style || {}),
            stroke: nextStroke,
            strokeWidth: nextWidth,
            opacity: nextOpacity,
          } as Record<string, any>;

          if (shouldAnimate) {
            nextStyle.strokeDasharray = "14 10";
            nextStyle.animation = "dashMove 1s linear infinite";
          } else {
            delete nextStyle.strokeDasharray;
            delete nextStyle.animation;
          }

          return {
            ...edge,
            animated: shouldAnimate,
            data: { ...data, animated: shouldAnimate },
            style: nextStyle,
            markerEnd: edge.markerEnd
              ? {
                  ...edge.markerEnd,
                  color: nextStroke,
                }
              : edge.markerEnd,
          } as Edge;
        }
        return edge;
      });

      return changed ? updated : eds;
    });
  }, [canvas, selectedNode, setEdges]);

  useEffect(() => {
    if (!selectedNode) return;
    handleZoomToNode(selectedNode);
  }, [selectedNode, handleZoomToNode]);

  // Listen for forked node events from ChatPanel
  useEffect(() => {
    const handler = (e: any) => {
      const detail = e.detail;
      if (!detail || detail.canvasId !== canvasId) return;
      const { node, edge } = detail;
      // Update local canvas state
      setCanvas((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          nodes: [...prev.nodes, node],
          edges: [...prev.edges, edge],
        };
        storageService.saveCanvas(updated);
        return updated;
      });
      // Add reactflow node
      setNodes((nds) => {
        const preview = derivePreviewText(node);
        const lengthTag = getLengthTag(preview);
        const parentLabel = nds.find(
          (n) => n.id === (edge?.from || node.parentNodeId)
        )?.data?.label;
        const parentDepth = (() => {
          let depth = 0;
          let current: NodeData | undefined | null = canvas?.nodes.find(
            (n) => n._id === (edge?.from || node.parentNodeId)
          );
          while (current && (current as any).parentNodeId) {
            depth += 1;
            current = canvas?.nodes.find(
              (n) => n._id === (current as any).parentNodeId
            );
          }
          return depth;
        })();
        const siblingIndex = canvas?.nodes.filter(
          (n) => (n as any).parentNodeId === node.parentNodeId
        ).length;
        const branchBadgeValue =
          node.type === "branch" ? branchBadge(siblingIndex) : undefined;
        const metaForkLabel =
          node.type === "branch"
            ? parentLabel
              ? `Branched from ${parentLabel}`
              : "Branched from Base Context"
            : undefined;

        return [
          ...nds,
          {
            id: node._id,
            type: node.type,
            position: node.position || { x: 100, y: 100 },
            data: {
              label:
                node.name ||
                (node.type === "branch"
                  ? "Branch"
                  : node.type === "context"
                  ? "Context"
                  : "Node"),
              messageCount: 0,
              model: node.model,
              metaTags: node.metaTags || [],
              lastMessageAt: node.createdAt,
              createdAt: node.createdAt,
              primary: node.primary,
              isSelected: false,
              parentNodeId: node.parentNodeId,
              forkedFromMessageId: node.forkedFromMessageId,
              preview,
              lengthTag,
              timestamp: node.createdAt,
              metaForkLabel,
              depth: parentDepth + 1,
              branchBadge: branchBadgeValue,
              sharedLabel:
                node.type === "entry" ? "Shared by all branches" : undefined,
              onClick: () =>
                onNodeSelect(node._id, node.name || "Node", node.type),
              onFork: () => handleForkFromNode(node._id),
              onDelete: () => deleteNodeById(node._id, { confirm: true }),
              onEdit: () => handleNodeSettingsClick(node._id),
            },
            style: {
              zIndex: 2,
              ...(node.type === "entry" ? { minWidth: 320 } : {}),
              boxShadow:
                parentDepth + 1 > 0
                  ? `0 ${2 + parentDepth + 1}px ${8 + (parentDepth + 1) * 2}px rgba(0,0,0,0.06)`
                  : undefined,
            },
            draggable: node.type !== "entry",
          } as any,
        ];
      });
      // Add reactflow edge
      setEdges((eds) => [
        ...eds,
        {
          id: edge._id,
          source: edge.from,
          target: edge.to,
          data: {
            ...edge.meta,
            baseColor: "#94a3b8",
            highlightColor: EDGE_HIGHLIGHT_COLOR,
            animated: false,
          },
          type: "custom",
          animated: false,
          style: { stroke: "#94a3b8", strokeWidth: 1.8 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#94a3b8",
            width: 18,
            height: 18,
          },
        } as any,
      ]);
    };
    window.addEventListener("canvas-fork-node", handler as any);
    const selectHandler = (e: any) => {
      const { nodeId } = e.detail || {};
      if (nodeId) {
        const rfNode = nodes.find((n) => n.id === nodeId);
        onNodeSelect(nodeId, (rfNode as any)?.data?.label || "Node", rfNode?.type);
      }
    };
    window.addEventListener("canvas-select-node", selectHandler as any);
    return () => {
      window.removeEventListener("canvas-fork-node", handler as any);
      window.removeEventListener("canvas-select-node", selectHandler as any);
    };
  }, [
    canvasId,
    deleteNodeById,
    handleForkFromNode,
    handleNodeSettingsClick,
    onNodeSelect,
    setEdges,
    setNodes,
  ]);

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // Don't open chat panel if Shift is held (multi-selection mode)
      if (event.shiftKey) {
        return;
      }
      if (node.type === "group") {
        event.stopPropagation();
        return;
      }
      const nodeName =
        node.data.label ||
        (node.type === "entry"
          ? "Entry Point"
          : node.type === "branch"
          ? "Branch Point"
          : "Context Data");
      onNodeSelect(node.id, nodeName, node.type);
    },
    [onNodeSelect]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (!canvas || !params.source || !params.target) return;

      console.log(`Connecting: ${params.source} -> ${params.target}`);

      const rawSourceNode = canvas.nodes.find((n) => n._id === params.source);
      const rawTargetNode = canvas.nodes.find((n) => n._id === params.target);
      if (!rawSourceNode || !rawTargetNode) return;

      let sourceId = params.source;
      let targetId = params.target;
      let sourceNode = rawSourceNode;
      let targetNode = rawTargetNode;

      // Normalize connections so the entry node remains the root
      if (rawTargetNode.type === "entry" && rawSourceNode.type !== "entry") {
        sourceId = rawTargetNode._id;
        targetId = rawSourceNode._id;
        sourceNode = rawTargetNode;
        targetNode = rawSourceNode;
      }

      if (sourceNode.type === "entry" && targetNode.type === "entry") {
        toast.error("Cannot connect entry node to itself");
        return;
      }

      const isExternalContext = (node: NodeData) =>
        node.type === "externalContext";

      // Prevent file-to-file connections only
      if (isExternalContext(sourceNode) && isExternalContext(targetNode)) {
        toast.error("Cannot connect file nodes to each other");
        return;
      }

      if (targetNode.type === "context") {
        toast.error("Context nodes cannot receive incoming connections");
        return;
      }

      const newEdge: EdgeData = {
        _id: `edge_${Date.now()}`,
        from: sourceId,
        to: targetId,
        createdAt: new Date().toISOString(),
        meta: {},
      };

      // Always assign parent relationship when connecting (override existing if any)
      const updatedNodes = canvas.nodes.map((n) => {
        if (n._id === targetId && n.type !== "entry") {
          console.log(
            `Setting parent ${sourceId} for node ${targetId}`
          );
          return { ...n, parentNodeId: sourceId } as any;
        }
        return n;
      });

      // Update canvas with new edge + parent assignment
      const updatedCanvas: CanvasData = {
        ...canvas,
        nodes: updatedNodes,
        edges: [...canvas.edges, newEdge],
        updatedAt: new Date().toISOString(),
      };

      storageService.saveCanvas(updatedCanvas);
      setCanvas(updatedCanvas);

      // Persist edge to MongoDB
      fetch(`/api/canvases/${canvasId}/edges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEdge),
      }).catch((err) => console.error("Failed to save edge to MongoDB", err));

      // Always persist parent linkage when connecting
      console.log(
        `Scheduling parent update: ${targetId} -> parent: ${sourceId}`
      );
      if (targetNode.type !== "entry") {
        scheduleParentUpdate(targetId, { parentNodeId: sourceId });
      }

      // Visual feedback for parent relationship
      toast.success(
        `Node connected: ${targetId} → parent: ${sourceId}`,
        {
          duration: 2000,
        }
      );

      // Enhanced React Flow edge styling
      const isExternalEdge =
        sourceNode?.type === "externalContext" ||
        targetNode?.type === "externalContext";
      const sourceColorScheme = getColorScheme(sourceNode?.color || "#f8fafc");
      const edgeColor = isExternalEdge ? "#f59e0b" : sourceColorScheme.edge || "#94a3b8";
      const edgeWidth = isExternalEdge ? 2.6 : 1.8;

      const flowEdge: Edge = {
        id: newEdge._id,
        source: newEdge.from,
        target: newEdge.to,
        data: {
          ...newEdge.meta,
          onEdit: (edgeId: string) => {
            setEditingEdgeId(edgeId);
            const edge = canvas.edges.find((e) => e._id === edgeId);
            setEdgeNameInput(edge?.meta?.name || edge?.meta?.condition || "");
          },
          onDelete: (edgeId: string) => {
            // Delete edge with confirmation
            if (confirm("Delete this connection?")) {
              const updatedEdges = canvas.edges.filter((e) => e._id !== edgeId);
              const updatedCanvas = { ...canvas, edges: updatedEdges };
              storageService.saveCanvas(updatedCanvas);
              setCanvas(updatedCanvas);
              setEdges((eds) => eds.filter((e) => e.id !== edgeId));
              fetch(`/api/canvases/${canvasId}/edges/${edgeId}`, {
                method: "DELETE",
              });
            }
          },
          baseColor: edgeColor,
          highlightColor: EDGE_HIGHLIGHT_COLOR,
          animated: false,
        },
        type: "custom",
        style: {
          stroke: edgeColor,
          strokeWidth: edgeWidth,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColor,
          width: 18,
          height: 18,
        },
        animated: false,
        selectable: true,
      };

      setEdges((eds) => addEdge(flowEdge, eds));
    },
    [canvas, setEdges, canvasId, scheduleCanvasSave, scheduleParentUpdate, setCanvas]
  );

  const handleConnectStart = useCallback(
    (
      _event: MouseEvent | TouchEvent,
      params: { nodeId?: string; handleId?: string; handleType?: string }
    ) => {
      if (params?.nodeId && params.handleType !== "target") {
        setPendingConnection({
          sourceId: params.nodeId,
          handleId: params.handleId ?? null,
        });
      } else {
        setPendingConnection(null);
      }
    },
    []
  );

  const handleConnectEnd = useCallback(
    (
      event: MouseEvent | TouchEvent,
      params: { nodeId?: string; handleId?: string; handleType?: string }
    ) => {
      if (!pendingConnection || !canvas) {
        setPendingConnection(null);
        return;
      }

      if (params?.nodeId) {
        setPendingConnection(null);
        return;
      }

      const droppedOnPane = !params?.nodeId;
      const targetElement = event.target as HTMLElement | null;
      const isPaneTarget = !!targetElement?.classList?.contains(
        "react-flow__pane"
      );
      const paneElement = targetElement?.closest?.(".react-flow__pane");

      if (!(droppedOnPane || isPaneTarget || paneElement)) {
        setPendingConnection(null);
        return;
      }

      if (!reactFlowWrapperRef.current) {
        setPendingConnection(null);
        return;
      }

      const bounds = reactFlowWrapperRef.current.getBoundingClientRect();
      let clientX: number | undefined;
      let clientY: number | undefined;

      if (typeof TouchEvent !== "undefined" && event instanceof TouchEvent) {
        const touch = event.changedTouches?.[0];
        clientX = touch?.clientX;
        clientY = touch?.clientY;
      } else if (event instanceof MouseEvent) {
        clientX = event.clientX;
        clientY = event.clientY;
      }

      if (typeof clientX !== "number" || typeof clientY !== "number") {
        setPendingConnection(null);
        return;
      }

      const projected = reactFlowInstance.project({
        x: clientX - bounds.left,
        y: clientY - bounds.top,
      });

      const parentNode = canvas.nodes.find(
        (node) => node._id === pendingConnection.sourceId
      );

      // Do not auto-fork when dragging from context or external context nodes
      if (parentNode?.type === "context" || parentNode?.type === "externalContext") {
        setPendingConnection(null);
        return;
      }

      const layout = computeLayout(canvas.nodes, expandedOverflowParents);
      const parentDepth = layout.depthMap.get(parentNode?._id || "") ?? 0;
      const parentBranch = layout.branchIndexMap.get(parentNode?._id || "") ?? 0;
      const existingAltCount = canvas.nodes.filter(
        (n) => (n as any).parentNodeId === pendingConnection.sourceId && n.type === "branch"
      ).length;
      const altOffsets = [-1, 1, -2];
      const branchIndex = parentBranch + altOffsets[Math.min(existingAltCount, altOffsets.length - 1)];
      const position = {
        x: branchIndex * HORIZONTAL_GAP,
        y: (parentDepth + 1) * VERTICAL_GAP,
      };

      if (!parentNode) {
        setPendingConnection(null);
        return;
      }

      const { messageId: forkedFromMessageId, text: parentMessageText } =
        deriveParentMessageDetails(parentNode);
      const resolvedForkId =
        forkedFromMessageId || generateEntityId("msgref");

      const newNodeId = generateEntityId("node");
      const createdAt = new Date().toISOString();
      const baseColor = parentNode.color;
      const colorScheme = getColorScheme(baseColor || "#f8fafc");

      const fallbackLabel = parentNode.name
        ? `${parentNode.name} branch`
        : "New Branch";
      const nodeLabel = truncateLabel(parentMessageText, fallbackLabel);
      const preview = nodeLabel;
      const lengthTag = getLengthTag(preview);
      const parentName =
        parentNode.name || (parentNode.type === "entry" ? "Base Context" : "Node");
      const metaForkLabel = `Branched from ${parentName}`;
      const branchBadgeValue = branchBadge(existingAltCount);

      const newNode: NodeData = {
        _id: newNodeId,
        primary: false,
        type: "branch",
        name: nodeLabel,
        color: baseColor,
        textColor: colorScheme.text,
        dotColor: colorScheme.dot,
        chatMessages: [],
        runningSummary: "",
        contextContract: "",
        model: parentNode.model || canvas.settings?.defaultModel || getDefaultModel(),
        metaTags: parentNode.metaTags || [],
        parentNodeId: parentNode._id,
        forkedFromMessageId: resolvedForkId,
        createdAt,
        position,
      };

      const newEdgeId = generateEntityId("edge");
      const newEdge: EdgeData = {
        _id: newEdgeId,
        from: parentNode._id,
        to: newNodeId,
        createdAt,
        meta: {
          parentMessage: parentMessageText,
        },
      };

      const updatedCanvas: CanvasData = {
        ...canvas,
        nodes: [...canvas.nodes, newNode],
        edges: [...canvas.edges, newEdge],
        updatedAt: createdAt,
      };

      storageService.saveCanvas(updatedCanvas);
      setCanvas(updatedCanvas);

      const flowNode: Node = {
        id: newNodeId,
        type: newNode.type,
        position,
        data: {
          label: nodeLabel,
          messageCount: 0,
          model: newNode.model,
          metaTags: newNode.metaTags || [],
          lastMessageAt: createdAt,
          createdAt,
          primary: newNode.primary,
          isSelected: false,
          color: baseColor,
          textColor: colorScheme.text,
          dotColor: colorScheme.dot,
          parentNodeId: parentNode._id,
          forkedFromMessageId: resolvedForkId,
          preview,
          lengthTag,
          timestamp: createdAt,
          metaForkLabel,
          depth: parentDepth + 1,
          branchBadge: branchBadgeValue,
          onClick: () => onNodeSelect(newNodeId, nodeLabel, newNode.type),
          onFork: () => handleForkFromNode(newNodeId),
          onDelete: () => deleteNodeById(newNodeId, { confirm: true }),
          onEdit: () => handleNodeSettingsClick(newNodeId),
        },
        style: {
          ...(baseColor
            ? {
                background: baseColor,
                color: colorScheme.text,
                borderColor: colorScheme.dot,
              }
            : {}),
          zIndex: 2,
          boxShadow:
            parentDepth + 1 > 0
              ? `0 ${2 + parentDepth + 1}px ${8 + (parentDepth + 1) * 2}px rgba(0,0,0,0.06)`
              : undefined,
        },
      };

      setNodes((nds) => [...nds, flowNode]);

      const edgeColor = colorScheme.edge || "#94a3b8";

      const flowEdge: Edge = {
        id: newEdgeId,
        source: parentNode._id,
        target: newNodeId,
        data: {
          ...newEdge.meta,
          baseColor: edgeColor,
          highlightColor: EDGE_HIGHLIGHT_COLOR,
          animated: false,
        },
        type: "custom",
        style: {
          stroke: edgeColor,
          strokeWidth: 1.8,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColor,
          width: 18,
          height: 18,
        },
        animated: false,
        selectable: true,
      };

      setEdges((eds) => addEdge(flowEdge, eds));

      scheduleParentUpdate(newNodeId, {
        parentNodeId: parentNode._id,
        forkedFromMessageId: resolvedForkId,
      });

      fetch(`/api/canvases/${canvasId}/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newNode,
          forkedFromMessageId: resolvedForkId,
        }),
      }).catch((err) => console.error("Failed to save node to MongoDB", err));

      fetch(`/api/canvases/${canvasId}/edges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEdge),
      }).catch((err) => console.error("Failed to save edge to MongoDB", err));

      onNodeSelect(newNodeId, nodeLabel, newNode.type);
      toast.success("Created new branch from connection", { duration: 2200 });

      setPendingConnection(null);
    },
    [
      pendingConnection,
      canvas,
      reactFlowInstance,
      setEdges,
      scheduleCanvasSave,
      scheduleParentUpdate,
      onNodeSelect,
      canvasId,
      setNodes,
      setCanvas,
    ]
  );

  // Intercept edge changes (e.g., via React Flow UI removals) to clear parent lineage if needed
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (!canvas) return onEdgesChange(changes);
      let updatedCanvas = canvas;
      let edgesChanged = false;
      let nodesChanged = false;
      const removedEdgeIds = new Set<string>();
      changes.forEach((ch) => {
        if (ch.type === "remove") {
          const edge = canvas.edges.find(
            (e) =>
              e._id === ch.id ||
              e._id === (ch as any).id ||
              e._id === (ch as any).edge?.id
          );
          if (edge) {
            edgesChanged = true;
            removedEdgeIds.add(edge._id);
            const remaining = canvas.edges.filter((e) => e._id !== edge._id);
            // If target's parent was the edge source and no other inbound edges, clear
            const targetNode = canvas.nodes.find((n) => n._id === edge.to);
            if (targetNode && (targetNode as any).parentNodeId === edge.from) {
              const stillInbound = remaining.some((e) => e.to === edge.to);
              if (!stillInbound) {
                const newNodes = updatedCanvas.nodes.map((n) =>
                  n._id === edge.to ? { ...n, parentNodeId: undefined } : n
                );
                updatedCanvas = { ...updatedCanvas, nodes: newNodes };
                nodesChanged = true;
                scheduleParentUpdate(edge.to, { parentNodeId: undefined });
                console.log(`UI edge removal cleared parent for: ${edge.to}`);
              }
            }
            updatedCanvas = { ...updatedCanvas, edges: remaining };
          }
        }
      });
      if (edgesChanged || nodesChanged) {
        storageService.saveCanvas(updatedCanvas);
        setCanvas(updatedCanvas);
        scheduleCanvasSave(updatedCanvas);
        removedEdgeIds.forEach((id) => {
          fetch(`/api/canvases/${canvasId}/edges/${id}`, {
            method: "DELETE",
          }).catch((err) => console.error("Failed to delete edge", id, err));
        });
      }
      onEdgesChange(changes);
    },
    [
      canvas,
      canvasId,
      onEdgesChange,
      scheduleCanvasSave,
      scheduleParentUpdate,
      setCanvas,
    ]
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);

      const positionChanges = changes.filter(
        (c) =>
          c.type === "position" &&
          c.position &&
          (c as any).dragging !== true
      );
      const dimensionChanges = changes.filter(
        (c) => c.type === "dimensions" && c.dimensions
      );

      if (positionChanges.length === 0 && dimensionChanges.length === 0) return;

      setCanvas((prev) => {
        if (!prev) return prev;
        let changed = false;
        const nextNodes = prev.nodes.map((n) => {
          let currentNode = n;

          // Handle position updates: specifically for externalContext, context and group
          const posChange = positionChanges.find((c) => c.id === n._id);
          if (
            posChange && 
            posChange.type === "position" && 
            posChange.position &&
            (n.type === "externalContext" || n.type === "group" || n.type === "context")
          ) {
             const px = posChange.position.x;
             const py = posChange.position.y;
             const nx = n.position?.x ?? 0;
             const ny = n.position?.y ?? 0;

             if (Math.abs(nx - px) > 0.1 || Math.abs(ny - py) > 0.1) {
              changed = true;
              currentNode = {
                ...currentNode,
                position: posChange.position,
              };
            }
          }

          // Handle dimensions
          const dimChange = dimensionChanges.find((c) => c.id === n._id);
          if (dimChange && dimChange.type === "dimensions" && dimChange.dimensions) {
            if (
              n.width !== dimChange.dimensions.width ||
              n.height !== dimChange.dimensions.height
            ) {
              changed = true;
              currentNode = {
                ...currentNode,
                width: dimChange.dimensions.width,
                height: dimChange.dimensions.height,
              } as NodeData;
            }
          }

          return currentNode;
        });

        // If changed, return new state to trigger effects.
        return changed ? { ...prev, nodes: nextNodes } : prev;
      });
    },
    [onNodesChange]
  );

  const onNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node, nodes: Node[]) => {
      if (!canvas) return;

      const layout = computeLayout(canvas.nodes, expandedOverflowParents);
      const typeById = new Map(canvas.nodes.map((n) => [n._id, n.type]));

      // Get all selected nodes (for multi-drag support)
      const selectedNodes = nodes.filter((n) => n.selected || n.id === node.id);

      // Create a map of updated positions
      const positionUpdates = new Map(
        selectedNodes.map((n) => {
          const nodeType = typeById.get(n.id);
          if (nodeType === "group" || nodeType === "externalContext" || nodeType === "context") {
            return [n.id, { ...n.position }];
          }
          const depth = layout.depthMap.get(n.id) ?? 0;
          const branchIndex = layout.branchIndexMap.get(n.id) ?? 0;
          return [n.id, {
            x: branchIndex * HORIZONTAL_GAP,
            y: depth * VERTICAL_GAP,
          }];
        })
      );

      const movedNodesPayload = selectedNodes.map((n) => ({
        id: n.id,
        position: positionUpdates.get(n.id) || { ...n.position },
      }));

      // Update all dragged nodes in storage
      const updatedNodes = canvas.nodes.map((n) => {
        const newPosition = positionUpdates.get(n._id);
        return newPosition ? { ...n, position: newPosition } : n;
      });

      const updatedCanvas: CanvasData = {
        ...canvas,
        nodes: updatedNodes,
        // Save viewport state as well
        viewportState: viewport,
        updatedAt: new Date().toISOString(),
      };

      // Save to localStorage immediately
      storageService.saveCanvas(updatedCanvas);
      setCanvas(updatedCanvas);

      // Save layout via lightweight endpoint
      scheduleLayoutPatch({ nodes: movedNodesPayload, viewport });

      // Persist to local layout storage once per drag end
      persistFlowLayout();

      // Removed toast for cleaner UX
    },
    [canvas, viewport, scheduleLayoutPatch, setCanvas, persistFlowLayout]
  );

  const handleMoveEnd = useCallback(
    (_: any, newViewport: Viewport) => {
      const last = lastViewportRef.current;
      const deltaX = last ? Math.abs(last.x - newViewport.x) : Infinity;
      const deltaY = last ? Math.abs(last.y - newViewport.y) : Infinity;
      const deltaZ = last ? Math.abs(last.zoom - newViewport.zoom) : Infinity;

      lastViewportRef.current = newViewport;

      // Only persist meaningful viewport changes
      if (deltaX < 4 && deltaY < 4 && deltaZ < 0.01) return;

      setViewport(newViewport);
      let nextCanvas: CanvasData | null = null;

      setCanvas((prev) => {
        if (!prev) return prev;
        nextCanvas = {
          ...prev,
          viewportState: newViewport,
          updatedAt: new Date().toISOString(),
        };
        return nextCanvas;
      });

      if (nextCanvas) {
        storageService.saveCanvas(nextCanvas);
        if (canvasSettings.autoSave) {
          scheduleLayoutPatch({ viewport: newViewport });
        }
        persistFlowLayout();
      }
    },
    [canvasSettings.autoSave, scheduleLayoutPatch, persistFlowLayout, setCanvas]
  );

  useEffect(() => {
    if (selectedNode) {
      if (reactFlowInstance) {
        // Optional: Center view on select
        // reactFlowInstance.fitView({ nodes: [{ id: selectedNode }], duration: 800 });
      }
    }
  }, [selectedNode, reactFlowInstance]);

  // Poll for background file processing (running every 3s if any node is processing)
  useEffect(() => {
    if (!canvasId || !canvas?.nodes) return;

    const processingNodes = canvas.nodes.filter((n: any) => {
      if (n.type !== "externalContext") return false;
      const nestedLoading = (n.data as any)?.loading;
      const rootLoading = (n as any)?.loading;
      const contract = (n as any)?.contextContract;
      const hasError =
        typeof (n.data as any)?.error === "string" ||
        typeof (n as any)?.error === "string";
      if (hasError) return false;
      return (
        nestedLoading === true ||
        rootLoading === true ||
        contract === "Processing..."
      );
    });

    if (processingNodes.length > 0) {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/canvases/${canvasId}`);
          if (!res.ok) return;
          const remoteData = await res.json();
          const remoteCanvas = remoteData.canvas;

          if (!remoteCanvas) return;

          // Check if any node status changed (content populated)
          const changed = remoteCanvas.nodes.some((rNode: any) => {
            const localNode = canvas.nodes.find((lNode) => lNode._id === rNode._id);
            if (!localNode) return false;

            const rNestedContent = (rNode.data as any)?.content;
            const lNestedContent = (localNode.data as any)?.content;
            const rRootContent =
              typeof rNode.content === "string" ? rNode.content : "";
            const lRootContent =
              typeof (localNode as any).content === "string"
                ? (localNode as any).content
                : "";
            const rContent = rNestedContent || rRootContent;
            const lContent = lNestedContent || lRootContent;

            if (rContent && !lContent) return true;
            if (rContent && rContent.length !== lContent?.length) return true;

            const rLoading =
              typeof (rNode.data as any)?.loading === "boolean"
                ? (rNode.data as any).loading
                : typeof rNode.loading === "boolean"
                ? rNode.loading
                : undefined;
            const lLoading =
              typeof (localNode.data as any)?.loading === "boolean"
                ? (localNode.data as any).loading
                : typeof (localNode as any).loading === "boolean"
                ? (localNode as any).loading
                : undefined;
            if (typeof rLoading === "boolean" && rLoading !== lLoading) return true;

            const rError =
              typeof (rNode.data as any)?.error === "string"
                ? (rNode.data as any).error
                : typeof rNode.error === "string"
                ? rNode.error
                : undefined;
            const lError =
              typeof (localNode.data as any)?.error === "string"
                ? (localNode.data as any).error
                : typeof (localNode as any).error === "string"
                ? (localNode as any).error
                : undefined;
            if (rError && rError !== lError) return true;
            if (!rError && lError) return true;

            const rContract = (rNode as any).contextContract;
            const lContract = (localNode as any).contextContract;
            if (rContract && rContract !== lContract) return true;

            return false;
          });

          if (changed) {
             console.log("Canvas polling detected updates");
             setCanvas((prev) => mergeCanvasData(remoteCanvas, prev));
          }
        } catch (e) {
          console.error("Poll error", e);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [canvasId, canvas?.nodes, mergeCanvasData]);

  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();

      if (!canvas) return;

      // Handle drag-and-drop of Nodes first (if any)
      // Check for reactflow type first. If present, it's an internal DnD.
      const type = event.dataTransfer.getData("application/reactflow") as
        | "entry"
        | "branch"
        | "context"
        | "group";

      if (type) {
        const reactFlowBounds = event.currentTarget.getBoundingClientRect();
        
        // Check if trying to add second entry node
        if (
            type === "entry" &&
            canvas.nodes.some((node) => node.type === "entry")
        ) {
            alert("Only one entry node is allowed per canvas");
            return;
        }

        const position = reactFlowInstance.project({
            x: event.clientX - reactFlowBounds.left,
            y: event.clientY - reactFlowBounds.top,
        });

        // We can reuse the logic from onAddNode or create similar
        // For DnD, we usually drop at exact position
        if (type === "group") {
            createGroupNode(position);
            return;
        }
        
        // For other nodes, standard add flow
        // Mapping DnD type to full node creation is simpler if we just invoke the add handler
        // But the current onAddNode doesn't take position. 
        // We will adapt slightly or just insert here.
        
        const newNodeId = generateEntityId(type.substring(0, 3));
        let newNodeData: NodeData;
        let newNode: Node;

        // ... Node creation logic ...
        // Since the original code handled this below the file check, let's just make sure we capture
        // the rect *before* any async file await if we keep the order, OR imply that file drops and node drops are mutually exclusive.
        // They ARE mutually exclusive in a single event. 
        
        // Simplified approach to fix the bug: 
        // 1. Capture rect immediately at top of function.
        // 2. If types exist, run node logic
        // 3. If files exist, run file logic
        // But await in file logic crashes the later node logic usage of event.
        
        // We will implement the splitting strategy.
        
        // Legacy copy of the node drop logic at the bottom of function:
        if (type === "entry") { /* ... */ }
        
        // Since we are refactoring, let's just return early if we handle node type.
        // ... (inserting logic from bottom of function here is verbose for replace tool)
      }
      
      // Let's stick to the minimal fix: Capture rect at top, and return if files processed.

      const reactFlowBounds = event.currentTarget.getBoundingClientRect();

      if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        const initialProjected = reactFlowInstance.project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        const validTypes = [
          "application/pdf",
          "text/plain",
          "text/markdown",
          "text/csv",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
          "application/msword" // doc
        ];
        const maxSize = 10 * 1024 * 1024; // 10MB

        const files = Array.from(event.dataTransfer.files);
        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          // 1. Validate File
           if (!validTypes.includes(file.type) && !file.name.endsWith('.md') && !file.name.endsWith('.txt')) {
             toast.error(`File type not supported: ${file.name}. Allowed: PDF, DOCX/DOC, TXT, MD, CSV.`);
             continue;
           }

          if (file.size > maxSize) {
             toast.error(`File too large (Max 10MB): ${file.name}`);
             continue;
          }

          const newNodeId = generateEntityId("ext");

          // Optimistic UI: Create node immediately with loading state
          const position = {
            x: initialProjected.x + i * 30,
            y: initialProjected.y + i * 30,
          };

          const optimisticNode: Node = {
            id: newNodeId,
            type: "externalContext",
            position,
            data: {
              label: file.name,
              content: "",
              loading: true,
              fileType: file.type,
              size: file.size,
              isSelected: false,
            },
          };
          
          setNodes((nds) => [...nds, optimisticNode]);
          setCanvas((prev) => {
            if (!prev) return prev;
            const optimisticNodeData = {
              _id: newNodeId,
              type: "externalContext",
              position, // Important: Save initial position
              createdAt: new Date().toISOString(),
              primary: false,
              chatMessages: [],
              runningSummary: "",
              metaTags: [],
              name: file.name,
              color: "#fef3c7", // Light amber for files (matches getColorScheme default for external)
              data: optimisticNode.data,
            } as any as NodeData;

            return {
              ...prev,
              nodes: [...prev.nodes, optimisticNodeData],
              updatedAt: new Date().toISOString(),
            };
          });

          let toastId: any;

          try {
            toastId = toast.loading(`Uploading ${file.name}...`);
            
            const formData = new FormData();
            formData.append("file", file);
            formData.append("nodeId", newNodeId);
            formData.append("canvasId", canvasId);
            formData.append("position", JSON.stringify(position));

            const response = await fetch("/api/upload", {
              method: "POST",
              body: formData,
            });

            if (!response.ok) {
              throw new Error("Upload failed");
            }
            const data = await response.json();
            const resolvedFileId =
              typeof data.fileId === "string" ? data.fileId : undefined;
            const hasContent =
              typeof data.content === "string" && data.content.trim().length > 0;
            const nextLoading = !hasContent;
            toast.dismiss(toastId);
            toast.success(`${file.name} uploaded`);

            setCanvas((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                nodes: prev.nodes.map((n) =>
                  n._id === newNodeId
                    ? {
                        ...n,
                        data: {
                          ...(typeof n.data === "object" ? n.data : {}),
                          loading: nextLoading,
                          content:
                            typeof data.content === "string"
                              ? data.content
                              : (n.data as any)?.content || "",
                          ...(resolvedFileId ? { fileId: resolvedFileId } : {}),
                          ...(typeof data.size === "number"
                            ? { size: data.size }
                            : { size: file.size }),
                          ...(typeof data.fileType === "string"
                            ? { fileType: data.fileType }
                            : { fileType: file.type }),
                        },
                      }
                    : n
                ),
                updatedAt: new Date().toISOString(),
              };
            });

            setNodes((nds) =>
              nds.map((n) => {
                if (n.id === newNodeId) {
                  return {
                    ...n,
                    data: {
                      ...n.data,
                      loading: nextLoading,
                      content:
                        typeof data.content === "string"
                          ? data.content
                          : (n.data as any)?.content || "",
                      ...(resolvedFileId ? { fileId: resolvedFileId } : {}),
                      ...(typeof data.size === "number"
                        ? { size: data.size }
                        : { size: file.size }),
                      ...(typeof data.fileType === "string"
                        ? { fileType: data.fileType }
                        : { fileType: file.type }),
                      onClick: () => {
                        if (onNodeSelect)
                          onNodeSelect(newNodeId, data.fileName, "externalContext");
                      },
                    },
                  };
                }
                return n;
              })
            );
          } catch (error) {
            console.error("Upload failed", error);
            toast.error(`Failed to upload ${file.name}`);
            toast.dismiss(toastId);
            setNodes((nds) => nds.filter((n) => n.id !== newNodeId));
            setCanvas((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                nodes: prev.nodes.filter((n) => n._id !== newNodeId),
                updatedAt: new Date().toISOString(),
              };
            });
          }
        }
        // Return early after processing files to avoid falling through to node processing
        return;
      }

      // Handle Node DnD
      const nodeType = event.dataTransfer.getData("application/reactflow") as
        | "entry"
        | "branch"
        | "context"
        | "group";

      if (!nodeType) return;

      // Check if trying to add second entry node
      if (
        nodeType === "entry" &&
        canvas.nodes.some((node) => node.type === "entry")
      ) {
        alert("Only one entry node is allowed per canvas");
        return;
      }

      // Convert screen coords to React Flow internal coords (accounts for pan & zoom)
      const projected = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      // Center the node around cursor (approx half typical width/height)
      const derivedPosition =
        nodeType === "group"
          ? {
              x:
                projected.x -
                GROUP_DEFAULT_DIMENSIONS.width / 2,
              y:
                projected.y -
                GROUP_DEFAULT_DIMENSIONS.height / 2,
            }
          : { x: projected.x - 100, y: projected.y - 60 };

      if (nodeType === "group") {
        createGroupNode(derivedPosition);
        return;
      }

      let position = derivedPosition;
      const layout = computeLayout(canvas.nodes);
      const parentForDrop =
        nodeType === "branch" || nodeType === "context"
          ? canvas.nodes.find((n) => n._id === (selectedNode || canvas.primaryNodeId))
          : undefined;
      if (parentForDrop) {
        const parentDepth = layout.depthMap.get(parentForDrop._id) ?? 0;
        const parentBranch = layout.branchIndexMap.get(parentForDrop._id) ?? 0;
        if (nodeType === "branch") {
          const existingAltCount = canvas.nodes.filter(
            (n) => (n as any).parentNodeId === parentForDrop._id && n.type === "branch"
          ).length;
          const altOffsets = [-1, 1, -2];
          const branchIndex = parentBranch + altOffsets[Math.min(existingAltCount, altOffsets.length - 1)];
          position = {
            x: branchIndex * HORIZONTAL_GAP,
            y: (parentDepth + 1) * VERTICAL_GAP,
          };
        } else if (nodeType === "context") {
          position = {
            x: parentBranch * HORIZONTAL_GAP,
            y: (parentDepth + 1) * VERTICAL_GAP,
          };
        }
      }

      const newNode: NodeData = {
        _id: `node_${Date.now()}`,
        primary: nodeType === "entry",
        type: nodeType,
        chatMessages: [],
        runningSummary: "",
        contextContract:
          nodeType === "context" ? "Add context information here..." : "",
        model: (canvas.settings?.defaultModel && canvas.settings.defaultModel !== "None" ? canvas.settings.defaultModel : getDefaultModel()),
        color: nodeType === "entry" ? "#e8ecf3" : undefined,
        // Lineage metadata for non-primary nodes
        parentNodeId:
          nodeType === "entry" ? undefined : selectedNode || canvas.primaryNodeId,
        forkedFromMessageId:
          nodeType === "entry"
            ? undefined
            : (() => {
                const parentId = selectedNode || canvas.primaryNodeId;
                const parent = canvas.nodes.find((n) => n._id === parentId);
                if (!parent || !parent.chatMessages) return undefined;
                for (let i = parent.chatMessages.length - 1; i >= 0; i--) {
                  const m: any = parent.chatMessages[i];
                  if (m.role === "assistant") return m.id;
                  if (m.assistant) return m.id + "-a";
                }
                return undefined;
              })(),
        createdAt: new Date().toISOString(),
        position,
      };

      // Update canvas with new node
      const updatedCanvas: CanvasData = {
        ...canvas,
        nodes: [...canvas.nodes, newNode],
        ...(nodeType === "entry" && { primaryNodeId: newNode._id }),
      };

      storageService.saveCanvas(updatedCanvas);
      setCanvas(updatedCanvas);

      // Persist node to MongoDB
      fetch(`/api/canvases/${canvasId}/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNode),
      }).catch((err) => console.error("Failed to save node to MongoDB", err));

      // Update React Flow nodes
      const flowNodeLabel =
        nodeType === "entry"
          ? "Base Context"
          : nodeType === "branch"
          ? "Branch"
          : "Context";
      const flowPreview = derivePreviewText(newNode) || flowNodeLabel;
      const flowLengthTag = getLengthTag(flowPreview);
      const parentDepthForDrop = parentForDrop
        ? layout.depthMap.get(parentForDrop._id) ?? 0
        : 0;
      const flowDepth = nodeType === "entry" ? 0 : parentDepthForDrop + 1;
      const altCountForBadge =
        nodeType === "branch" && parentForDrop
          ? canvas.nodes.filter(
              (n) => (n as any).parentNodeId === parentForDrop._id && n.type === "branch"
            ).length
          : undefined;
      const flowBranchBadge = nodeType === "branch" ? branchBadge(altCountForBadge) : undefined;

      const flowNode: Node = {
        id: newNode._id,
        type: newNode.type,
        position,
        data: {
          label: flowNodeLabel,
          messageCount: 0,
          model: newNode.model,
          isSelected: false,
          preview: flowPreview,
          lengthTag: flowLengthTag,
          timestamp: newNode.createdAt,
          metaForkLabel:
            type === "branch" ? "Branched from Base Context" : undefined,
          depth: flowDepth,
          branchBadge: flowBranchBadge,
          sharedLabel:
            type === "entry" ? "Shared by all branches" : undefined,
          onClick: () => onNodeSelect(newNode._id, flowNodeLabel, newNode.type),
          onFork: () => handleForkFromNode(newNode._id),
          onDelete: () => deleteNodeById(newNode._id, { confirm: true }),
          onEdit: () => handleNodeSettingsClick(newNode._id),
        },
        style: {
          zIndex: 2,
          ...(type === "entry" ? { minWidth: 320 } : {}),
          boxShadow:
            flowDepth > 0
              ? `0 ${2 + flowDepth}px ${8 + flowDepth * 2}px rgba(0,0,0,0.06)`
              : undefined,
        },
        draggable: type !== "entry",
      };

      setNodes((nds) => [...nds, flowNode]);
    },
    [
      canvas,
      setNodes,
      onNodeSelect,
      canvasId,
      reactFlowInstance,
      scheduleCanvasSave,
      selectedNode,
      handleGroupResize,
      handleGroupResizeEnd,
      handleNodeSettingsClick,
      createGroupNode,
      setCanvas,
      toast,
    ]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  // Node rename/color handler
  const handleNodeRename = async (nodeId: string) => {
    if (!canvas) return;

    const colorScheme = getColorScheme(nodeColorInput);
    const updatedNodes = canvas.nodes.map((n) =>
      n._id === nodeId
        ? {
            ...n,
            name: nodeNameInput,
            color: nodeColorInput,
            textColor: colorScheme.text,
            dotColor: colorScheme.dot,
          }
        : n
    );
    const updatedCanvas = { ...canvas, nodes: updatedNodes };
    storageService.saveCanvas(updatedCanvas);
    setCanvas(updatedCanvas);

    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId
          ? n.type === "group"
            ? {
                ...n,
                data: {
                  ...n.data,
                  label: nodeNameInput,
                  color: nodeColorInput,
                  textColor: colorScheme.text,
                  borderColor: colorScheme.dot,
                },
                style: {
                  ...(n.style || {}),
                  background: nodeColorInput,
                  borderColor: colorScheme.dot,
                  borderStyle: "dashed",
                  borderWidth: 2,
                  zIndex: 0,
                },
              }
            : {
                ...n,
                data: {
                  ...n.data,
                  label: nodeNameInput,
                  textColor: colorScheme.text,
                  dotColor: colorScheme.dot,
                },
                style: {
                  background: nodeColorInput,
                  color: colorScheme.text,
                  borderColor: colorScheme.dot,
                  zIndex: 2,
                },
              }
          : n
      )
    );

    // Update edges connected to this node to use the enhanced color scheme
    setEdges((eds) =>
      eds.map((e) =>
        e.source === nodeId
          ? {
              ...e,
              style: {
                stroke: colorScheme.edge,
                strokeWidth: 3,
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: colorScheme.edge,
                width: 24,
                height: 24,
              },
            }
          : e
      )
    );
    await fetch(`/api/canvases/${canvasId}/nodes/${nodeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nodeNameInput,
        color: nodeColorInput,
        textColor: colorScheme.text,
        dotColor: colorScheme.dot,
      }),
    });
    setEditingNodeId(null);
  };

  // Edge rename handler
  const handleEdgeRename = async (edgeId: string) => {
    if (!canvas) return;
    const updatedEdges = canvas.edges.map((e) =>
      e._id === edgeId ? { ...e, meta: { ...e.meta, name: edgeNameInput } } : e
    );
    const updatedCanvas = { ...canvas, edges: updatedEdges };
    storageService.saveCanvas(updatedCanvas);
    setCanvas(updatedCanvas);
    setEdges((eds) =>
      eds.map((e) =>
        e.id === edgeId
          ? ({ ...e, data: { ...(e as any).data, name: edgeNameInput } } as any)
          : e
      )
    );
    await fetch(`/api/canvases/${canvasId}/edges/${edgeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: edgeNameInput }),
    });
    setEditingEdgeId(null);
  };

  const handleExternalRetry = useCallback(
    async (nodeId: string, fileId?: string) => {
      if (!canvasId) return;

      const markNodeState = (loading: boolean, error?: string) => {
        setCanvas((prev) => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            nodes: prev.nodes.map((n) =>
              n._id === nodeId
                ? {
                    ...n,
                    contextContract: loading ? "Processing..." : n.contextContract,
                    data: {
                      ...(typeof n.data === "object" ? n.data : {}),
                      loading,
                      error,
                    },
                  }
                : n
            ),
            updatedAt: new Date().toISOString(),
          };
          storageService.saveCanvas(updated);
          return updated;
        });
        setNodes((nds) =>
          nds.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    loading,
                    error,
                  },
                }
              : n
          )
        );
      };

      markNodeState(true, undefined);

      try {
        const response = await fetch("/api/files/retry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nodeId, canvasId, fileId }),
        });
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Retry failed");
        }
        toast.success("File reprocessing started", { duration: 2200 });
      } catch (error) {
        console.error("Retry failed", error);
        markNodeState(false, "Retry failed. Please try again.");
        toast.error("Failed to retry processing", { duration: 2400 });
      }
    },
    [canvasId, setCanvas, setNodes]
  );

  return (
    <div
      className="w-full h-full bg-slate-50"
      ref={reactFlowWrapperRef}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
  onConnectStart={handleConnectStart}
  onConnectEnd={handleConnectEnd}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        onEdgeClick={(_, edge) => {
          const targetNode = nodes.find((n) => n.id === edge.target);
          if (targetNode) {
            onNodeSelect(edge.target, (targetNode.data as any)?.label || "Node", targetNode.type);
          }
        }}
        onEdgeMouseEnter={(event, edge) => {
          // Add hover effect by updating edge style
          setEdges((eds) =>
            eds.map((e) =>
              e.id === edge.id
                ? {
                    ...e,
                    style: { ...e.style, strokeWidth: 3, strokeOpacity: 1 },
                  }
                : e
            )
          );
        }}
        onEdgeMouseLeave={(event, edge) => {
          // Remove hover effect
          setEdges((eds) =>
            eds.map((e) =>
              e.id === edge.id
                ? {
                    ...e,
                    style: { ...e.style, strokeWidth: 2, strokeOpacity: 0.8 },
                  }
                : e
            )
          );
        }}
        nodeTypes={currentNodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.12, includeHiddenNodes: true }}
        className="bg-gradient-to-br from-slate-50 via-white to-slate-100"
        multiSelectionKeyCode="Shift"
        selectionKeyCode="Shift"
        selectNodesOnDrag={true}
        panOnDrag={true}
  connectionLineType={ConnectionLineType.SmoothStep}
        onInit={(instance) => {
          // Restore viewport state if available
          if (canvas?.viewportState) {
            const { x, y, zoom } = canvas.viewportState;
            instance.setViewport({ x, y, zoom });
            setViewport({ x, y, zoom });
          } else {
            // Focus the canvas and ensure proper viewport for new canvases
            setTimeout(() => {
              instance.fitView({ padding: 0.1 });
              const currentViewport = instance.getViewport();
              setViewport(currentViewport);
            }, 100);
          }
        }}
        onMove={(event, newViewport) => {
          // Track viewport changes for persistence without spamming renders
          const last = lastViewportRef.current;
          const deltaX = last ? Math.abs(last.x - newViewport.x) : Infinity;
          const deltaY = last ? Math.abs(last.y - newViewport.y) : Infinity;
          const deltaZ = last ? Math.abs(last.zoom - newViewport.zoom) : Infinity;
          if (deltaX < 4 && deltaY < 4 && deltaZ < 0.01) return;
          lastViewportRef.current = newViewport;
          setViewport(newViewport);
        }}
        onMoveEnd={handleMoveEnd}
        connectionLineStyle={{
          stroke: "#94a3b8",
          strokeWidth: 2,
        }}
        defaultEdgeOptions={{
          type: "custom",
          style: {
            stroke: "#94a3b8",
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#94a3b8",
            width: 18,
            height: 18,
          },
        }}
        selectionOnDrag={false}
        panOnScroll={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={true}
        preventScrolling={false}
        snapToGrid={false}
        minZoom={0.2}
        maxZoom={2.5}
        deleteKeyCode="Delete"
      >
        <Controls className="!bg-white/95 !backdrop-blur-md !border-slate-200/70 !shadow-[0_12px_30px_rgba(15,23,42,0.12)] !rounded-2xl [&_.react-flow__controls-button]:!bg-transparent [&_.react-flow__controls-button]:!border-slate-200/70 [&_.react-flow__controls-button]:!text-slate-600 [&_.react-flow__controls-button:hover]:!bg-slate-100/80 [&_.react-flow__controls-button:hover]:!text-slate-800 [&_.react-flow__controls-button]:!shadow-none" />
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1.2}
          color="#d3dae4"
          className="opacity-35"
        />



        {/* Multi-Selection Help Tooltip */}
        <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-full px-3.5 py-2 shadow-[0_10px_28px_rgba(15,23,42,0.12)] text-[11px] text-slate-600">
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-0.5 bg-slate-100/80 border border-slate-300/70 rounded-md text-[10px] font-mono text-slate-700">
              Shift
            </kbd>
            <span>+ Click or Drag to select multiple nodes</span>
          </div>
        </div>
        {(editingNodeId || editingEdgeId) && (
          <div className="absolute inset-0 z-40 bg-slate-900/10 backdrop-blur-[1px] pointer-events-none" />
        )}
        {/* Improved Node Customization Modal */}
        {editingNodeId && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-3xl shadow-[0_26px_80px_rgba(15,23,42,0.22)] p-6 z-50 min-w-[360px]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
                Customize Node
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingNodeId(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 rounded-xl"
              >
                <X size={18} />
              </Button>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="nodeName"
                  className="text-sm font-medium text-slate-700"
                >
                  Node Name
                </Label>
                <Input
                  id="nodeName"
                  value={nodeNameInput}
                  onChange={(e) => setNodeNameInput(e.target.value)}
                  placeholder="Enter node name"
                  className="w-full h-11 bg-white border-slate-200 focus:border-slate-400 focus:ring-slate-400/20 rounded-xl shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="nodeColor"
                  className="text-sm font-medium text-slate-700"
                >
                  Node Color
                </Label>
                <div className="flex gap-3 items-center">
                  <input
                    id="nodeColor"
                    type="color"
                    value={nodeColorInput}
                    onChange={(e) => setNodeColorInput(e.target.value)}
                    className="w-16 h-10 border border-slate-200 rounded-xl cursor-pointer shadow-sm"
                  />
                  <div className="flex-1">
                    <div className="flex gap-2 flex-wrap">
                      {[
                        "#e0e7ff", // Light indigo
                        "#dcfce7", // Light green
                        "#fef3c7", // Light amber
                        "#fce7f3", // Light pink
                        "#e0f2fe", // Light cyan
                        "#f3e8ff", // Light purple
                        "#fed7d7", // Light red
                        "#f0f9ff", // Light blue
                      ].map((color) => (
                        <button
                          key={color}
                          onClick={() => setNodeColorInput(color)}
                          className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-105 ${
                            nodeColorInput === color
                              ? "border-slate-400 ring-2 ring-slate-400/50 ring-offset-2 ring-offset-white"
                              : "border-slate-200"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => handleNodeRename(editingNodeId!)}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-[0_10px_24px_rgba(15,23,42,0.18)]"
              >
                <Save size={16} className="mr-2" />
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditingNodeId(null)}
                className="px-6 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Edge rename modal */}
        {editingEdgeId && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-3xl shadow-[0_26px_80px_rgba(15,23,42,0.22)] p-6 z-50 min-w-[320px]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
                Rename Connection
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingEdgeId(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 rounded-xl"
              >
                <X size={18} />
              </Button>
            </div>

            <div className="space-y-2 mb-6">
              <Label
                htmlFor="edgeName"
                className="text-sm font-medium text-slate-700"
              >
                Connection Name
              </Label>
              <Input
                id="edgeName"
                value={edgeNameInput}
                onChange={(e) => setEdgeNameInput(e.target.value)}
                placeholder="Enter connection name"
                className="w-full h-11 bg-white border-slate-200 focus:border-slate-400 focus:ring-slate-400/20 rounded-xl shadow-sm"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => handleEdgeRename(editingEdgeId!)}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-[0_10px_24px_rgba(15,23,42,0.18)]"
              >
                <Save size={16} className="mr-2" />
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditingEdgeId(null)}
                className="px-6 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </ReactFlow>

      {/* Canvas Status Indicator - Hidden for cleaner UX */}

      {/* Node Palette - Bottom Right - Hidden per user request */}
      {/* <div className="absolute bottom-6 right-6 z-10">
        <NodePaletteEnhanced />
      </div> */}

      {/* Customization Panel */}
      {showCustomizationPanel && selectedNode && (
        <div className="absolute top-6 left-6 z-20">
          <NodeCustomizationPanel
            nodeId={selectedNode}
            currentData={nodes.find((n) => n.id === selectedNode)?.data || {}}
            onCustomize={handleNodeCustomization}
            onClose={() => setShowCustomizationPanel(false)}
          />
        </div>
      )}
    </div>
  );
}
