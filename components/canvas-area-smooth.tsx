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
  ConnectionMode,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Settings,
  Edit2,
  Palette,
  Save,
  X,
  Sparkles,
  Trash2,
} from "lucide-react";
import { getDefaultModel } from "@/lib/models";

import { EntryNodeMinimal as EntryNode } from "./nodes/entry-node-minimal";
import { BranchNodeMinimal as BranchNode } from "./nodes/branch-node-minimal";
import { ContextNodeMinimal as ContextNode } from "./nodes/context-node-minimal";
import { NodePalette } from "./node-palette";

// Enhanced node imports
import {
  EntryNodeEnhanced,
  BranchNodeEnhanced,
  ContextNodeEnhanced,
} from "./nodes/enhanced-nodes";

// Minimal edge import
import { CustomEdgeMinimal } from "./edges/custom-edge-minimal";
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

// Helper function to get appropriate colors
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
  };

  return (
    lightColors[bgColor] || { text: "#475569", dot: "#64748b", edge: "#94a3b8" }
  );
};

// Enhanced node types with flexible connection handling
const enhancedNodeTypes: NodeTypes = {
  entry: EntryNode,
  branch: BranchNode,
  context: ContextNode,
};

// Minimal edge types
const enhancedEdgeTypes = {
  custom: CustomEdgeMinimal,
  default: CustomEdgeMinimal,
};

interface CanvasAreaSmoothProps {
  canvasId: string;
  selectedNode: string | null;
  onNodeSelect: (nodeId: string | null, nodeName?: string, nodeType?: string) => void;
}

