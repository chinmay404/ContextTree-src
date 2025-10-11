"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Maximize2,
  Minimize2,
  Search,
  Zap,
  GitBranch,
  FileText,
  Command,
  Settings,
  Sparkles,
} from "lucide-react";
import { CanvasArea } from "@/components/canvas-area";
import { ReactFlowProvider } from "reactflow";
import { NodePalette } from "@/components/node-palette";
import { ChatPanel } from "@/components/chat-panel";
import { CanvasList } from "@/components/canvas-list";
import { storageService, type CanvasData } from "@/lib/storage";
import UserAuth from "@/components/user-auth";
import { BugReportForm } from "@/components/bug-report-form";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { LandingPage } from "@/components/landing-page";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

  // Add a state to force refresh canvases
  const [canvasRefreshTrigger, setCanvasRefreshTrigger] = useState(0);

  useEffect(() => {
    const loadCanvases = async () => {
      if (!isAuthenticated || !user?.email) {
        console.log("Not authenticated or no user email, skipping canvas load");
        return;
      }

      console.log("Loading canvases for user:", user.email);

      try {
        // Fetch user's canvases from API (with user isolation)
        const response = await fetch("/api/canvases", {
          // Add cache busting to ensure fresh data
          cache: "no-cache",
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log("Fetched canvases from API:", data.canvases?.length || 0);

          setCanvases(data.canvases || []);

          // Select first canvas if available and no canvas is currently selected
          if (data.canvases?.length > 0 && !selectedCanvas) {
            console.log("Auto-selecting first canvas:", data.canvases[0]._id);
            setSelectedCanvas(data.canvases[0]._id);
          } else if (data.canvases?.length === 0) {
            console.log("No canvases found, clearing selection");
            setSelectedCanvas(null);
          }
        } else {
          console.error("Failed to fetch canvases, status:", response.status);

          // Check if it's an authentication error
          if (response.status === 401) {
            console.log("Authentication error, clearing canvases");
            setCanvases([]);
            setSelectedCanvas(null);
            return;
          }

          // Fallback to local storage for other errors
          const allCanvases = storageService.getAllCanvases();
          console.log("Fallback to local storage, found:", allCanvases.length);
          setCanvases(allCanvases);
        }
      } catch (error) {
        console.error("Error loading canvases:", error);
        // Fallback to local storage
        const allCanvases = storageService.getAllCanvases();
        console.log(
          "Error fallback to local storage, found:",
          allCanvases.length
        );
        setCanvases(allCanvases);
      }
    };

    if (isAuthenticated && user?.email) {
      loadCanvases();
    } else if (!isAuthenticated) {
      // Clear canvases when not authenticated
      console.log("User not authenticated, clearing canvases");
      setCanvases([]);
      setSelectedCanvas(null);
    }
  }, [isAuthenticated, user?.email, canvasRefreshTrigger]);

  // Trigger canvas refresh when user authentication status changes
  useEffect(() => {
    if (isAuthenticated && user?.email) {
      // Small delay to ensure authentication is fully established
      const timer = setTimeout(() => {
        setCanvasRefreshTrigger((prev) => prev + 1);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user?.email]);

  // Check user limits
  useEffect(() => {
    if (!isAuthenticated || !user?.email) return;

    const checkUserLimit = async () => {
      try {
        const response = await fetch("/api/user-limit/check");
        if (response.ok) {
          const data = await response.json();
          if (!data.canAccess) {
            // Redirect to user limit page
            window.location.href = `/user-limit-reached?message=${encodeURIComponent(
              data.message || ""
            )}`;
          }
        }
      } catch (error) {
        console.error("Error checking user limit:", error);
        // Continue silently on error
      }
    };

    checkUserLimit();

    // Check user limits periodically (every 5 minutes)
    const interval = setInterval(checkUserLimit, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user?.email]);

  const handleNodeSelect = (nodeId: string | null, nodeName?: string) => {
    console.log(`Selecting node: ${nodeId} (${nodeName})`);
    setSelectedNode(nodeId);
    setSelectedNodeName(nodeName);

    // Ensure chat panel is visible when a node is selected
    if (nodeId) {
      setRightSidebarCollapsed(false);
      setChatFullscreen(false);
    }
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
      {/* Enhanced Header / Navbar */}
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left Section - Logo & Brand */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 text-slate-900 transition-transform duration-300 hover:scale-110 hover:rotate-6 cursor-pointer">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 100 100"
                    xmlns="http://www.w3.org/2000/svg"
                    className="drop-shadow-sm"
                  >
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
                    <path
                      d="M50 30 L50 45 M35 55 L50 45 L65 55"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
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
                <div>
                  <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                    ContextTree
                  </h1>
                  <p className="text-xs text-slate-500 -mt-0.5">
                    Visual Context Builder
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l border-slate-200">
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className="bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 font-medium cursor-help transition-all"
                      >
                        <FileText size={12} className="mr-1.5" />
                        {canvases.length} {canvases.length === 1 ? "Canvas" : "Canvases"}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Total canvases in workspace</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 font-medium cursor-help transition-all"
                      >
                        <GitBranch size={12} className="mr-1.5" />
                        {selectedCanvas
                          ? canvases.find((c) => c._id === selectedCanvas)
                              ?.nodes.length || 0
                          : 0}{" "}
                        Nodes
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Nodes in current canvas</p>
                    </TooltipContent>
                  </Tooltip>

                  {selectedCanvas && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="secondary"
                          className="bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 px-2.5 py-1 font-medium cursor-help transition-all"
                        >
                          <Sparkles size={12} className="mr-1.5" />
                          Active
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Currently editing canvas</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </TooltipProvider>
              </div>
            </div>

            {/* Right Section - Actions & User */}
            <div className="flex items-center gap-3">
              {/* Search Button */}
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hidden md:flex gap-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
                    >
                      <Search size={16} />
                      <span className="text-xs">Search</span>
                      <div className="hidden lg:flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                        <Command size={10} />
                        <span className="text-[10px] font-semibold">K</span>
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Quick search (⌘K)</p>
                  </TooltipContent>
                </Tooltip>

                {/* Quick Actions Separator */}
                <div className="hidden md:block h-5 w-px bg-slate-200" />

                {/* LLM Status Indicator */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hidden md:flex gap-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all relative"
                    >
                      <Zap size={16} />
                      <span className="text-xs font-medium">10+ Models</span>
                      <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm animate-pulse" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Open-source models ready via Groq</p>
                  </TooltipContent>
                </Tooltip>

                {/* Settings */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all w-9 h-9"
                    >
                      <Settings size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Settings</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Divider */}
              <div className="h-8 w-px bg-slate-200" />

              {/* Bug Report */}
              {isAuthenticated && <BugReportForm />}

              {/* User Auth */}
              <UserAuth />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar - Canvas List */}
        <div
          className={`relative transition-all duration-500 ease-out border-r border-slate-200/60 bg-gradient-to-b from-slate-50/30 to-white/50 backdrop-blur-sm flex flex-col shadow-sm overflow-hidden ${
            leftSidebarCollapsed ? "w-16" : "w-80"
          }`}
        >
          {leftSidebarCollapsed ? (
            <div className="h-full flex flex-col items-center justify-between py-6">
              <div className="flex flex-col items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLeftSidebarCollapsed(false)}
                  className="text-slate-500 hover:text-slate-700 hover:bg-white/80 rounded-lg"
                  title="Expand sidebar"
                >
                  <PanelLeftOpen className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCreateCanvas}
                  className="text-slate-500 hover:text-slate-700 hover:bg-white/80 rounded-lg"
                  title="Create new canvas"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex-1 flex items-center">
                <span className="text-[10px] font-medium tracking-[0.4em] uppercase text-slate-400 rotate-90">
                  Canvases
                </span>
              </div>
              <div className="flex flex-col items-center gap-2 text-[10px] text-slate-400 font-light">
                <span>{canvases.length} total</span>
                {selectedCanvas && <span>Active</span>}
              </div>
            </div>
          ) : (
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
                    Select a canvas from the list to start working with your
                    conversational flows
                  </p>
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
              : { width: 0, pointerEvents: "none" }
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
            onNodeSelect={(nodeId: string, nodeName?: string) => {
              setSelectedNode(nodeId);
              setSelectedNodeName(nodeName);
              // Collapse chat to show the canvas when switching nodes
              if (chatFullscreen) setChatFullscreen(false);
            }}
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
