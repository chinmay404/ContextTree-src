"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { CanvasArea } from "@/components/canvas-area";
import { ReactFlowProvider } from "reactflow";
import { NodePalette } from "@/components/node-palette";
import { ChatPanel } from "@/components/chat-panel";
import { CanvasList } from "@/components/canvas-list";
import { storageService, type CanvasData } from "@/lib/storage";
import UserAuth from "@/components/user-auth";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { LandingPage } from "@/components/landing-page";

export default function ContextTreePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const isMobile = useIsMobile();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedNodeName, setSelectedNodeName] = useState<
    string | undefined
  >();
  const [canvases, setCanvases] = useState<CanvasData[]>([]);
  const [selectedCanvas, setSelectedCanvas] = useState<string | null>(null);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [chatFullscreen, setChatFullscreen] = useState(false);
  const [rightSidebarWidth, setRightSidebarWidth] = useState<number>(384); // default ~ w-96
  const [isResizingRight, setIsResizingRight] = useState(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(384);

  // Keyboard shortcut for left sidebar toggle (Ctrl/Cmd + Shift + L)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "l"
      ) {
        e.preventDefault();
        setLeftSidebarCollapsed((c) => !c);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Right sidebar resize listeners
  useEffect(() => {
    if (!isResizingRight) return;
    const handleMove = (e: MouseEvent) => {
      // Do not resize in fullscreen/mobile/collapsed
      if (chatFullscreen || rightSidebarCollapsed || isMobile) return;
      const delta = resizeStartXRef.current - e.clientX; // moving left increases width
      const newWidth = Math.min(
        900,
        Math.max(300, resizeStartWidthRef.current + delta)
      );
      setRightSidebarWidth(newWidth);
    };
    const stop = () => setIsResizingRight(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stop);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stop);
    };
  }, [isResizingRight, chatFullscreen, rightSidebarCollapsed, isMobile]);

  const beginRightResize = (e: React.MouseEvent) => {
    if (rightSidebarCollapsed || chatFullscreen || isMobile || !selectedNode)
      return;
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = rightSidebarWidth;
    setIsResizingRight(true);
    e.preventDefault();
  };

  useEffect(() => {
    const loadCanvases = async () => {
      if (!isAuthenticated || !user?.email) return;

      try {
        // Fetch user's canvases from API (with user isolation)
        const response = await fetch("/api/canvases");
        if (response.ok) {
          const data = await response.json();
          setCanvases(data.canvases || []);

          // Select first canvas if available
          if (data.canvases?.length > 0 && !selectedCanvas) {
            setSelectedCanvas(data.canvases[0]._id);
          }
        } else {
          console.error("Failed to fetch canvases");
          // Fallback to local storage for now
          const allCanvases = storageService.getAllCanvases();
          setCanvases(allCanvases);
        }
      } catch (error) {
        console.error("Error loading canvases:", error);
        // Fallback to local storage
        const allCanvases = storageService.getAllCanvases();
        setCanvases(allCanvases);
      }
    };

    if (isAuthenticated) {
      loadCanvases();
    }
  }, [isAuthenticated, user?.email]);

  const handleNodeSelect = (nodeId: string | null, nodeName?: string) => {
    setSelectedNode(nodeId);
    setSelectedNodeName(nodeName);
  };

  const handleCreateCanvas = async () => {
    if (!user?.email) return;

    const newCanvas = storageService.createDefaultCanvas(
      user.email,
      "New Canvas"
    );
    storageService.saveCanvas(newCanvas);

    // Persist to MongoDB and update statistics
    try {
      const response = await fetch("/api/canvases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCanvas),
      });

      if (response.ok) {
        const data = await response.json();
        setCanvases([...canvases, data.canvas]);
        setSelectedCanvas(newCanvas._id);
      } else {
        // Fallback to local state update
        setCanvases([...canvases, newCanvas]);
        setSelectedCanvas(newCanvas._id);
      }
    } catch (err) {
      console.error("Failed to save canvas to MongoDB", err);
    }
  };

  const handleSelectCanvas = (canvasId: string) => {
    setSelectedCanvas(canvasId);
    setSelectedNode(null);
    setSelectedNodeName(undefined);
  };

  const handleDeleteCanvas = async (canvasId: string) => {
    if (!user?.email) return;

    try {
      // Remove from server
      const response = await fetch(`/api/canvases/${canvasId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove from local storage
        storageService.deleteCanvas(canvasId);
        
        // Update local state
        const updatedCanvases = canvases.filter(canvas => canvas._id !== canvasId);
        setCanvases(updatedCanvases);
        
        // If we deleted the selected canvas, select another one or none
        if (selectedCanvas === canvasId) {
          const nextCanvas = updatedCanvases[0];
          setSelectedCanvas(nextCanvas ? nextCanvas._id : null);
          setSelectedNode(null);
          setSelectedNodeName(undefined);
        }
      }
    } catch (err) {
      console.error("Failed to delete canvas", err);
      // Fallback to local deletion
      storageService.deleteCanvas(canvasId);
      const updatedCanvases = canvases.filter(canvas => canvas._id !== canvasId);
      setCanvases(updatedCanvases);
      
      if (selectedCanvas === canvasId) {
        const nextCanvas = updatedCanvases[0];
        setSelectedCanvas(nextCanvas ? nextCanvas._id : null);
        setSelectedNode(null);
        setSelectedNodeName(undefined);
      }
    }
  };

  const handleDuplicateCanvas = async (canvasId: string) => {
    if (!user?.email) return;

    const originalCanvas = canvases.find(canvas => canvas._id === canvasId);
    if (!originalCanvas) return;

    const duplicatedCanvas = storageService.duplicateCanvas(originalCanvas, user.email);
    storageService.saveCanvas(duplicatedCanvas);

    try {
      const response = await fetch("/api/canvases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(duplicatedCanvas),
      });

      if (response.ok) {
        const data = await response.json();
        setCanvases([...canvases, data.canvas]);
      } else {
        setCanvases([...canvases, duplicatedCanvas]);
      }
    } catch (err) {
      console.error("Failed to save duplicated canvas", err);
      setCanvases([...canvases, duplicatedCanvas]);
    }
  };

  const handleRenameCanvas = async (canvasId: string, newTitle: string) => {
    if (!user?.email || !newTitle.trim()) return;

    const updatedCanvases = canvases.map(canvas => 
      canvas._id === canvasId 
        ? { ...canvas, title: newTitle.trim(), updatedAt: new Date().toISOString() }
        : canvas
    );
    
    setCanvases(updatedCanvases);

    try {
      const response = await fetch(`/api/canvases/${canvasId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });

      if (!response.ok) {
        // Revert on failure
        setCanvases(canvases);
      } else {
        // Update local storage
        const updatedCanvas = updatedCanvases.find(c => c._id === canvasId);
        if (updatedCanvas) {
          storageService.saveCanvas(updatedCanvas);
        }
      }
    } catch (err) {
      console.error("Failed to rename canvas", err);
      // Revert on failure
      setCanvases(canvases);
    }
  };

  // Show loading state while authentication is being checked
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" text="Loading ContextTree..." />
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-sm px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {leftSidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              ContextTree
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleCreateCanvas}
              className="gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
            >
              <Plus className="h-4 w-4" />
              New Canvas
            </Button>
            <UserAuth />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar - Canvas List (collapsible) */}
        <div
          className={`group transition-all duration-300 ease-in-out border-r border-slate-200/80 bg-white/95 backdrop-blur-sm flex flex-col shadow-sm overflow-hidden ${
            leftSidebarCollapsed ? "w-16" : "w-80"
          }`}
        >
          {leftSidebarCollapsed ? (
            // Collapsed mini sidebar
            <div className="flex-1 flex flex-col items-center py-4 px-2">
              <div className="flex flex-col items-center gap-3 mb-6">
                <button
                  onClick={() => setLeftSidebarCollapsed(false)}
                  className="w-8 h-8 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg flex items-center justify-center border border-slate-200/70 hover:from-slate-100 hover:to-slate-200 transition-colors"
                  title="Expand canvases panel (Ctrl+Shift+L)"
                >
                  <PanelLeftOpen className="w-4 h-4 text-slate-600" />
                </button>
                {canvases.length > 0 && (
                  <div className="text-[10px] font-medium text-slate-500 tracking-wide">
                    {canvases.length}
                  </div>
                )}
              </div>
              {/* New Canvas Shortcut */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCreateCanvas}
                className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 p-0 w-8 h-8 rounded-lg"
                title="Create canvas"
              >
                <Plus className="w-4 h-4" />
              </Button>
              {/* Selected indicator */}
              {selectedCanvas && (
                <div className="mt-4 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
              {/* Spacer */}
              <div className="mt-auto flex flex-col items-center gap-2 pb-2">
                <span className="text-[10px] text-slate-400 rotate-180 [writing-mode:vertical-rl] select-none">
                  CANVASES
                </span>
              </div>
            </div>
          ) : (
            // Expanded full sidebar
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-2 tracking-tight">
                    Your Canvases
                  </h2>
                  <p className="text-sm text-slate-500">
                    Manage and organize your conversation flows
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLeftSidebarCollapsed(true)}
                    className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                    title="Collapse (Ctrl+Shift+L)"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CanvasList
                canvases={canvases.map((canvas) => ({
                  _id: canvas._id,
                  title: canvas.title,
                  createdAt: canvas.createdAt,
                  nodeCount: canvas.nodes.length,
                  metaTags: canvas.metaTags,
                }))}
                selectedCanvas={selectedCanvas || undefined}
                onSelectCanvas={handleSelectCanvas}
                onCreateCanvas={handleCreateCanvas}
                onDeleteCanvas={handleDeleteCanvas}
                onDuplicateCanvas={handleDuplicateCanvas}
                onRenameCanvas={handleRenameCanvas}
              />
            </div>
          )}
        </div>

        {/* Center Canvas */}
        <div
          className={`flex-1 relative transition-all duration-300 ease-in-out ${
            chatFullscreen && selectedNode
              ? "opacity-0 pointer-events-none"
              : "opacity-100"
          }`}
        >
          {selectedCanvas ? (
            <ReactFlowProvider>
              <CanvasArea
                canvasId={selectedCanvas}
                selectedNode={selectedNode}
                onNodeSelect={handleNodeSelect}
              />
            </ReactFlowProvider>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
                  <Plus className="w-8 h-8 text-slate-400" />
                </div>
                <div>
                  <p className="text-slate-600 text-lg font-medium mb-3">
                    No canvas selected
                  </p>
                  <p className="text-slate-400 text-sm mb-6 max-w-md">
                    Create your first canvas to start building conversational
                    flows
                  </p>
                  <Button
                    onClick={handleCreateCanvas}
                    className="gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Create Your First Canvas
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Chat Panel (resizable) */}
        <div
          className={`${
            isResizingRight
              ? "transition-none"
              : "transition-all duration-300 ease-in-out"
          } ${
            selectedNode
              ? chatFullscreen || isMobile
                ? "fixed inset-0 z-50 bg-white"
                : rightSidebarCollapsed
                ? "border-l border-slate-200/80 bg-white/95 backdrop-blur-sm shadow-sm"
                : "relative border-l border-slate-200/80 bg-white/95 backdrop-blur-sm shadow-sm"
              : "overflow-hidden"
          }`}
          style={
            selectedNode
              ? chatFullscreen || isMobile
                ? undefined
                : rightSidebarCollapsed
                ? { width: "4rem" }
                : { width: rightSidebarWidth, minWidth: 300, maxWidth: 900 }
              : { width: 0 }
          }
        >
          {/* Drag handle (left edge) */}
          {!rightSidebarCollapsed &&
            !chatFullscreen &&
            selectedNode &&
            !isMobile && (
              <div
                onMouseDown={beginRightResize}
                className={`absolute left-0 top-0 h-full w-1 cursor-col-resize z-10 select-none group/resize ${
                  isResizingRight ? "bg-slate-300" : "hover:bg-slate-300"
                }`}
                title="Drag to resize"
              >
                <div className="w-px h-full bg-slate-200 group-hover/resize:bg-slate-400 transition-colors" />
              </div>
            )}
          <ChatPanel
            selectedNode={selectedNode}
            selectedNodeName={selectedNodeName}
            selectedCanvas={selectedCanvas}
            isFullscreen={chatFullscreen || isMobile}
            isCollapsed={rightSidebarCollapsed && !isMobile}
            onToggleFullscreen={() => setChatFullscreen(!chatFullscreen)}
            onToggleCollapse={() =>
              setRightSidebarCollapsed(!rightSidebarCollapsed)
            }
            onClose={() => {
              setSelectedNode(null);
              setSelectedNodeName(undefined);
              setChatFullscreen(false);
              setRightSidebarCollapsed(false);
            }}
          />
        </div>
      </div>
    </div>
  );
}