export function CanvasAreaSmooth({
  canvasId,
  selectedNode,
  onNodeSelect,
}: CanvasAreaSmoothProps) {
  const reactFlowInstance = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [canvas, setCanvas] = useState<CanvasData | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [showCustomizationPanel, setShowCustomizationPanel] =
    useState<boolean>(false);
  const [nodeCustomizations, setNodeCustomizations] = useState<
    Record<string, any>
  >({});

  // Enhanced state management
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [nodeNameInput, setNodeNameInput] = useState<string>("");
  const [nodeColorInput, setNodeColorInput] = useState<string>("#A3A3A3");
  const [edgeNameInput, setEdgeNameInput] = useState<string>("");
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>(
    ConnectionMode.Loose
  );
  const [customizingNodeId, setCustomizingNodeId] = useState<string | null>(
    null
  );

  // Canvas viewport state with smooth tracking
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [canvasSettings, setCanvasSettings] = useState({
    autoSave: true,
    saveInterval: 2000, // Faster saves for smooth experience
    smoothAnimations: true,
    connectionSnapping: true,
  });

  // Enhanced real-time update queues
  const positionUpdateQueueRef = useRef<
    Record<string, { x: number; y: number }>
  >({});
  const positionUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const parentUpdateQueueRef = useRef<Record<string, any>>({});
  const parentUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasSaveQueueRef = useRef<CanvasData | null>(null);
  const canvasSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Real-time position updates during drag
  const schedulePositionUpdate = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      positionUpdateQueueRef.current[nodeId] = position;

      if (positionUpdateTimerRef.current) {
        clearTimeout(positionUpdateTimerRef.current);
      }

      positionUpdateTimerRef.current = setTimeout(() => {
        const batch = positionUpdateQueueRef.current;
        positionUpdateQueueRef.current = {};
        positionUpdateTimerRef.current = null;

        Object.entries(batch).forEach(([id, pos]) => {
          fetch(`/api/canvases/${canvasId}/nodes/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ position: pos }),
          }).catch((err) => console.error("Position update failed", id, err));
        });
      }, 500); // Quick updates during drag
    },
    [canvasId]
  );

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
      }, 800);
    },
    [canvasId]
  );

  // Enhanced canvas save with optimistic updates
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

  // Enhanced node change handler with real-time updates
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      changes.forEach((change) => {
        if (change.type === "position" && change.position && change.dragging) {
          // Real-time position updates during drag
          setDraggedNodeId(change.id);
          setIsDragging(true);

          // Update local state immediately for smooth UI
          if (canvas) {
            const updatedNodes = canvas.nodes.map((n) =>
              n._id === change.id ? { ...n, position: change.position! } : n
            );

            const updatedCanvas = {
              ...canvas,
              nodes: updatedNodes,
            };

            // Optimistic local update
            setCanvas(updatedCanvas);
            storageService.saveCanvas(updatedCanvas);

            // Schedule database update
            schedulePositionUpdate(change.id, change.position!);
          }
        }

        if (change.type === "position" && !change.dragging && draggedNodeId) {
          // Drag ended - final save
          setIsDragging(false);
          setDraggedNodeId(null);

          if (canvas && change.position) {
            // Collect all nodes that were moved (handling multi-selection)
            const movedNodeIds = changes
              .filter(
                (c) =>
                  c.type === "position" && c.dragging === false && c.position
              )
              .map((c) => c.id);

            const updatedCanvas = {
              ...canvas,
              nodes: canvas.nodes.map((n) => {
                if (movedNodeIds.includes(n._id)) {
                  const nodeChange = changes.find(
                    (c) => c.id === n._id && c.type === "position"
                  );
                  if (
                    nodeChange &&
                    "position" in nodeChange &&
                    nodeChange.position
                  ) {
                    return { ...n, position: nodeChange.position };
                  }
                }
                return n;
              }),
              updatedAt: new Date().toISOString(),
            };

            scheduleCanvasSave(updatedCanvas);
          }
        }
      });

      onNodesChange(changes);
    },
    [
      canvas,
      onNodesChange,
      schedulePositionUpdate,
      scheduleCanvasSave,
      draggedNodeId,
    ]
  );

  // Enhanced connection handler with flexible connection points
  const onConnect = useCallback(
    (params: Connection) => {
      if (!canvas || !params.source || !params.target) return;

      console.log(`Connecting: ${params.source} -> ${params.target}`);

      const targetNode = canvas.nodes.find((n) => n._id === params.target);
      if (targetNode?.type === "context") {
        toast.error("Context nodes cannot receive incoming connections");
        return;
      }

      const newEdge: EdgeData = {
        _id: `edge_${Date.now()}`,
        from: params.source,
        to: params.target,
        createdAt: new Date().toISOString(),
        meta: {
          condition: "Always",
        },
      };

      // Update parent relationship
      const updatedNodes = canvas.nodes.map((n) => {
        if (n._id === params.target) {
          console.log(
            `Setting parent ${params.source} for node ${params.target}`
          );
          return { ...n, parentNodeId: params.source } as any;
        }
        return n;
      });

      const updatedCanvas: CanvasData = {
        ...canvas,
        nodes: updatedNodes,
        edges: [...canvas.edges, newEdge],
        updatedAt: new Date().toISOString(),
      };

      // Optimistic updates
      storageService.saveCanvas(updatedCanvas);
      setCanvas(updatedCanvas);
      scheduleCanvasSave(updatedCanvas);

      // Create enhanced smooth edge with interactive features
      const newReactFlowEdge = {
        id: newEdge._id,
        source: newEdge.from,
        target: newEdge.to,
        type: "custom-smooth",
        animated: canvasSettings.smoothAnimations,
        style: {
          stroke: "#10b981",
          strokeWidth: 3,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#10b981",
          width: 24,
          height: 24,
        },
        data: {
          condition: newEdge.meta.condition,
          label: `${params.source} → ${params.target}`,
          onDelete: () => {
            // Handle edge deletion through the enhanced edge component
            if (confirm("Delete this connection? This cannot be undone.")) {
              const updatedNodes = canvas.nodes.map((n) =>
                n._id === newEdge.to ? { ...n, parentNodeId: undefined } : n
              );
              const updatedEdges = canvas.edges.filter(
                (e) => e._id !== newEdge._id
              );

              const updatedCanvas = {
                ...canvas,
                edges: updatedEdges,
                nodes: updatedNodes,
                updatedAt: new Date().toISOString(),
              };

              storageService.saveCanvas(updatedCanvas);
              setCanvas(updatedCanvas);
              scheduleCanvasSave(updatedCanvas);

              setEdges((eds) => eds.filter((e) => e.id !== newEdge._id));

              fetch(`/api/canvases/${canvasId}/edges/${newEdge._id}`, {
                method: "DELETE",
              });

              scheduleParentUpdate(newEdge.to, { parentNodeId: undefined });
              toast.success("Connection removed", { duration: 2000 });
            }
          },
          onEdit: () => {
            // Future: Open edge editing dialog
            toast.info("Edge editing coming soon!", { duration: 2000 });
          },
        },
      };

      setEdges((eds) => addEdge(newReactFlowEdge, eds));

      // Persist to backend with enhanced error handling
      fetch(`/api/canvases/${canvasId}/edges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEdge),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(() => {
          // Update edge styling after successful save
          setEdges((eds) =>
            eds.map((e) =>
              e.id === newEdge._id
                ? {
                    ...e,
                    style: { stroke: "#64748b", strokeWidth: 2 },
                    animated: false,
                  }
                : e
            )
          );
          toast.success("Connection saved to database", { duration: 1500 });
        })
        .catch((error) => {
          console.error("Failed to save edge to database:", error);
          toast.error("Failed to save connection. It will be saved locally.", {
            duration: 3000,
          });
        });

      // Persist parent linkage
      scheduleParentUpdate(params.target, { parentNodeId: params.source });

      toast.success(
        `Node connected: ${params.target} → parent: ${params.source}`,
        { duration: 2000 }
      );
    },
    [
      canvas,
      canvasId,
      scheduleCanvasSave,
      scheduleParentUpdate,
      setEdges,
      canvasSettings.smoothAnimations,
    ]
  );

  // Enhanced edge deletion with confirmation
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setSelectedEdge(edge.id);
  }, []);

  // Keyboard shortcuts for enhanced UX
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Delete selected node or edge
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();

        if (selectedEdge && canvas) {
          if (confirm("Delete this connection? This cannot be undone.")) {
            // Find the edge to determine target node
            const edgeToDelete = canvas.edges.find(
              (e) => e._id === selectedEdge
            );
            if (edgeToDelete) {
              // Remove parent relationship
              const updatedNodes = canvas.nodes.map((n) =>
                n._id === edgeToDelete.to
                  ? { ...n, parentNodeId: undefined }
                  : n
              );

              const updatedEdges = canvas.edges.filter(
                (e) => e._id !== selectedEdge
              );

              const updatedCanvas = {
                ...canvas,
                edges: updatedEdges,
                nodes: updatedNodes,
                updatedAt: new Date().toISOString(),
              };

              // Optimistic updates
              storageService.saveCanvas(updatedCanvas);
              setCanvas(updatedCanvas);
              scheduleCanvasSave(updatedCanvas);

              setEdges((eds) => eds.filter((e) => e.id !== selectedEdge));

              // Delete from backend
              fetch(`/api/canvases/${canvasId}/edges/${selectedEdge}`, {
                method: "DELETE",
              });

              scheduleParentUpdate(edgeToDelete.to, {
                parentNodeId: undefined,
              });

              toast.success("Connection removed", { duration: 2000 });
              setSelectedEdge(null);
            }
          }
        }

        if (selectedNode && canvas) {
          if (
            confirm(
              "Delete this node? This will also remove all its connections."
            )
          ) {
            // Remove node and all associated edges
            const updatedNodes = canvas.nodes.filter(
              (n) => n._id !== selectedNode
            );
            const updatedEdges = canvas.edges.filter(
              (e) => e.from !== selectedNode && e.to !== selectedNode
            );

            const updatedCanvas = {
              ...canvas,
              nodes: updatedNodes,
              edges: updatedEdges,
              updatedAt: new Date().toISOString(),
            };

            storageService.saveCanvas(updatedCanvas);
            setCanvas(updatedCanvas);
            scheduleCanvasSave(updatedCanvas);

            setNodes((nds) => nds.filter((n) => n.id !== selectedNode));
            setEdges((eds) =>
              eds.filter(
                (e) => e.source !== selectedNode && e.target !== selectedNode
              )
            );

            // Delete from backend
            fetch(`/api/canvases/${canvasId}/nodes/${selectedNode}`, {
              method: "DELETE",
            });

            toast.success("Node deleted", { duration: 2000 });
            onNodeSelect(null);
          }
        }
      }

      // Toggle connection mode (Ctrl/Cmd + C)
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
        event.preventDefault();
        setConnectionMode((mode) =>
          mode === ConnectionMode.Loose
            ? ConnectionMode.Strict
            : ConnectionMode.Loose
        );
        toast.info(
          `Connection mode: ${
            connectionMode === ConnectionMode.Loose ? "Strict" : "Loose"
          }`,
          { duration: 2000 }
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedNode,
    selectedEdge,
    canvas,
    canvasId,
    connectionMode,
    setNodes,
    setEdges,
    scheduleCanvasSave,
    scheduleParentUpdate,
    onNodeSelect,
  ]);

  // Load canvas data
  useEffect(() => {
    const loadCanvas = async () => {
      console.log("Loading canvas:", canvasId);
      let canvasData: CanvasData | null = null;

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
          canvasData = responseData.canvas;
          console.log(
            "Canvas loaded from API:",
            canvasId,
            "with",
            canvasData?.nodes?.length || 0,
            "nodes"
          );

          if (canvasData) {
            storageService.saveCanvas(canvasData);
          }
        } else {
          console.log(
            "Canvas not found in API, trying localStorage:",
            canvasId
          );
          canvasData = storageService.getCanvas(canvasId);

          if (canvasData) {
            console.log(
              "Canvas found in localStorage, syncing to database:",
              canvasId
            );
            const syncResponse = await fetch("/api/canvases", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(canvasData),
            });
            if (!syncResponse.ok) {
              console.error("Failed to sync canvas to database");
            }
          }
        }
      } catch (error) {
        console.error("Error loading canvas:", error);
        canvasData = storageService.getCanvas(canvasId);
      }

      if (canvasData) {
        setCanvas(canvasData);

        // Convert to ReactFlow format with enhanced features
        const flowNodes: Node[] = canvasData.nodes.map((node) => {
          const colorScheme = getColorScheme(node.color || "#f8fafc");

          return {
            id: node._id,
            type: node.type,
            position: node.position || { x: 250, y: 100 },
            data: {
              label:
                node.name ||
                `${
                  node.type.charAt(0).toUpperCase() + node.type.slice(1)
                } Node`,
              messageCount: node.chatMessages?.length || 0,
              isSelected: node._id === selectedNode,
              model: node.model,
              color: node.color || "#f8fafc",
              textColor: colorScheme.text,
              dotColor: colorScheme.dot,
              connectionCount: canvasData.edges.filter(
                (e) => e.from === node._id || e.to === node._id
              ).length,
              isRunning: false, // Will be updated based on activity
              lastActivity: node.createdAt,
              onClick: () => onNodeSelect(node._id, node.name || "Node", node.type),
              onSettingsClick: () => {
                setCustomizingNodeId(node._id);
                setShowCustomizationPanel(true);
              },
            },
            style: {
              background: node.color || "#f8fafc",
              border:
                node._id === selectedNode
                  ? "2px solid #3b82f6"
                  : "1px solid #e2e8f0",
              borderRadius: "12px",
              boxShadow: canvasSettings.smoothAnimations
                ? "0 4px 12px rgba(0, 0, 0, 0.1)"
                : "0 2px 4px rgba(0, 0, 0, 0.1)",
              transition: "all 0.2s ease-in-out",
            },
            className:
              isDragging && draggedNodeId === node._id ? "dragging" : "",
          } as Node;
        });

        const flowEdges: Edge[] = canvasData.edges.map((edge) => ({
          id: edge._id,
          source: edge.from,
          target: edge.to,
          type: "custom-smooth",
          animated:
            canvasSettings.smoothAnimations &&
            (selectedNode === edge.from || selectedNode === edge.to),
          style: {
            stroke: edge._id === selectedEdge ? "#ef4444" : "#64748b",
            strokeWidth: edge._id === selectedEdge ? 3 : 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edge._id === selectedEdge ? "#ef4444" : "#64748b",
            width: 22,
            height: 22,
          },
          data: {
            ...edge.meta,
            condition: edge.meta?.condition || "Connected",
            label: edge.meta?.condition || `${edge.from} → ${edge.to}`,
            onDelete: () => {
              if (confirm("Delete this connection? This cannot be undone.")) {
                const updatedNodes = canvasData.nodes.map((n) =>
                  n._id === edge.to ? { ...n, parentNodeId: undefined } : n
                );
                const updatedEdges = canvasData.edges.filter(
                  (e) => e._id !== edge._id
                );

                const updatedCanvas = {
                  ...canvasData,
                  edges: updatedEdges,
                  nodes: updatedNodes,
                  updatedAt: new Date().toISOString(),
                };

                storageService.saveCanvas(updatedCanvas);
                setCanvas(updatedCanvas);
                scheduleCanvasSave(updatedCanvas);

                setEdges((eds) => eds.filter((e) => e.id !== edge._id));

                fetch(`/api/canvases/${canvasId}/edges/${edge._id}`, {
                  method: "DELETE",
                });

                scheduleParentUpdate(edge.to, { parentNodeId: undefined });
                toast.success("Connection removed", { duration: 2000 });
                setSelectedEdge(null);
              }
            },
            onEdit: () => {
              toast.info("Edge editing coming soon!", { duration: 2000 });
            },
          },
          selected: edge._id === selectedEdge,
        }));

        setNodes(flowNodes);
        setEdges(flowEdges);

        // Restore viewport if available
        if (canvasData.viewportState) {
          setViewport(canvasData.viewportState);
          // Apply viewport to ReactFlow instance
          setTimeout(() => {
            reactFlowInstance?.setViewport(canvasData.viewportState!);
          }, 100);
        }
      }
    };

    loadCanvas();
  }, [
    canvasId,
    selectedNode,
    selectedEdge,
    onNodeSelect,
    reactFlowInstance,
    setNodes,
    setEdges,
    canvasSettings.smoothAnimations,
    isDragging,
    draggedNodeId,
  ]);

  // Enhanced node click handler
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // Don't open chat panel if Shift is held (multi-selection mode)
      if (event.shiftKey) {
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

  // Handle node hover for visual feedback
  const onNodeMouseEnter = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setHoveredNodeId(node.id);
      if (canvasSettings.smoothAnimations) {
        // Highlight connected edges
        setEdges((eds) =>
          eds.map((e) =>
            e.source === node.id || e.target === node.id
              ? {
                  ...e,
                  style: { ...e.style, strokeWidth: 3, stroke: "#3b82f6" },
                }
              : e
          )
        );
      }
    },
    [setEdges, canvasSettings.smoothAnimations]
  );

  const onNodeMouseLeave = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setHoveredNodeId(null);
      if (canvasSettings.smoothAnimations) {
        // Reset edge styling
        setEdges((eds) =>
          eds.map((e) =>
            e.source === node.id || e.target === node.id
              ? {
                  ...e,
                  style: {
                    ...e.style,
                    strokeWidth: e.id === selectedEdge ? 3 : 2,
                    stroke: e.id === selectedEdge ? "#ef4444" : "#64748b",
                  },
                }
              : e
          )
        );
      }
    },
    [setEdges, selectedEdge, canvasSettings.smoothAnimations]
  );

  // Drag and drop handling for new nodes
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow/type");
      if (!type || !canvas) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: NodeData = {
        _id: `node_${Date.now()}`,
        name: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
        type: type as any,
        primary: type === "entry",
        chatMessages: [],
        runningSummary: "",
        contextContract: "",
        model: (canvas.settings?.defaultModel && canvas.settings.defaultModel !== "None" ? canvas.settings.defaultModel : getDefaultModel()),
        createdAt: new Date().toISOString(),
        position,
        color:
          type === "entry"
            ? "#e0e7ff"
            : type === "branch"
            ? "#dcfce7"
            : "#fef3c7",
      };

      const updatedCanvas: CanvasData = {
        ...canvas,
        nodes: [...canvas.nodes, newNode],
        updatedAt: new Date().toISOString(),
      };

      storageService.saveCanvas(updatedCanvas);
      setCanvas(updatedCanvas);
      scheduleCanvasSave(updatedCanvas);

      // Add to ReactFlow with enhanced features
      const colorScheme = getColorScheme(newNode.color || "#f8fafc");
      const newReactFlowNode: Node = {
        id: newNode._id,
        type: newNode.type,
        position,
        data: {
          label: newNode.name,
          messageCount: 0,
          isSelected: false,
          model: newNode.model,
          color: newNode.color,
          textColor: colorScheme.text,
          dotColor: colorScheme.dot,
          connectionCount: 0,
          isRunning: false,
          lastActivity: new Date().toISOString(),
          onClick: () => onNodeSelect(newNode._id, newNode.name, newNode.type),
          onSettingsClick: () => setShowCustomizationPanel(true),
        },
        style: {
          background: newNode.color,
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          transition: "all 0.2s ease-in-out",
        },
      };

      setNodes((nds) => [...nds, newReactFlowNode]);

      // Persist to backend with enhanced error handling
      fetch(`/api/canvases/${canvasId}/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNode),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(() => {
          toast.success(`${newNode.name} created and saved`, {
            duration: 2000,
          });
        })
        .catch((error) => {
          console.error("Failed to save node to database:", error);
          toast.error("Node created locally. Database save failed.", {
            duration: 3000,
          });
        });

      onNodeSelect(newNode._id, newNode.name, newNode.type);
    },
    [
      canvas,
      canvasId,
      reactFlowInstance,
      setNodes,
      scheduleCanvasSave,
      onNodeSelect,
    ]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onEdgeClick={onEdgeClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={enhancedNodeTypes}
        edgeTypes={enhancedEdgeTypes}
        connectionMode={connectionMode}
        fitView
        fitViewOptions={{
          padding: 0.2,
        }}
        minZoom={0.2}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        onViewportChange={setViewport}
        deleteKeyCode={null} // Handle delete manually for better UX
        multiSelectionKeyCode="Shift"
        selectionKeyCode="Shift"
        selectNodesOnDrag={true}
        panOnDrag={[1, 2]}
        className="bg-gradient-to-br from-slate-50 to-blue-50"
      >
        <Controls showZoom={true} showFitView={true} showInteractive={true} />
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="#cbd5e1"
        />

        {/* Multi-Selection Help Tooltip */}
        <Panel
          position="bottom-left"
          className="bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-lg px-3 py-2 shadow-lg text-xs text-slate-600"
        >
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono">
              Shift
            </kbd>
            <span>+ Click or Drag to select multiple nodes</span>
          </div>
        </Panel>

        {/* Status Panel */}
        <Panel
          position="top-left"
          className="bg-white/80 backdrop-blur-sm rounded-lg p-3 shadow-lg"
        >
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isDragging ? "bg-orange-500" : "bg-green-500"
                }`}
              />
              <span className="font-medium">
                {isDragging ? "Moving node..." : "Ready"}
              </span>
            </div>
            <div className="text-xs text-gray-600">
              Connection:{" "}
              {connectionMode === ConnectionMode.Loose ? "Flexible" : "Strict"}
            </div>
            {selectedEdge && (
              <div className="text-xs text-red-600">
                Press Delete to remove connection
              </div>
            )}
          </div>
        </Panel>

        {/* Enhanced Node Palette */}
        <Panel position="top-right">
          <NodePaletteEnhanced />
        </Panel>
      </ReactFlow>

      {/* Enhanced customization panel */}
      {showCustomizationPanel && (
        <NodeCustomizationPanel
          isOpen={showCustomizationPanel}
          onClose={() => setShowCustomizationPanel(false)}
          nodeId={selectedNode || ""}
          onCustomize={(nodeId, customization) => {
            setNodeCustomizations((prev) => ({
              ...prev,
              [nodeId]: customization,
            }));
          }}
        />
      )}

      {/* Custom styles for smooth animations */}
      <style jsx>{`
        .dragging {
          opacity: 0.8;
          transform: scale(1.05);
          z-index: 1000;
        }

        .react-flow__edge.animated {
          stroke-dasharray: 5;
          animation: dashdraw 0.5s linear infinite;
        }

        @keyframes dashdraw {
          to {
            stroke-dashoffset: -10;
          }
        }

        .react-flow__node {
          transition: all 0.2s ease-in-out;
        }

        .react-flow__node:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        }

        .react-flow__edge {
          transition: all 0.2s ease-in-out;
        }

        .react-flow__edge:hover {
          stroke-width: 4px !important;
        }
      `}</style>
    </div>
  );
}
