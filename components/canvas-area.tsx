"use client";

import type React from "react";
import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import ReactFlow, {
  type Node,
  type Edge,
  type EdgeChange,
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
} from "reactflow";
import "reactflow/dist/style.css";
import { Settings, Edit2, Palette, Save, X, Sparkles } from "lucide-react";

import { EntryNode } from "./nodes/entry-node";
import { BranchNode } from "./nodes/branch-node";
import { ContextNode } from "./nodes/context-node";
import { NodePalette } from "./node-palette";

// Glassmorphic node imports
import { EntryNodeGlass } from "./nodes/entry-node-glass";
import { BranchNodeGlass } from "./nodes/branch-node-glass";
import { ContextNodeGlass } from "./nodes/context-node-glass";
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
};

const glassNodeTypes: NodeTypes = {
  entry: EntryNodeGlass,
  branch: BranchNodeGlass,
  context: ContextNodeGlass,
};

interface CanvasAreaProps {
  canvasId: string;
  selectedNode: string | null;
  onNodeSelect: (nodeId: string | null, nodeName?: string) => void;
}

export function CanvasArea({
  canvasId,
  selectedNode,
  onNodeSelect,
}: CanvasAreaProps) {
  const reactFlowInstance = useReactFlow();
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
  // Add state for editing node/edge
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [nodeNameInput, setNodeNameInput] = useState<string>("");
  const [nodeColorInput, setNodeColorInput] = useState<string>("#A3A3A3");
  const [edgeNameInput, setEdgeNameInput] = useState<string>("");
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Batched parent lineage updates to minimize network chatter
  const parentUpdateQueueRef = useRef<Record<string, any>>({});
  const parentUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
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
      }, 250); // debounce window
    },
    [canvasId]
  );

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
                },
              }
            : node
        )
      );
    },
    [setNodes]
  );

  // Always use glass node types
  const currentNodeTypes = useMemo(() => {
    return glassNodeTypes;
  }, []);

  // Handle Delete key for node/edge deletion and auto-layout shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Delete") {
        // Prevent deletion of primary node
        if (selectedNode && canvas) {
          const primaryNodeId = canvas.primaryNodeId;
          if (selectedNode === primaryNodeId) {
            alert("Main node cannot be deleted.");
            return;
          }
          // Remove node and detach children lineage
          const children = canvas.nodes.filter(
            (n) => (n as any).parentNodeId === selectedNode
          );
          const updatedNodes = canvas.nodes
            .filter((n) => n._id !== selectedNode)
            .map((n) =>
              (n as any).parentNodeId === selectedNode
                ? { ...n, parentNodeId: undefined }
                : n
            );
          const updatedEdges = canvas.edges.filter(
            (e) => e.from !== selectedNode && e.to !== selectedNode
          );
          const updatedCanvas = {
            ...canvas,
            nodes: updatedNodes,
            edges: updatedEdges,
          };
          storageService.saveCanvas(updatedCanvas);
          setCanvas(updatedCanvas);
          setNodes((nds) => nds.filter((n) => n.id !== selectedNode));
          setEdges((eds) =>
            eds.filter(
              (e) => e.source !== selectedNode && e.target !== selectedNode
            )
          );
          // If the deleted node was currently selected (open in chat), clear selection to close chat panel
          onNodeSelect(null);
          // Delete node from backend
          fetch(`/api/canvases/${canvasId}/nodes/${selectedNode}`, {
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
          // Persist cleared parent for children
          children.forEach((child) => {
            scheduleParentUpdate(child._id, { parentNodeId: undefined });
          });
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
  }, [selectedNode, selectedEdge, canvas, canvasId, setNodes, setEdges]);

  useEffect(() => {
    const loadCanvas = async () => {
      // First, try to load from localStorage
      let canvasData = storageService.getCanvas(canvasId);

      if (canvasData) {
        setCanvas(canvasData);

        // Sync to MongoDB if not already there
        try {
          const dbResponse = await fetch(`/api/canvases/${canvasId}`);
          if (!dbResponse.ok) {
            // Canvas doesn't exist in DB, create it
            console.log("Syncing canvas to database:", canvasId);
            const syncResponse = await fetch("/api/canvases", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(canvasData),
            });
            if (syncResponse.ok) {
              console.log("Canvas synced successfully");
            } else {
              console.error(
                "Failed to sync canvas:",
                await syncResponse.text()
              );
            }
          }
        } catch (err) {
          console.error("Failed to sync canvas to database:", err);
        }

        // Convert NodeData to React Flow nodes (enhanced metadata)
        const flowNodes: Node[] = canvasData.nodes.map((node) => {
          const colorScheme = getColorScheme(node.color || "#f8fafc");
          const lastMessage = [...(node.chatMessages || [])].pop();
          const lastMessageAt = lastMessage?.timestamp || node.createdAt;
          return {
            id: node._id,
            type: node.type,
            position: node.position || { x: 250, y: 100 },
            data: {
              label:
                node.name ||
                (node.type === "entry"
                  ? "Entry Point"
                  : node.type === "branch"
                  ? "Branch"
                  : "Context"),
              messageCount: node.chatMessages.length,
              model: node.model,
              metaTags: node.metaTags || [],
              lastMessageAt,
              createdAt: node.createdAt,
              primary: node.primary,
              isSelected: selectedNode === node._id,
              color: node.color,
              textColor: colorScheme.text,
              dotColor: colorScheme.dot,
              parentNodeId: (node as any).parentNodeId,
              forkedFromMessageId: (node as any).forkedFromMessageId,
              onClick: () =>
                onNodeSelect(
                  node._id,
                  node.name ||
                    (node.type === "entry"
                      ? "Entry Point"
                      : node.type === "branch"
                      ? "Branch"
                      : "Context")
                ),
              onSettingsClick: () => handleNodeSettingsClick(node._id),
            },
            style: node.color
              ? {
                  background: node.color,
                  color: colorScheme.text,
                  borderColor: colorScheme.dot,
                }
              : {},
          };
        });

        // Convert EdgeData to React Flow edges
        const flowEdges: Edge[] = canvasData.edges.map((edge) => {
          // Find source node to get its color scheme for edge styling
          const sourceNode = canvasData.nodes.find(
            (node) => node._id === edge.from
          );
          const sourceColorScheme = getColorScheme(
            sourceNode?.color || "#f8fafc"
          );

          return {
            id: edge._id,
            source: edge.from,
            target: edge.to,
            data: edge.meta,
            type: "smoothstep",
            style: {
              stroke: sourceColorScheme.edge,
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: sourceColorScheme.edge,
              width: 20,
              height: 20,
            },
            animated: false,
          };
        });

        setNodes(flowNodes);
        setEdges(flowEdges);
      }
    };

    if (canvasId) {
      loadCanvas();
    }
  }, [canvasId, selectedNode, onNodeSelect, setNodes, setEdges]);

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
      setNodes((nds) => [
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
            onClick: () => onNodeSelect(node._id, node.name || "Node"),
          },
        } as any,
      ]);
      // Add reactflow edge
      setEdges((eds) => [
        ...eds,
        {
          id: edge._id,
          source: edge.from,
          target: edge.to,
          data: edge.meta,
          type: "smoothstep",
          style: { stroke: "#64748b", strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#64748b",
            width: 20,
            height: 20,
          },
        } as any,
      ]);
    };
    window.addEventListener("canvas-fork-node", handler as any);
    const selectHandler = (e: any) => {
      const { nodeId } = e.detail || {};
      if (nodeId) {
        const rfNode = nodes.find((n) => n.id === nodeId);
        onNodeSelect(nodeId, (rfNode as any)?.data?.label || "Node");
      }
    };
    window.addEventListener("canvas-select-node", selectHandler as any);
    return () => window.removeEventListener("canvas-fork-node", handler as any);
  }, [canvasId, setNodes, setEdges, onNodeSelect, nodes]);

  useEffect(() => {
    return () => {
      window.removeEventListener("canvas-select-node", (() => {}) as any);
    };
  }, [canvasId, setNodes, setEdges, onNodeSelect]);

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const nodeName =
        node.data.label ||
        (node.type === "entry"
          ? "Entry Point"
          : node.type === "branch"
          ? "Branch Point"
          : "Context Data");
      onNodeSelect(node.id, nodeName);
    },
    [onNodeSelect]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (!canvas || !params.source || !params.target) return;

      console.log(`Connecting: ${params.source} -> ${params.target}`);

      const newEdge: EdgeData = {
        _id: `edge_${Date.now()}`,
        from: params.source,
        to: params.target,
        createdAt: new Date().toISOString(),
        meta: {
          condition: "Always",
        },
      };

      // Always assign parent relationship when connecting (override existing if any)
      const targetNode = canvas.nodes.find((n) => n._id === params.target);
      const updatedNodes = canvas.nodes.map((n) => {
        if (n._id === params.target) {
          console.log(
            `Setting parent ${params.source} for node ${params.target}`
          );
          return { ...n, parentNodeId: params.source } as any;
        }
        return n;
      });

      // Update canvas with new edge + parent assignment
      const updatedCanvas: CanvasData = {
        ...canvas,
        nodes: updatedNodes,
        edges: [...canvas.edges, newEdge],
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
        `Scheduling parent update: ${params.target} -> parent: ${params.source}`
      );
      scheduleParentUpdate(params.target, { parentNodeId: params.source });

      // Visual feedback for parent relationship
      toast.success(
        `Node connected: ${params.target} → parent: ${params.source}`,
        {
          duration: 2000,
        }
      );

      // Enhanced React Flow edge styling
      const flowEdge: Edge = {
        id: newEdge._id,
        source: newEdge.from,
        target: newEdge.to,
        data: newEdge.meta,
        type: "smoothstep",
        style: {
          stroke: "#475569",
          strokeWidth: 3,
          strokeDasharray: undefined,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#475569",
          width: 24,
          height: 24,
        },
        animated: false,
      };

      setEdges((eds) => addEdge(flowEdge, eds));
    },
    [canvas, setEdges, canvasId]
  );

  // Intercept edge changes (e.g., via React Flow UI removals) to clear parent lineage if needed
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (!canvas) return onEdgesChange(changes);
      let updatedCanvas = canvas;
      let edgesChanged = false;
      let nodesChanged = false;
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
      onEdgesChange(changes);
      if (edgesChanged || nodesChanged) {
        storageService.saveCanvas(updatedCanvas);
        setCanvas(updatedCanvas);
      }
    },
    [canvas, onEdgesChange, canvasId]
  );

  const onNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (!canvas) return;

      // Update node position in storage
      const updatedNodes = canvas.nodes.map((n) =>
        n._id === node.id ? { ...n, position: node.position } : n
      );

      const updatedCanvas: CanvasData = {
        ...canvas,
        nodes: updatedNodes,
      };

      storageService.saveCanvas(updatedCanvas);
      setCanvas(updatedCanvas);
    },
    [canvas]
  );

  // Highlight & animate edges: direct (tier 1) + neighbor edges (tier 2)
  useEffect(() => {
    if (!selectedNode) {
      setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          animated: false,
          style: {
            ...(e.style || {}),
            strokeWidth: 2,
            filter: "none",
            strokeDasharray: undefined,
          },
        }))
      );
      return;
    }

    setEdges((eds) => {
      const directEdgeIds = new Set<string>();
      const neighborNodes = new Set<string>();

      // Collect direct edges & neighbor nodes
      for (const e of eds) {
        if (e.source === selectedNode || e.target === selectedNode) {
          directEdgeIds.add(e.id);
          neighborNodes.add(e.source === selectedNode ? e.target : e.source);
        }
      }

      // Second-level edges (connected to neighbor nodes but not direct)
      const secondLevelEdgeIds = new Set<string>();
      for (const e of eds) {
        if (directEdgeIds.has(e.id)) continue;
        if (neighborNodes.has(e.source) || neighborNodes.has(e.target)) {
          secondLevelEdgeIds.add(e.id);
        }
      }

      return eds.map((e) => {
        const stroke = (e.style as any)?.stroke || "#64748b";
        const isDirect = directEdgeIds.has(e.id);
        const isSecond = !isDirect && secondLevelEdgeIds.has(e.id);
        if (!isDirect && !isSecond) {
          return {
            ...e,
            animated: false,
            style: {
              ...e.style,
              stroke,
              strokeWidth: 2,
              filter: "none",
              strokeDasharray: undefined,
            },
          };
        }
        if (isDirect) {
          return {
            ...e,
            animated: true,
            style: {
              ...e.style,
              stroke,
              strokeWidth: 3,
              filter:
                "drop-shadow(0 0 6px rgba(100,116,139,0.55)) drop-shadow(0 0 2px rgba(100,116,139,0.8))",
              strokeDasharray: undefined,
            },
          };
        }
        // second-level
        return {
          ...e,
          animated: true,
          style: {
            ...e.style,
            stroke,
            strokeWidth: 2.5,
            filter: "drop-shadow(0 0 4px rgba(100,116,139,0.4))",
            strokeDasharray: "6 4",
          },
        };
      });
    });
  }, [selectedNode, setEdges]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!canvas) return;

      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const type = event.dataTransfer.getData("application/reactflow") as
        | "entry"
        | "branch"
        | "context";

      if (!type) return;

      // Check if trying to add second entry node
      if (
        type === "entry" &&
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
      const position = { x: projected.x - 100, y: projected.y - 60 };

      const newNode: NodeData = {
        _id: `node_${Date.now()}`,
        primary: type === "entry",
        type,
        chatMessages: [],
        runningSummary: "",
        contextContract:
          type === "context" ? "Add context information here..." : "",
        model: "gpt-4",
        // Lineage metadata for non-primary nodes
        parentNodeId:
          type === "entry" ? undefined : selectedNode || canvas.primaryNodeId,
        forkedFromMessageId:
          type === "entry"
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
        ...(type === "entry" && { primaryNodeId: newNode._id }),
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
      const flowNode: Node = {
        id: newNode._id,
        type: newNode.type,
        position,
        data: {
          label:
            type === "entry"
              ? "Entry Point"
              : type === "branch"
              ? "Branch Point"
              : "Context Data",
          messageCount: 0,
          isSelected: false,
          onClick: () =>
            onNodeSelect(
              newNode._id,
              type === "entry"
                ? "Entry Point"
                : type === "branch"
                ? "Branch Point"
                : "Context Data"
            ),
        },
      };

      setNodes((nds) => [...nds, flowNode]);
    },
    [canvas, setNodes, onNodeSelect, canvasId, reactFlowInstance]
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
          ? {
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

  const handleNodeSettingsClick = (nodeId: string) => {
    setEditingNodeId(nodeId);
    const node = nodes.find((n) => n.id === nodeId);
    setNodeNameInput((node as any)?.data?.label || "");
    setNodeColorInput(String(node?.style?.background || "#A3A3A3"));
  };

  // Auto-layout function to organize nodes
  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0) return;

    // Find entry nodes (nodes with no incoming edges)
    const entryNodes = nodes.filter(
      (node) => !edges.some((edge) => edge.target === node.id)
    );

    // Create a simple hierarchical layout
    const layoutedNodes = [...nodes];
    const visited = new Set<string>();
    const levels: string[][] = [];

    // BFS to organize nodes by levels
    const queue: { nodeId: string; level: number }[] = [];

    // Start with entry nodes at level 0
    entryNodes.forEach((node) => {
      queue.push({ nodeId: node.id, level: 0 });
    });

    while (queue.length > 0) {
      const { nodeId, level } = queue.shift()!;

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      if (!levels[level]) levels[level] = [];
      levels[level].push(nodeId);

      // Add connected nodes to next level
      const connectedEdges = edges.filter((edge) => edge.source === nodeId);
      connectedEdges.forEach((edge) => {
        if (!visited.has(edge.target)) {
          queue.push({ nodeId: edge.target, level: level + 1 });
        }
      });
    }

    // Position nodes based on levels
    const nodeSpacing = { x: 300, y: 150 };
    const startPosition = { x: 100, y: 100 };

    levels.forEach((levelNodes, levelIndex) => {
      levelNodes.forEach((nodeId, nodeIndex) => {
        const nodeIndex_in_layoutedNodes = layoutedNodes.findIndex(
          (n) => n.id === nodeId
        );
        if (nodeIndex_in_layoutedNodes !== -1) {
          const totalNodesInLevel = levelNodes.length;
          const centerOffset = ((totalNodesInLevel - 1) * nodeSpacing.y) / 2;

          layoutedNodes[nodeIndex_in_layoutedNodes] = {
            ...layoutedNodes[nodeIndex_in_layoutedNodes],
            position: {
              x: startPosition.x + levelIndex * nodeSpacing.x,
              y: startPosition.y + nodeIndex * nodeSpacing.y - centerOffset,
            },
          };
        }
      });
    });

    setNodes(layoutedNodes);

    // Save to storage
    if (canvas) {
      const updatedCanvas = {
        ...canvas,
        nodes: layoutedNodes.map((node) => ({
          id: node.id,
          type: node.type as any,
          position: node.position,
          data: node.data,
        })),
      };
      storageService.updateCanvas(canvas._id, updatedCanvas);
    }
  }, [nodes, edges, canvas, setNodes]);

  return (
    <div
      className="w-full h-full bg-slate-50"
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={currentNodeTypes}
        fitView
        className="bg-white"
        onNodeMouseEnter={(_, node) => setHoveredNodeId(node.id)}
        onNodeMouseLeave={(_, node) => setHoveredNodeId(null)}
        connectionLineStyle={{
          stroke: "#475569",
          strokeWidth: 3,
        }}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: {
            stroke: "#475569",
            strokeWidth: 3,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#475569",
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
        {/* Node settings button on hover */}
        {hoveredNodeId && (
          <button
            className="absolute z-50 bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-xl p-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-white"
            style={{ left: 40, top: 40 }}
            onClick={() => {
              setEditingNodeId(hoveredNodeId);
              const node = nodes.find((n) => n.id === hoveredNodeId);
              setNodeNameInput((node as any)?.data?.label || "");
              setNodeColorInput(String(node?.style?.background || "#6b7280"));
            }}
          >
            <Edit2 size={16} className="text-slate-600" />
          </button>
        )}

        {/* Improved Node Customization Modal */}
        {editingNodeId && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-2xl shadow-2xl p-6 z-50 min-w-[360px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">
                Customize Node
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingNodeId(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
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
                  className="w-full bg-white border-slate-200 focus:border-slate-400 focus:ring-slate-400/20 rounded-xl"
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
                    className="w-16 h-10 border border-slate-200 rounded-xl cursor-pointer"
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
                          className={`w-8 h-8 rounded-lg border-2 hover:scale-110 transition-transform ${
                            nodeColorInput === color
                              ? "border-slate-400"
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
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl"
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
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-2xl shadow-2xl p-6 z-50 min-w-[320px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">
                Rename Connection
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingEdgeId(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
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
                className="w-full bg-white border-slate-200 focus:border-slate-400 focus:ring-slate-400/20 rounded-xl"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => handleEdgeRename(editingEdgeId!)}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl"
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

      {/* Node Palette - Bottom Right */}
      <div className="absolute bottom-6 right-6 z-10">
        <NodePaletteEnhanced />
      </div>

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
