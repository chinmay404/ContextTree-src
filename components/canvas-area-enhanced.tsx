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
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Settings,
  Layout,
  Edit2,
  Palette,
  Save,
  X,
  Sparkles,
  Network,
} from "lucide-react";
import { getDefaultModel } from "@/lib/models";

// Import enhanced nodes
import { EntryNodeEnhanced } from "./nodes/entry-node-enhanced";
import { BranchNodeEnhanced } from "./nodes/branch-node-enhanced";
import { ContextNodeEnhanced } from "./nodes/context-node-enhanced";
import { NodePaletteEnhanced } from "./node-palette-enhanced";
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

// Enhanced color scheme helper
const getColorScheme = (bgColor: string) => {
  const lightColors: Record<
    string,
    { text: string; dot: string; edge: string }
  > = {
    "#e0e7ff": { text: "#4338ca", dot: "#6366f1", edge: "#a5b4fc" },
    "#dcfce7": { text: "#15803d", dot: "#22c55e", edge: "#86efac" },
    "#fef3c7": { text: "#d97706", dot: "#f59e0b", edge: "#fcd34d" },
    "#fce7f3": { text: "#be185d", dot: "#ec4899", edge: "#f9a8d4" },
    "#e0f2fe": { text: "#0891b2", dot: "#06b6d4", edge: "#67e8f9" },
    "#f3e8ff": { text: "#7c3aed", dot: "#8b5cf6", edge: "#c4b5fd" },
    "#fed7d7": { text: "#dc2626", dot: "#ef4444", edge: "#fca5a5" },
    "#f0f9ff": { text: "#1d4ed8", dot: "#3b82f6", edge: "#93c5fd" },
    "#f0fdf4": { text: "#14532d", dot: "#16a34a", edge: "#86efac" },
    "#fdf4ff": { text: "#7c2d12", dot: "#ea580c", edge: "#fdba74" },
  };

  return (
    lightColors[bgColor] || { text: "#475569", dot: "#64748b", edge: "#94a3b8" }
  );
};

// Enhanced node types
const nodeTypes: NodeTypes = {
  entry: EntryNodeEnhanced,
  branch: BranchNodeEnhanced,
  context: ContextNodeEnhanced,
};

const LAYOUT_SYNC_DEBOUNCE_MS = 5000;
const LAYOUT_SYNC_INTERVAL_MS = 5000;
const VIEWPORT_POSITION_EPSILON = 0.1;
const VIEWPORT_ZOOM_EPSILON = 0.0001;

type LayoutUpdate = {
  nodes?: { id: string; position: { x: number; y: number } }[];
  viewport?: Viewport;
};

type PendingLayout = {
  nodes: Map<string, { x: number; y: number }>;
  viewport?: Viewport;
};

const isViewportEqual = (a?: Viewport | null, b?: Viewport | null) => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    Math.abs(a.x - b.x) < VIEWPORT_POSITION_EPSILON &&
    Math.abs(a.y - b.y) < VIEWPORT_POSITION_EPSILON &&
    Math.abs(a.zoom - b.zoom) < VIEWPORT_ZOOM_EPSILON
  );
};

interface CanvasAreaProps {
  canvasId: string;
  selectedNode: string | null;
  onNodeSelect: (nodeId: string | null, nodeName?: string) => void;
}

