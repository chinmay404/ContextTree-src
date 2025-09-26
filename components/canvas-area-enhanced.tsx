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
} from "reactflow";
import "reactflow/dist/style.css";
import { Settings, Edit2, Palette, Save, X, Sparkles } from "lucide-react";

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

const SAVE_DEBOUNCE_MS = 800;
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
      }, SAVE_DEBOUNCE_MS);
    },
    [flushPendingLayout]
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
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

  // Animation and effects
  const [isCreatingNode, setIsCreatingNode] = useState(false);
  const [lastCreatedNodeId, setLastCreatedNodeId] = useState<string | null>(
    null
  );

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

  // Enhanced node creation with animations
  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      const bounds = event.currentTarget.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      setIsCreatingNode(true);

      try {
        const response = await fetch(`/api/canvases/${canvasId}/nodes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            position,
            name: getDefaultNodeName(type),
          }),
        });

        if (!response.ok) throw new Error("Failed to create node");

        const newNode = await response.json();
        setLastCreatedNodeId(newNode._id);

        const defaultColor = getDefaultNodeColor(type);
        const colorScheme = getColorScheme(defaultColor);

        const flowNode: Node = {
          id: newNode._id,
          type,
          position,
          data: {
            label: newNode.name,
            messageCount: 0,
            isSelected: false,
            onClick: () => onNodeSelect(newNode._id, newNode.name),
            onSettingsClick: () => setCustomizingNodeId(newNode._id),
            color: defaultColor,
            textColor: colorScheme.text,
            dotColor: colorScheme.dot,
            size: "medium",
            style: "modern",
            borderRadius: getDefaultBorderRadius(type),
            opacity: 100,
            // Enhanced properties
            model: "gpt-4",
            metaTags: [],
            primary: type === "entry",
            dataType: "text",
            contextSize: 0,
            branchCount: 0,
            activeThreads: 1,
          },
          style: {
            background: defaultColor,
            borderRadius: `${getDefaultBorderRadius(type)}px`,
          },
        };

        setNodes((nds) => [...nds, flowNode]);

        // Show creation animation
        setTimeout(() => {
          setIsCreatingNode(false);
          setLastCreatedNodeId(null);
        }, 1000);

        toast.success(`${getDefaultNodeName(type)} created successfully!`);
      } catch (error) {
        console.error("Failed to create node:", error);
        toast.error("Failed to create node");
        setIsCreatingNode(false);
      }
    },
    [canvas, setNodes, onNodeSelect, canvasId, reactFlowInstance]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
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
    (_event: React.MouseEvent, node: Node) => {
      let nextCanvas: CanvasData | null = null;

      setCanvas((prev) => {
        if (!prev) return prev;
        const updatedNodes = prev.nodes.map((n) =>
          n._id === node.id ? { ...n, position: { ...node.position } } : n
        );
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

      try {
        const response = await fetch(`/api/canvases/${canvasId}/edges`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: connection.source,
            target: connection.target,
            label: "Connection",
          }),
        });

        if (!response.ok) throw new Error("Failed to create edge");

        const newEdge = await response.json();

        const flowEdge: Edge = {
          id: newEdge._id,
          source: connection.source,
          target: connection.target,
          label: "Connection",
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
        };

        setEdges((eds) => addEdge(flowEdge, eds));
        toast.success("Connection created!");
      } catch (error) {
        console.error("Failed to create connection:", error);
        toast.error("Failed to create connection");
      }
    },
    [canvas, canvasId, setEdges, showNodeEffects]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
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
      className="w-full h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 relative"
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
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
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          className="opacity-30"
          color="#e2e8f0"
        />

        {/* Enhanced Controls */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
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

      {/* Enhanced Node Palette */}
      <div className="absolute bottom-6 right-6 z-10">
        <NodePaletteEnhanced />
      </div>

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
    </div>
  );
}
