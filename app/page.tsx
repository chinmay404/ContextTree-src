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
        const updatedCanvases = canvases.filter(
          (canvas) => canvas._id !== canvasId
        );
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
      const updatedCanvases = canvases.filter(
        (canvas) => canvas._id !== canvasId
      );
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

    const originalCanvas = canvases.find((canvas) => canvas._id === canvasId);
    if (!originalCanvas) return;

    const duplicatedCanvas = storageService.duplicateCanvas(
      originalCanvas,
      user.email
    );
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

    const updatedCanvases = canvases.map((canvas) =>
      canvas._id === canvasId
        ? {
            ...canvas,
            title: newTitle.trim(),
            updatedAt: new Date().toISOString(),
          }
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
        const updatedCanvas = updatedCanvases.find((c) => c._id === canvasId);
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
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 text-slate-900 transition-transform duration-300 hover:scale-110">
              <svg
                width="32"
                height="32"
                viewBox="0 0 100 100"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-sm"
              >
                {/* Root node (top) */}
                <rect
                  x="35"
                  y="10"
                  width="30"
                  height="20"
                  rx="4"
                  ry="4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />

                {/* Connection lines */}
                <path
                  d="M50 30 L50 45 M35 55 L50 45 L65 55"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Left child node */}
                <rect
                  x="15"
                  y="65"
                  width="25"
                  height="20"
                  rx="4"
                  ry="4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />

                {/* Right child node */}
                <rect
                  x="60"
                  y="65"
                  width="25"
                  height="20"
                  rx="4"
                  ry="4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-light text-slate-900 tracking-tight">
              ContextTree
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <UserAuth />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar - Canvas List (always visible with premium styling) */}
        <div className="w-80 transition-all duration-500 ease-out border-r border-slate-200/60 bg-gradient-to-b from-slate-50/30 to-white/50 backdrop-blur-sm flex flex-col shadow-sm overflow-hidden">
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
            onCollapse={() => setLeftSidebarCollapsed(true)}
          />
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
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50/30 to-white/50">
              <div className="text-center space-y-8 animate-in fade-in duration-500">
                <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                  <Plus className="w-10 h-10 text-slate-400" />
                </div>
                <div>
                  <p className="text-slate-900 text-xl font-light mb-4">
                    No canvas selected
                  </p>
                  <p className="text-slate-500 text-base mb-8 max-w-md mx-auto font-light leading-relaxed">
                    Create your first canvas to start building conversational
                    flows and organize your AI interactions
                  </p>
                  <Button
                    onClick={handleCreateCanvas}
                    className="gap-3 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white shadow-md px-6 py-3 rounded-xl font-light transition-all duration-300 hover:shadow-lg hover:scale-105"
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