export function CanvasAreaEnhanced({
  canvasId,
  selectedNode,
  onNodeSelect,
}: CanvasAreaProps) {
  const reactFlowInstance = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [canvas, setCanvas] = useState<CanvasData | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });

  const pendingLayoutRef = useRef<PendingLayout | null>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const layoutSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const performAutoLayout = useCallback(() => {
    // Simple tree layout implementation
    const currentNodes = reactFlowInstance.getNodes();
    const currentEdges = reactFlowInstance.getEdges();
    
    if (currentNodes.length === 0) return;

    // Build adjacency list
    const adj: Record<string, string[]> = {};
    const parents: Record<string, string> = {};
    const nodeMap = new Map(currentNodes.map(n => [n.id, n]));

    currentEdges.forEach(edge => {
      if (!adj[edge.source]) adj[edge.source] = [];
      adj[edge.source].push(edge.target);
      parents[edge.target] = edge.source;
    });

    // Find roots (nodes with no incoming edges or explicitly type 'entry')
    const roots = currentNodes.filter(n => !parents[n.id] || n.type === 'entry');
    // If no roots found (circular?), pick entry or first one
    const effectiveRoots = roots.length > 0 ? roots : [currentNodes[0]];
    
    const LEVEL_HEIGHT = 250;
    const NODE_WIDTH = 350;
    const SIBLING_GAP = 50;

    const visited = new Set<string>();
    const positions: Record<string, { x: number, y: number }> = {};

    // Recursive layout
    const layoutNode = (nodeId: string, depth: number, offset: number): number => {
      if (visited.has(nodeId)) return offset;
      visited.add(nodeId);

      const children = adj[nodeId] || [];
      
      if (children.length === 0) {
        // Leaf
        positions[nodeId] = { x: offset, y: depth * LEVEL_HEIGHT };
        return offset + NODE_WIDTH + SIBLING_GAP;
      } else {
        // Parent
        let childOffset = offset;
        let minX = Infinity;
        let maxX = -Infinity;
        let firstChildX = -1;

        children.forEach((childId, index) => {
            const resultOffset = layoutNode(childId, depth + 1, childOffset);
            if(positions[childId]) {
                if(index === 0) firstChildX = positions[childId].x;
                minX = Math.min(minX, positions[childId].x);
                maxX = Math.max(maxX, positions[childId].x);
            }
            childOffset = resultOffset;
        });
        
        // Center parent over children
        const parentX = (minX + maxX) / 2;
        positions[nodeId] = { x: parentX, y: depth * LEVEL_HEIGHT };
        
        return Math.max(childOffset, parentX + NODE_WIDTH + SIBLING_GAP);
      }
    };
    
    let currentXOffset = 0;
    effectiveRoots.forEach(root => {
        currentXOffset = layoutNode(root.id, 0, currentXOffset);
        currentXOffset += NODE_WIDTH; // Gap between trees
    });

    // Update nodes
    const layoutedNodes = currentNodes.map(node => {
        if (positions[node.id]) {
            return { ...node, position: positions[node.id] };
        }
        return node;
    });

    setNodes(layoutedNodes);
    
    // Fit view after layout
    setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
    }, 100);
    
    toast.success("Structure aligned");
  }, [reactFlowInstance, setNodes]);

  const flushPendingLayout = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const pending = pendingLayoutRef.current;
    if (!pending) return;

    const nodesPayload = Array.from(pending.nodes.entries()).map(
      ([id, position]) => ({ id, position })
    );

    if (nodesPayload.length === 0 && !pending.viewport) {
      pendingLayoutRef.current = null;
      return;
    }

    const body: LayoutUpdate = {};
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
        console.error("Failed to persist canvas layout:", message);
      }
    } catch (error) {
      console.error("Failed to persist canvas layout:", error);
    }
  }, [canvasId]);

  const queueLayoutSave = useCallback(
    (update: LayoutUpdate) => {
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

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        void flushPendingLayout();
      }, LAYOUT_SYNC_DEBOUNCE_MS);
    },
    [flushPendingLayout]
  );

  useEffect(() => {
    layoutSyncIntervalRef.current = setInterval(() => {
      void flushPendingLayout();
    }, LAYOUT_SYNC_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void flushPendingLayout();
      }
    };

    const handleBeforeUnload = () => {
      void flushPendingLayout();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (layoutSyncIntervalRef.current) {
        clearInterval(layoutSyncIntervalRef.current);
        layoutSyncIntervalRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      void flushPendingLayout();
    };
  }, [flushPendingLayout]);

  // Enhanced customization states
  const [customizingNodeId, setCustomizingNodeId] = useState<string | null>(
    null
  );
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [nodeNameInput, setNodeNameInput] = useState<string>("");
  const [nodeColorInput, setNodeColorInput] = useState<string>("#f8fafc");
  const [edgeNameInput, setEdgeNameInput] = useState<string>("");
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [showNodeEffects, setShowNodeEffects] = useState(true);
  const [isDragActive, setIsDragActive] = useState(false);

  // Animation and effects
  const [isCreatingNode, setIsCreatingNode] = useState(false);
  const [lastCreatedNodeId, setLastCreatedNodeId] = useState<string | null>(
    null
  );
  const [intelligentPositionUsed, setIntelligentPositionUsed] = useState(false);
  const [isArrangingNodes, setIsArrangingNodes] = useState(false);

  // Batched updates
  const parentUpdateQueueRef = useRef<Record<string, any>>({});
  const parentUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleParentUpdate = useCallback(
    (nodeId: string, updates: any) => {
      parentUpdateQueueRef.current[nodeId] = {
        ...(parentUpdateQueueRef.current[nodeId] || {}),
        ...updates,
      };

      if (parentUpdateTimerRef.current) {
        clearTimeout(parentUpdateTimerRef.current);
      }

      parentUpdateTimerRef.current = setTimeout(async () => {
        const queuedUpdates = { ...parentUpdateQueueRef.current };
        parentUpdateQueueRef.current = {};

        for (const [pendingNodeId, pendingUpdates] of Object.entries(
          queuedUpdates
        )) {
          try {
            await fetch(`/api/canvases/${canvasId}/nodes/${pendingNodeId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(pendingUpdates),
            });
          } catch (error) {
            console.error("Failed to update node:", error);
          }
        }
      }, 500);
    },
    [canvasId]
  );

  const syncCanvasToFlow = useCallback(
    (canvasData: CanvasData) => {
      const flowNodes: Node[] = canvasData.nodes.map((node) => {
        const color = node.color || getDefaultNodeColor(node.type);
        const textColor = node.textColor || getDefaultTextColor(node.type);
        const dotColor = node.dotColor || getDefaultDotColor(node.type);
        const borderRadius =
          node.borderRadius ?? getDefaultBorderRadius(node.type);

        return {
          id: node._id,
          type: node.type,
          position: node.position || { x: 0, y: 0 },
          data: {
            label: node.name,
            messageCount: node.chatMessages?.length || 0,
            isSelected: node._id === selectedNode,
            onClick: () => onNodeSelect(node._id, node.name),
            onSettingsClick: () => setCustomizingNodeId(node._id),
            color,
            textColor,
            dotColor,
            size: node.size || "medium",
            style: node.style || "modern",
            borderRadius,
            opacity: node.opacity ?? 100,
            model: node.model || "gpt-4",
            metaTags: node.metaTags || [],
            primary: node.primary ?? node.type === "entry",
            dataType: node.dataType || "text",
            contextSize: node.contextSize || 0,
            branchCount: node.branchCount || 0,
            activeThreads: node.activeThreads || 1,
            lastMessageAt: node.updatedAt || node.createdAt,
            createdAt: node.createdAt,
          },
          style: {
            background: color,
            borderRadius: `${borderRadius}px`,
          },
        } satisfies Node;
      });

      const flowEdges: Edge[] = canvasData.edges.map((edge) => ({
        id: edge._id,
        source:
          (edge as any).source ?? (edge as any).from ?? (edge as EdgeData).from,
        target:
          (edge as any).target ?? (edge as any).to ?? (edge as EdgeData).to,
        label:
          edge.meta?.condition || edge.meta?.label || (edge as any).label || "",
        type: "smoothstep",
        animated: showNodeEffects,
        style: {
          stroke: edge.meta?.color || (edge as any).color || "#64748b",
          strokeWidth: 3,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edge.meta?.color || (edge as any).color || "#64748b",
          width: 24,
          height: 24,
        },
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    },
    [selectedNode, onNodeSelect, showNodeEffects, setNodes, setEdges]
  );

  useEffect(() => {
    let isMounted = true;

    const loadFromSource = (canvasData: CanvasData | null) => {
      if (!canvasData || !isMounted) return;
      setCanvas(canvasData);
      if (canvasData.viewportState) {
        setViewport(canvasData.viewportState);
      } else {
        setViewport({ x: 0, y: 0, zoom: 1 });
      }
      syncCanvasToFlow(canvasData);
    };

    const loadCanvas = async () => {
      try {
        const localCanvas = storageService.getCanvas(canvasId);
        if (localCanvas) {
          loadFromSource(localCanvas);
        }
      } catch (error) {
        console.error("Failed to read canvas from storage:", error);
      }

      try {
        const response = await fetch(`/api/canvases/${canvasId}`);
        if (response.ok) {
          const remoteData = await response.json();
          if (remoteData?.canvas) {
            storageService.saveCanvas(remoteData.canvas);
            loadFromSource(remoteData.canvas);
          }
        }
      } catch (error) {
        console.error("Failed to fetch canvas from API:", error);
      }
    };

    loadCanvas();

    return () => {
      isMounted = false;
    };
  }, [canvasId, syncCanvasToFlow]);

  useEffect(() => {
    if (!canvas?.viewportState) return;
    if (isViewportEqual(canvas.viewportState, viewport)) return;

    setViewport(canvas.viewportState);
    reactFlowInstance.setViewport(canvas.viewportState);
  }, [canvas?.viewportState, reactFlowInstance, viewport]);

  // Update node selection state without refetching canvas data
  useEffect(() => {
    setNodes((prev) =>
      prev.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isSelected: node.id === selectedNode,
        },
      }))
    );
  }, [selectedNode, setNodes]);

  // Toggle edge animation based on effect settings without refetching
  useEffect(() => {
    setEdges((prev) =>
      prev.map((edge) => ({
        ...edge,
        animated: showNodeEffects,
      }))
    );
  }, [showNodeEffects, setEdges]);

  /**
   * Intelligent Position Calculator for New Nodes
   *
   * Features:
   * - Avoids overlapping with existing nodes
   * - Snaps to grid for clean alignment
   * - Uses spiral search pattern to find optimal position
   * - Considers viewport center and drop position
   * - Maintains minimum spacing between nodes
   *
   * @param dropPosition - The position where user dropped the node (null for programmatic creation)
   * @param existingNodes - Array of current nodes on the canvas
   * @returns Optimal position for the new node
   */
  const calculateIntelligentPosition = useCallback(
    (
      dropPosition: { x: number; y: number } | null,
      existingNodes: Node[]
    ): { x: number; y: number } => {
      console.log("🎯 calculateIntelligentPosition called", {
        dropPosition,
        nodeCount: existingNodes.length,
      });

      const NODE_WIDTH = 280;
      const NODE_HEIGHT = 200;
      const MIN_SPACING = 60;
      const GRID_SNAP = 20;

      // Helper to check if a position overlaps with existing nodes
      const hasOverlap = (pos: { x: number; y: number }): boolean => {
        return existingNodes.some((node) => {
          const dx = Math.abs(node.position.x - pos.x);
          const dy = Math.abs(node.position.y - pos.y);
          return (
            dx < NODE_WIDTH + MIN_SPACING && dy < NODE_HEIGHT + MIN_SPACING
          );
        });
      };

      // Snap position to grid for cleaner layout
      const snapToGrid = (pos: { x: number; y: number }) => ({
        x: Math.round(pos.x / GRID_SNAP) * GRID_SNAP,
        y: Math.round(pos.y / GRID_SNAP) * GRID_SNAP,
      });

      // If dropped at a specific position and no overlap, use it
      if (dropPosition) {
        const snappedDrop = snapToGrid(dropPosition);
        const didSnap =
          snappedDrop.x !== dropPosition.x || snappedDrop.y !== dropPosition.y;

        if (!hasOverlap(snappedDrop)) {
          console.log(
            "✓ Intelligent Positioning: Using snapped drop position",
            {
              original: dropPosition,
              snapped: snappedDrop,
              didSnap,
            }
          );

          // Show indicator if we snapped to grid
          if (didSnap) {
            setIntelligentPositionUsed(true);
            setTimeout(() => setIntelligentPositionUsed(false), 2000);
          }
          return snappedDrop;
        }

        // Position has overlap, will use intelligent positioning
        console.log(
          "⚠ Intelligent Positioning: Overlap detected, searching for better position"
        );
        setIntelligentPositionUsed(true);
        setTimeout(() => setIntelligentPositionUsed(false), 2000);
      }

      // Calculate the center of the visible viewport
      const viewportCenter = {
        x: -viewport.x / viewport.zoom + window.innerWidth / 2 / viewport.zoom,
        y: -viewport.y / viewport.zoom + window.innerHeight / 2 / viewport.zoom,
      };

      // Start from drop position or viewport center
      const startPosition = dropPosition || viewportCenter;

      // Try the starting position first
      const snappedStart = snapToGrid(startPosition);
      if (!hasOverlap(snappedStart)) {
        console.log("✓ Intelligent Positioning: Using starting position", {
          start: startPosition,
          snapped: snappedStart,
        });

        // Show indicator since we're using intelligent positioning
        setIntelligentPositionUsed(true);
        setTimeout(() => setIntelligentPositionUsed(false), 2000);
        return snappedStart;
      }

      // Use spiral search pattern to find non-overlapping position
      const spiralSearch = (center: { x: number; y: number }) => {
        console.log(
          "🌀 Intelligent Positioning: Starting spiral search from",
          center
        );
        let radius = MIN_SPACING + NODE_HEIGHT;
        const maxRadius = 1000;
        const angleStep = Math.PI / 4; // 45 degrees

        while (radius < maxRadius) {
          const pointsInRing = Math.max(
            8,
            Math.floor((2 * Math.PI * radius) / 100)
          );

          for (let i = 0; i < pointsInRing; i++) {
            const angle = (i / pointsInRing) * 2 * Math.PI;
            const candidate = snapToGrid({
              x: center.x + radius * Math.cos(angle),
              y: center.y + radius * Math.sin(angle),
            });

            if (!hasOverlap(candidate)) {
              // Found an intelligent position
              console.log(
                "✓ Intelligent Positioning: Found clear position at radius",
                radius,
                candidate
              );
              setIntelligentPositionUsed(true);
              setTimeout(() => setIntelligentPositionUsed(false), 2500);
              return candidate;
            }
          }

          radius += MIN_SPACING + 40;
        }

        // Fallback: offset from center
        console.log("⚠ Intelligent Positioning: Using fallback position");
        setIntelligentPositionUsed(true);
        setTimeout(() => setIntelligentPositionUsed(false), 2500);
        return snapToGrid({
          x: center.x + 100,
          y: center.y + 100,
        });
      };

      const result = spiralSearch(snappedStart);
      console.log("✓ Intelligent Positioning: Final position", result);
      return result;
    },
    [viewport]
  );

  /**
   * Auto-Arrange Nodes in Tree Layout
   *
   * Features:
   * - Hierarchical tree structure based on edges
   * - Entry node at top
   * - Automatic spacing and alignment
   * - Smooth animation to new positions
   */
  const arrangeNodesInTreeLayout = useCallback(async () => {
    if (!canvas || nodes.length === 0) {
      toast.error("No nodes to arrange");
      return;
    }

    setIsArrangingNodes(true);
    console.log("🌳 Starting tree layout arrangement...");

    try {
      // Configuration
      const HORIZONTAL_SPACING = 350;
      const VERTICAL_SPACING = 250;
      const ROOT_X = 400;
      const ROOT_Y = 100;

      // Build adjacency map from edges
      const childrenMap = new Map<string, string[]>();
      const parentMap = new Map<string, string>();

      edges.forEach((edge) => {
        const parent = edge.source;
        const child = edge.target;

        if (!childrenMap.has(parent)) {
          childrenMap.set(parent, []);
        }
        childrenMap.get(parent)!.push(child);
        parentMap.set(child, parent);
      });

      // Find root node (entry node or node with no parent)
      const entryNode = nodes.find((n) => n.type === "entry");
      const rootNode =
        entryNode || nodes.find((n) => !parentMap.has(n.id)) || nodes[0];

      if (!rootNode) {
        toast.error("Could not determine root node");
        setIsArrangingNodes(false);
        return;
      }

      console.log("🎯 Root node:", rootNode.id);

      // Calculate positions using tree layout algorithm
      const positions = new Map<string, { x: number; y: number }>();
      const visited = new Set<string>();

      // Calculate subtree width for balanced layout
      const getSubtreeWidth = (nodeId: string): number => {
        if (visited.has(nodeId)) return 1;
        visited.add(nodeId);

        const children = childrenMap.get(nodeId) || [];
        if (children.length === 0) return 1;

        const childrenWidths = children.map((childId) =>
          getSubtreeWidth(childId)
        );
        return Math.max(
          1,
          childrenWidths.reduce((sum, w) => sum + w, 0)
        );
      };

      visited.clear();

      // Layout nodes recursively
      const layoutNode = (
        nodeId: string,
        x: number,
        y: number,
        availableWidth: number
      ) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);

        positions.set(nodeId, { x, y });
        console.log(`📍 Positioned ${nodeId} at (${x}, ${y})`);

        const children = childrenMap.get(nodeId) || [];
        if (children.length === 0) return;

        // Calculate widths for each subtree
        const subtreeWidths = children.map((childId) => {
          const tempVisited = new Set(visited);
          visited.clear();
          visited.add(nodeId);
          const width = getSubtreeWidth(childId);
          visited.forEach((id) => tempVisited.add(id));
          visited = tempVisited;
          return width;
        });

        const totalWidth = subtreeWidths.reduce((sum, w) => sum + w, 0);

        // Position children
        let currentX = x - ((totalWidth - 1) * HORIZONTAL_SPACING) / 2;

        children.forEach((childId, index) => {
          const childWidth = subtreeWidths[index];
          const childCenterX =
            currentX + ((childWidth - 1) * HORIZONTAL_SPACING) / 2;

          layoutNode(
            childId,
            childCenterX,
            y + VERTICAL_SPACING,
            childWidth * HORIZONTAL_SPACING
          );

          currentX += childWidth * HORIZONTAL_SPACING;
        });
      };

      // Start layout from root
      layoutNode(rootNode.id, ROOT_X, ROOT_Y, HORIZONTAL_SPACING);

      // Position any orphaned nodes (nodes not connected to the tree)
      let orphanX = ROOT_X + HORIZONTAL_SPACING * 2;
      let orphanY = ROOT_Y;
      nodes.forEach((node) => {
        if (!positions.has(node.id)) {
          positions.set(node.id, { x: orphanX, y: orphanY });
          console.log(
            `📍 Positioned orphan ${node.id} at (${orphanX}, ${orphanY})`
          );
          orphanY += VERTICAL_SPACING;
          if (orphanY > ROOT_Y + VERTICAL_SPACING * 3) {
            orphanY = ROOT_Y;
            orphanX += HORIZONTAL_SPACING;
          }
        }
      });

      // Update node positions with animation
      const updatedNodes = nodes.map((node) => ({
        ...node,
        position: positions.get(node.id) || node.position,
      }));

      setNodes(updatedNodes);

      // Prepare batch update for backend
      const nodeUpdates = Array.from(positions.entries()).map(
        ([id, position]) => ({
          id,
          position,
        })
      );

      // Save to backend
      await fetch(`/api/canvases/${canvasId}/layout`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: nodeUpdates,
        }),
      });

      // Update local canvas state
      const updatedCanvasNodes = canvas.nodes.map((node) => {
        const newPos = positions.get(node._id);
        return newPos ? { ...node, position: newPos } : node;
      });

      const nextCanvas: CanvasData = {
        ...canvas,
        nodes: updatedCanvasNodes,
        updatedAt: new Date().toISOString(),
      };

      setCanvas(nextCanvas);
      storageService.saveCanvas(nextCanvas);

      // Center viewport on the tree
      setTimeout(() => {
        reactFlowInstance.fitView({
          padding: 0.2,
          duration: 800,
        });
      }, 100);

      toast.success("Nodes arranged in tree layout!", { duration: 2000 });
      console.log("✅ Tree layout complete!");
    } catch (error) {
      console.error("Failed to arrange nodes:", error);
      toast.error("Failed to arrange nodes");
    } finally {
      setTimeout(() => setIsArrangingNodes(false), 800);
    }
  }, [nodes, edges, canvas, canvasId, setNodes, reactFlowInstance]);

  // Enhanced node creation with animations
  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragActive(false);

      if (!canvas) {
        toast.error("Canvas is still loading. Please try again in a moment.");
        return;
      }

      const rawType = event.dataTransfer.getData("application/reactflow");
      if (!rawType) return;

      const allowedTypes: NodeData["type"][] = ["entry", "branch", "context"];
      const resolvedType = allowedTypes.includes(rawType as NodeData["type"])
        ? (rawType as NodeData["type"])
        : "context";

      if (
        resolvedType === "entry" &&
        canvas.nodes.some((node) => node.type === "entry")
      ) {
        toast.warning("A canvas can only have one entry node.");
        return;
      }

      const bounds = event.currentTarget.getBoundingClientRect();
      const dropPosition = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      console.log("🎯 Node drop detected at position:", dropPosition);

      // Calculate intelligent position avoiding overlaps
      const position = calculateIntelligentPosition(dropPosition, nodes);

      console.log("✅ Intelligent position calculated:", position);

      // Always show indicator for new nodes to demonstrate the feature
      setIntelligentPositionUsed(true);
      toast.success("Node positioned intelligently!", { duration: 2000 });
      setTimeout(() => setIntelligentPositionUsed(false), 2500);

      const nodeId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `node_${Date.now()}`;
      const createdAt = new Date().toISOString();
      const defaultName = getDefaultNodeName(resolvedType);
      const defaultColor = getDefaultNodeColor(resolvedType);
      const colorScheme = getColorScheme(defaultColor);

      const newNode: NodeData = {
        _id: nodeId,
        name: defaultName,
        primary: resolvedType === "entry",
        type: resolvedType,
        chatMessages: [],
        runningSummary: "",
        contextContract:
          resolvedType === "context" ? "Add context information here..." : "",
        model: (canvas.settings?.defaultModel && canvas.settings.defaultModel !== "None" ? canvas.settings.defaultModel : getDefaultModel()),
        createdAt,
        position,
        color: defaultColor,
        textColor: colorScheme.text,
        dotColor: colorScheme.dot,
      };

      const nextCanvas: CanvasData = {
        ...canvas,
        nodes: [...canvas.nodes, newNode],
        ...(resolvedType === "entry" ? { primaryNodeId: nodeId } : {}),
        updatedAt: createdAt,
      };

      setIsCreatingNode(true);
      setLastCreatedNodeId(nodeId);
      setCanvas(nextCanvas);
      storageService.saveCanvas(nextCanvas);

      const flowNode: Node = {
        id: nodeId,
        type: resolvedType,
        position,
        data: {
          label: defaultName,
          messageCount: 0,
          isSelected: false,
          onClick: () => onNodeSelect(nodeId, defaultName),
          onSettingsClick: () => setCustomizingNodeId(nodeId),
          color: defaultColor,
          textColor: colorScheme.text,
          dotColor: colorScheme.dot,
          size: "medium",
          style: "modern",
          borderRadius: getDefaultBorderRadius(resolvedType),
          opacity: 100,
          model: newNode.model,
          metaTags: [],
          primary: resolvedType === "entry",
          dataType: "text",
          contextSize: 0,
          branchCount: 0,
          activeThreads: 1,
        },
        style: {
          background: defaultColor,
          borderRadius: `${getDefaultBorderRadius(resolvedType)}px`,
        },
      };

      setNodes((nds) => [...nds, flowNode]);

      try {
        const response = await fetch(`/api/canvases/${canvasId}/nodes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newNode),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        toast.success(`${defaultName} created successfully!`);
      } catch (error) {
        console.error("Failed to create node:", error);
        toast.error("Failed to create node");

        setNodes((nds) => nds.filter((n) => n.id !== nodeId));
        setCanvas((prev) => {
          if (!prev) return prev;
          const filteredNodes = prev.nodes.filter((n) => n._id !== nodeId);
          const reverted: CanvasData = {
            ...prev,
            nodes: filteredNodes,
            ...(prev.primaryNodeId === nodeId
              ? { primaryNodeId: canvas.primaryNodeId }
              : {}),
            updatedAt: new Date().toISOString(),
          };
          storageService.saveCanvas(reverted);
          return reverted;
        });
      } finally {
        setTimeout(() => {
          setIsCreatingNode(false);
          setLastCreatedNodeId(null);
        }, 600);
      }
    },
    [
      canvas,
      canvasId,
      onNodeSelect,
      reactFlowInstance,
      setNodes,
      calculateIntelligentPosition,
      nodes,
    ]
  );

  const onDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!isDragActive) setIsDragActive(true);
    },
    [isDragActive]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragActive(false);
  }, []);

  // Enhanced node customization handler
  const handleNodeCustomization = useCallback(
    async (nodeId: string, customData: any) => {
      if (!canvas) return;

      try {
        const colorScheme = getColorScheme(customData.color);

        // Update backend
        await fetch(`/api/canvases/${canvasId}/nodes/${nodeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: customData.label,
            color: customData.color,
            textColor: customData.textColor,
            dotColor: customData.dotColor,
            size: customData.size,
            style: customData.style,
            borderRadius: customData.borderRadius,
            opacity: customData.opacity,
          }),
        });

        // Update local state
        const updatedNodes = canvas.nodes.map((n) =>
          n._id === nodeId
            ? {
                ...n,
                name: customData.label,
                color: customData.color,
                textColor: customData.textColor,
                dotColor: customData.dotColor,
                size: customData.size,
                style: customData.style,
                borderRadius: customData.borderRadius,
                opacity: customData.opacity,
              }
            : n
        );

        const nextCanvas: CanvasData = {
          ...canvas,
          nodes: updatedNodes,
          updatedAt: new Date().toISOString(),
        };
        setCanvas(nextCanvas);
        storageService.saveCanvas(nextCanvas);

        // Update ReactFlow nodes
        setNodes((nds) =>
          nds.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    label: customData.label,
                    color: customData.color,
                    textColor: customData.textColor,
                    dotColor: customData.dotColor,
                    size: customData.size,
                    style: customData.style,
                    borderRadius: customData.borderRadius,
                    opacity: customData.opacity,
                  },
                  style: {
                    background: customData.color,
                    borderRadius: `${customData.borderRadius}px`,
                  },
                }
              : n
          )
        );

        // Update connected edges to match color scheme
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

        toast.success("Node customization saved!");
      } catch (error) {
        console.error("Failed to update node:", error);
        toast.error("Failed to save customization");
      }
    },
    [canvas, canvasId, setNodes, setEdges]
  );

  // Enhanced edge handling
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);

      changes.forEach((change) => {
        if (change.type === "select") {
          setSelectedEdge(change.selected ? change.id : null);
        }
      });
    },
    [onEdgesChange]
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node, nodes: Node[]) => {
      let nextCanvas: CanvasData | null = null;

      setCanvas((prev) => {
        if (!prev) return prev;

        // Get all selected nodes (for multi-drag support)
        const selectedNodes = nodes.filter(
          (n) => n.selected || n.id === node.id
        );

        // Create a map of updated positions
        const positionUpdates = new Map(
          selectedNodes.map((n) => [n.id, { ...n.position }])
        );

        // Update all dragged nodes
        const updatedNodes = prev.nodes.map((n) => {
          const newPosition = positionUpdates.get(n._id);
          return newPosition ? { ...n, position: newPosition } : n;
        });

        nextCanvas = {
          ...prev,
          nodes: updatedNodes,
          viewportState: viewport,
          updatedAt: new Date().toISOString(),
        };
        return nextCanvas;
      });

      if (nextCanvas) {
        storageService.saveCanvas(nextCanvas);
        queueLayoutSave({
          nodes: [{ id: node.id, position: { ...node.position } }],
          viewport,
        });
      }
    },
    [viewport, queueLayoutSave]
  );

  const handleMoveEnd = useCallback(
    (_: any, nextViewport: Viewport) => {
      setViewport(nextViewport);
      let nextCanvas: CanvasData | null = null;

      setCanvas((prev) => {
        if (!prev) return prev;
        if (isViewportEqual(prev.viewportState, nextViewport)) return prev;
        nextCanvas = {
          ...prev,
          viewportState: nextViewport,
          updatedAt: new Date().toISOString(),
        };
        return nextCanvas;
      });

      if (nextCanvas) {
        storageService.saveCanvas(nextCanvas);
        queueLayoutSave({ viewport: nextViewport });
      }
    },
    [queueLayoutSave]
  );

  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!canvas || !connection.source || !connection.target) return;
      if (connection.source === connection.target) {
        toast.error("A node can't connect to itself.");
        return;
      }

      const hasExistingEdge = canvas.edges.some(
        (edge) =>
          edge.from === connection.source && edge.to === connection.target
      );
      if (hasExistingEdge) {
        toast.warning("These nodes are already connected.");
        return;
      }

      const sourceNode = canvas.nodes.find((n) => n._id === connection.source);
      const targetNode = canvas.nodes.find((n) => n._id === connection.target);

      if (!sourceNode || !targetNode) {
        toast.error("Could not find nodes for this connection.");
        return;
      }

      const latestAssistantMessage = [...(sourceNode.chatMessages || [])]
        .reverse()
        .find((msg) => msg.role === "assistant");
      const forkedFromMessageId = latestAssistantMessage?.id;
      const parentMessageContent = latestAssistantMessage?.content;

      const edgeId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `edge_${Date.now()}`;
      const createdAt = new Date().toISOString();

      const newEdge: EdgeData = {
        _id: edgeId,
        from: connection.source,
        to: connection.target,
        createdAt,
        meta: {
          condition: "Connection",
          parentMessage: parentMessageContent,
        },
      };

      const updatedNodes = canvas.nodes.map((node) => {
        if (node._id !== connection.target) return node;
        return {
          ...node,
          parentNodeId: connection.source,
          forkedFromMessageId,
          data: {
            ...(node.data || {}),
            parentMessage: parentMessageContent,
          },
        } as NodeData;
      });

      const updatedCanvas: CanvasData = {
        ...canvas,
        nodes: updatedNodes,
        edges: [...canvas.edges, newEdge],
        updatedAt: createdAt,
      };

      setCanvas(updatedCanvas);
      storageService.saveCanvas(updatedCanvas);

      const parentColorScheme = getColorScheme(
        sourceNode.color || getDefaultNodeColor(sourceNode.type)
      );

      const flowEdge: Edge = {
        id: edgeId,
        source: connection.source,
        target: connection.target,
        label: "Connection",
        type: "smoothstep",
        animated: showNodeEffects,
        style: {
          stroke: parentColorScheme.edge,
          strokeWidth: 3,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: parentColorScheme.edge,
          width: 24,
          height: 24,
        },
      };

      setEdges((eds) => addEdge(flowEdge, eds));
      setNodes((nds) =>
        nds.map((node) =>
          node.id === connection.target
            ? {
                ...node,
                data: {
                  ...node.data,
                  parentNodeId: connection.source,
                  forkedFromMessageId,
                  parentMessage: parentMessageContent,
                },
              }
            : node
        )
      );

      try {
        const response = await fetch(`/api/canvases/${canvasId}/edges`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newEdge),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        scheduleParentUpdate(connection.target, {
          parentNodeId: connection.source,
          forkedFromMessageId,
          data: {
            ...(targetNode.data || {}),
            parentMessage: parentMessageContent,
          },
        });

        toast.success("Connection created!");
      } catch (error) {
        console.error("Failed to create connection:", error);
        toast.error("Failed to create connection");

        setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
        setNodes((nds) =>
          nds.map((node) =>
            node.id === connection.target
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    parentNodeId: targetNode.parentNodeId,
                    forkedFromMessageId: targetNode.forkedFromMessageId,
                    parentMessage: (targetNode.data as any)?.parentMessage,
                  },
                }
              : node
          )
        );
        setCanvas(canvas);
        storageService.saveCanvas(canvas);
      }
    },
    [canvas, canvasId, scheduleParentUpdate, setEdges, showNodeEffects]
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // Don't open chat panel if Shift is held (multi-selection mode)
      if (event.shiftKey) {
        return;
      }
      onNodeSelect(node.id, node.data.label);
    },
    [onNodeSelect]
  );

  // Helper functions
  const getDefaultNodeColor = (type: string) => {
    switch (type) {
      case "entry":
        return "#f0f9ff";
      case "branch":
        return "#f0fdf4";
      case "context":
        return "#f3e8ff";
      default:
        return "#f8fafc";
    }
  };

  const getDefaultTextColor = (type: string) => {
    switch (type) {
      case "entry":
        return "#0f172a";
      case "branch":
        return "#14532d";
      case "context":
        return "#7c3aed";
      default:
        return "#475569";
    }
  };

  const getDefaultDotColor = (type: string) => {
    switch (type) {
      case "entry":
        return "#3b82f6";
      case "branch":
        return "#16a34a";
      case "context":
        return "#8b5cf6";
      default:
        return "#64748b";
    }
  };

  const getDefaultBorderRadius = (type: string) => {
    switch (type) {
      case "entry":
        return 20;
      case "branch":
        return 20;
      case "context":
        return 24;
      default:
        return 16;
    }
  };

  const getDefaultNodeName = (type: string) => {
    switch (type) {
      case "entry":
        return "Entry Point";
      case "branch":
        return "Branch Point";
      case "context":
        return "Context Data";
      case "user-message":
        return "User Input";
      case "bot-response":
        return "Bot Response";
      default:
        return "New Node";
    }
  };

  return (
    <div
      className={`w-full h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 relative transition-all duration-300 ${
        isDragActive
          ? "ring-2 ring-indigo-300/70 ring-offset-4 ring-offset-white"
          : ""
      }`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Tree Layout & Effects Controls - Top Left */}
      <div className="absolute top-4 left-4 z-50 flex gap-2">
        <Button
          variant="outline"
          size="default"
          onClick={arrangeNodesInTreeLayout}
          disabled={isArrangingNodes || nodes.length === 0}
          className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-0 shadow-xl hover:shadow-2xl hover:from-indigo-600 hover:to-purple-600 transition-all font-semibold"
        >
          {isArrangingNodes ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Arranging...
            </>
          ) : (
            <>
              <Network size={18} className="mr-2" />
              Tree Layout
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNodeEffects(!showNodeEffects)}
          className="bg-white/95 backdrop-blur-sm border-slate-200/80 shadow-lg hover:shadow-xl"
        >
          <Sparkles size={14} className="mr-1" />
          {showNodeEffects ? "Disable" : "Enable"} Effects
        </Button>
      </div>

      {/* Enhanced Node Palette - Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <NodePaletteEnhanced />
      </div>

      {isDragActive && (
        <div className="absolute inset-0 bg-white/40 backdrop-blur-sm pointer-events-none rounded-3xl border-2 border-dashed border-indigo-200 transition-opacity duration-300" />
      )}
      {/* Enhanced Background Effects */}
      {showNodeEffects && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-blue-200/20 rounded-full blur-xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-200/20 rounded-full blur-xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-green-200/20 rounded-full blur-xl animate-pulse delay-500" />
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        onMoveEnd={handleMoveEnd}
        defaultViewport={viewport}
        nodeTypes={nodeTypes}
        className="bg-transparent"
        onNodeMouseEnter={(_, node) => setHoveredNodeId(node.id)}
        onNodeMouseLeave={(_, node) => setHoveredNodeId(null)}
        multiSelectionKeyCode="Shift"
        selectionKeyCode="Shift"
        selectNodesOnDrag={true}
        panOnDrag={[1, 2]}
        connectionLineStyle={{
          stroke: "#6366f1",
          strokeWidth: 3,
        }}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: showNodeEffects,
          style: {
            stroke: "#64748b",
            strokeWidth: 3,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#64748b",
            width: 24,
            height: 24,
          },
        }}
      >
        <Controls className="!bg-white/95 !backdrop-blur-sm !border-slate-200/80 !shadow-lg !rounded-xl" />
        
        <Panel position="top-right" className="!mr-12 !mt-12 pointer-events-auto">
             <div className="flex gap-2 bg-white/95 backdrop-blur-sm border border-slate-200/80 shadow-lg rounded-xl p-1.5">
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   onClick={performAutoLayout} 
                   title="Auto Align Nodes"
                   className="hover:bg-slate-100"
                 >
                    <Layout className="w-5 h-5 text-slate-600" />
                 </Button>
             </div>
        </Panel>

        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          className="opacity-30"
          color="#e2e8f0"
        />

        {/* Multi-Selection Help Tooltip - Inside ReactFlow for proper positioning */}
        <div className="absolute bottom-20 left-4 z-10 bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-lg px-3 py-2 shadow-lg text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono">
              Shift
            </kbd>
            <span>+ Click or Drag to select multiple nodes</span>
          </div>
        </div>

        {/* Quick Node Customization on Hover */}
        {hoveredNodeId && (
          <button
            className="absolute z-50 bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-xl p-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-white"
            style={{ left: 40, top: 40 }}
            onClick={() => {
              setCustomizingNodeId(hoveredNodeId);
            }}
          >
            <Palette size={16} className="text-slate-600" />
          </button>
        )}
      </ReactFlow>

      {/* Intelligent Positioning Indicator - Outside ReactFlow */}
      {intelligentPositionUsed && (
        <div className="absolute bottom-32 left-4 z-50 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white rounded-xl px-4 py-3 shadow-2xl text-sm font-semibold animate-in fade-in slide-in-from-bottom-4 duration-500 border-2 border-white/30">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Sparkles size={18} className="animate-pulse" />
              <div className="absolute inset-0 blur-sm">
                <Sparkles size={18} className="text-white/50" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-white drop-shadow-lg">
                Smart Positioning Active!
              </span>
              <span className="text-xs text-white/80 font-normal">
                Node placed intelligently
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Node Customization Panel */}
      {customizingNodeId && (
        <NodeCustomizationPanel
          nodeId={customizingNodeId}
          currentData={
            nodes.find((n) => n.id === customizingNodeId)?.data || {}
          }
          onSave={handleNodeCustomization}
          onClose={() => setCustomizingNodeId(null)}
        />
      )}

      {/* Creation Animation */}
      {isCreatingNode && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-slate-200/80">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-slate-700 font-medium">
                Creating node...
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tree Layout Animation */}
      {isArrangingNodes && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-indigo-500/95 to-purple-500/95 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border-2 border-white/30">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Network size={32} className="text-white animate-pulse" />
                <div className="absolute inset-0 blur-md">
                  <Network size={32} className="text-white/50" />
                </div>
              </div>
              <div className="text-center">
                <div className="text-white font-semibold text-lg">
                  Arranging Tree Layout
                </div>
                <div className="text-white/80 text-sm mt-1">
                  Organizing nodes hierarchically...
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
