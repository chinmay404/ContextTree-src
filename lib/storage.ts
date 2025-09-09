"use client";

export interface CanvasData {
  _id: string;
  userId: string;
  title: string;
  createdAt: string;
  primaryNodeId: string;
  metaTags: string[];
  settings: {
    description: string;
    defaultModel: string;
  };
  nodes: NodeData[];
  edges: EdgeData[];
}

export interface NodeData {
  _id: string;
  name?: string; // Custom node name
  color?: string; // Node background color
  textColor?: string; // Text color for readability
  dotColor?: string; // Connection dot color
  primary: boolean;
  type: "entry" | "branch" | "context" | "llmCall" | "userMessage";
  chatMessages: ChatMessage[];
  runningSummary: string;
  contextContract: string;
  model: string;
  memory?: object;
  externalSource?: object;
  metaTags?: string[];
  nodeConnections?: string[];
  // New relationship / lineage metadata
  parentNodeId?: string; // The originating (parent) node when this node is forked
  forkedFromMessageId?: string; // The assistant message id that triggered this fork
  createdAt: string;
  // React Flow properties for positioning
  position?: { x: number; y: number };
  data?: any;
}

export interface EdgeData {
  _id: string;
  from: string;
  to: string;
  createdAt: string;
  meta: {
    condition?: string;
    [key: string]: any;
  };
}

export interface ChatMessage {
  id: string; // globally unique message id
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

class StorageService {
  private readonly CANVAS_KEY = "contexttree_canvases";
  private readonly CURRENT_CANVAS_KEY = "contexttree_current_canvas";

  // Canvas Management
  saveCanvas(canvas: CanvasData): void {
    const canvases = this.getAllCanvases();
    const existingIndex = canvases.findIndex((c) => c._id === canvas._id);

    if (existingIndex >= 0) {
      canvases[existingIndex] = canvas;
    } else {
      canvases.push(canvas);
    }

    localStorage.setItem(this.CANVAS_KEY, JSON.stringify(canvases));
  }

  getCanvas(canvasId: string): CanvasData | null {
    const canvases = this.getAllCanvases();
    return canvases.find((c) => c._id === canvasId) || null;
  }

  getAllCanvases(): CanvasData[] {
    const stored = localStorage.getItem(this.CANVAS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  deleteCanvas(canvasId: string): void {
    const canvases = this.getAllCanvases().filter((c) => c._id !== canvasId);
    localStorage.setItem(this.CANVAS_KEY, JSON.stringify(canvases));
  }

  // Node Management within Canvas
  updateNode(
    canvasId: string,
    nodeId: string,
    updates: Partial<NodeData>
  ): void {
    const canvas = this.getCanvas(canvasId);
    if (!canvas) return;

    const nodeIndex = canvas.nodes.findIndex((n) => n._id === nodeId);
    if (nodeIndex >= 0) {
      canvas.nodes[nodeIndex] = { ...canvas.nodes[nodeIndex], ...updates };
      this.saveCanvas(canvas);
    }
  }

  addNode(canvasId: string, node: NodeData): void {
    const canvas = this.getCanvas(canvasId);
    if (!canvas) return;

    canvas.nodes.push(node);
    this.saveCanvas(canvas);
  }

  removeNode(canvasId: string, nodeId: string): void {
    const canvas = this.getCanvas(canvasId);
    if (!canvas) return;

    canvas.nodes = canvas.nodes.filter((n) => n._id !== nodeId);
    canvas.edges = canvas.edges.filter(
      (e) => e.from !== nodeId && e.to !== nodeId
    );
    this.saveCanvas(canvas);
  }

  // Edge Management within Canvas
  addEdge(canvasId: string, edge: EdgeData): void {
    const canvas = this.getCanvas(canvasId);
    if (!canvas) return;

    canvas.edges.push(edge);
    this.saveCanvas(canvas);
  }

  removeEdge(canvasId: string, edgeId: string): void {
    const canvas = this.getCanvas(canvasId);
    if (!canvas) return;

    canvas.edges = canvas.edges.filter((e) => e._id !== edgeId);
    this.saveCanvas(canvas);
  }

  // Chat Messages
  saveNodeMessages(
    canvasId: string,
    nodeId: string,
    messages: ChatMessage[]
  ): void {
    this.updateNode(canvasId, nodeId, { chatMessages: messages });
  }

  getNodeMessages(canvasId: string, nodeId: string): ChatMessage[] {
    const canvas = this.getCanvas(canvasId);
    if (!canvas) return [];

    const node = canvas.nodes.find((n) => n._id === nodeId);
    return node?.chatMessages || [];
  }

  // Current Canvas State
  setCurrentCanvas(canvasId: string): void {
    localStorage.setItem(this.CURRENT_CANVAS_KEY, canvasId);
  }

  getCurrentCanvas(): string | null {
    return localStorage.getItem(this.CURRENT_CANVAS_KEY);
  }

  // Create default canvas structure
  createDefaultCanvas(userId: string, title = "New Canvas"): CanvasData {
    const canvasId = `canvas_${Date.now()}`;
    const entryNodeId = `node_${Date.now()}`;

    const entryNode: NodeData = {
      _id: entryNodeId,
      primary: true,
      type: "entry",
      chatMessages: [],
      runningSummary: "",
      contextContract: "",
      model: "gpt-4",
      parentNodeId: undefined,
      forkedFromMessageId: undefined,
      createdAt: new Date().toISOString(),
      position: { x: 250, y: 100 },
    };

    const canvas: CanvasData = {
      _id: canvasId,
      userId,
      title,
      createdAt: new Date().toISOString(),
      primaryNodeId: entryNodeId,
      metaTags: [],
      settings: {
        description: "",
        defaultModel: "gpt-4",
      },
      nodes: [entryNode],
      edges: [],
    };

    return canvas;
  }

  // Export/Import
  exportCanvas(canvasId: string): string {
    const canvas = this.getCanvas(canvasId);
    if (!canvas) return "";

    const exportData = {
      canvas,
      exportedAt: new Date().toISOString(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  importCanvas(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (data.canvas) {
        this.saveCanvas(data.canvas);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Import failed:", error);
      return false;
    }
  }

  duplicateCanvas(originalCanvas: CanvasData, userId: string): CanvasData {
    const duplicatedCanvas: CanvasData = {
      ...originalCanvas,
      _id: this.generateId(),
      userId,
      title: `${originalCanvas.title} (Copy)`,
      createdAt: new Date().toISOString(),
      primaryNodeId: this.generateId(), // Generate new primary node ID
      nodes: originalCanvas.nodes.map((node, index) => ({
        ...node,
        _id: index === 0 ? this.generateId() : this.generateId(), // New IDs for all nodes
        parentNodeId: undefined, // Clear parent relationships for the copy
        forkedFromMessageId: undefined,
        createdAt: new Date().toISOString(),
      })),
      edges: originalCanvas.edges.map(edge => ({
        ...edge,
        _id: this.generateId(),
        createdAt: new Date().toISOString(),
        // We'd need to map the old node IDs to new ones, but for simplicity, 
        // we'll clear edges and let user reconnect them
      }))
    };

    // Update the primary node ID to match the first node's new ID
    if (duplicatedCanvas.nodes.length > 0) {
      duplicatedCanvas.primaryNodeId = duplicatedCanvas.nodes[0]._id;
    }

    // Clear edges for now to avoid broken references
    duplicatedCanvas.edges = [];

    return duplicatedCanvas;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

export const storageService = new StorageService();
