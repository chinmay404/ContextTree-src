"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus, PanelLeftOpen, Search, Command, Settings } from "lucide-react";
import { CanvasArea } from "@/components/canvas-area";
import { ReactFlowProvider } from "reactflow";
import { ChatPanel } from "@/components/chat-panel";
import { CanvasList } from "@/components/canvas-list";
import { storageService, type CanvasData } from "@/lib/storage";
import UserAuth from "@/components/user-auth";
import { BugReportForm } from "@/components/bug-report-form";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { LandingPage } from "@/components/landing-page";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GlobalSearch } from "@/components/global-search";

export default function ContextTreePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const isMobile = useIsMobile();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedNodeName, setSelectedNodeName] = useState<
    string | undefined
  >();
  const [canvases, setCanvases] = useState<CanvasData[]>([]);
  const [selectedCanvas, setSelectedCanvas] = useState<string | null>(null);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(true); // Auto-collapsed by default
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [chatFullscreen, setChatFullscreen] = useState(false);
  const [rightSidebarWidth, setRightSidebarWidth] = useState<number>(520); // Increased for better readability
  const [isResizingRight, setIsResizingRight] = useState(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(520);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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

  // Keyboard shortcut for search (Ctrl/Cmd + K)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
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
        1100, // Increased max width for better content viewing
        Math.max(420, resizeStartWidthRef.current + delta) // Increased min width for readability
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
  }, [isAuthenticated, user?.email, canvasRefreshTrigger, selectedCanvas]);

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

  // Handle navigation from search results
  const handleSearchNavigate = (canvasId: string, nodeId: string) => {
    // Switch to the target canvas
    setSelectedCanvas(canvasId);

    // Select the target node after a short delay to ensure canvas is loaded
    setTimeout(() => {
      setSelectedNode(nodeId);
      // Find the node to get its name
      const canvas = canvases.find((c) => c._id === canvasId);
      const node = canvas?.nodes.find((n) => n.id === nodeId);
      if (node) {
        setSelectedNodeName(node.data.label);
      }
    }, 100);
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
      {/* Enhanced Header / Navbar - Hidden in fullscreen mode */}
      {!chatFullscreen && (
        <header className="sticky top-0 z-[100] px-4 pt-6 pb-4 pointer-events-none">
          <div className={`flex transition-all duration-300 ${
            selectedNode && !rightSidebarCollapsed && !isMobile
              ? "justify-start"
              : "justify-center"
          }`}>
            <div className={`pointer-events-auto flex items-center justify-between gap-4 rounded-full border border-white/60 bg-white/70 px-6 py-3 shadow-lg backdrop-blur-2xl supports-[backdrop-filter]:bg-white/60 dark:border-slate-700/60 dark:bg-slate-900/60 transition-all duration-300 ${
              selectedNode && !rightSidebarCollapsed && !isMobile
                ? "w-auto"
                : "w-full max-w-5xl"
            }`}>
            {/* Logo & Brand - Left aligned */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 cursor-pointer text-slate-900 transition-transform duration-300 hover:scale-110 hover:rotate-6">
                <svg
                  width="36"
                  height="36"
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
                <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
                  ContextTree
                </h1>
                <p className="-mt-0.5 text-[11px] text-slate-500">
                  Visual Context Builder
                </p>
              </div>
            </div>

            {/* Actions - Right aligned */}
            <div className="flex items-center gap-1 sm:gap-2">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsSearchOpen(true)}
                      className="flex items-center gap-2 rounded-full bg-transparent px-3 text-slate-600 transition-all hover:bg-white/70 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/60 dark:hover:text-white"
                    >
                      <Search size={16} />
                      <span className="hidden sm:inline text-xs font-medium">
                        Search
                      </span>
                      <div className="hidden lg:flex items-center gap-0.5 rounded-full border border-slate-200/70 bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-slate-300">
                        <Command size={10} />
                        <span>K</span>
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Quick search (⌘K)</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full text-slate-600 transition-all hover:bg-white/70 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/60 dark:hover:text-white"
                    >
                      <Settings size={18} />
                      <span className="sr-only">Settings</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Settings</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {isAuthenticated && <BugReportForm />}

              <UserAuth />
            </div>
          </div>
        </div>
      </header>
      )}

      {/* Main Content */}
      <div className={`relative flex flex-1 overflow-hidden transition-all duration-300 ${
        chatFullscreen 
          ? "mt-0" 
          : selectedNode && !rightSidebarCollapsed && !isMobile
          ? "-mt-[88px]"
          : "-mt-20"
      }`}>
        {/* Canvas Background Layer */}
        <div className={`absolute inset-0 z-[1] transition-all duration-300 ${
          selectedNode && !rightSidebarCollapsed && !chatFullscreen && !isMobile
            ? "right-0"
            : ""
        }`}
        style={
          selectedNode && !rightSidebarCollapsed && !chatFullscreen && !isMobile
            ? { right: rightSidebarWidth + 24 }
            : {}
        }>
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

        {/* Floating Panels Layer */}
        <div className={`relative z-[50] flex flex-1 gap-6 px-4 pointer-events-none transition-all duration-300 ${
          selectedNode && !rightSidebarCollapsed && !chatFullscreen && !isMobile
            ? "pt-28 pb-6"
            : "pt-24 pb-6"
        }`}>
          {/* Left Sidebar - Canvas List */}
          <div
            className={`pointer-events-auto relative flex flex-col overflow-hidden shadow-xl transition-all duration-300 ease-out backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 border border-white/60 bg-white/70 dark:border-slate-700/60 dark:bg-slate-900/55 ${
              leftSidebarCollapsed
                ? "w-16 rounded-3xl px-2 py-4"
                : "w-72 rounded-[32px] px-4 py-5"
            }`}
          >
          {leftSidebarCollapsed ? (
            <div className="h-full flex flex-col items-center justify-between py-2">
              <div className="flex flex-col items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLeftSidebarCollapsed(false)}
                  className="h-10 w-10 rounded-xl text-slate-600 transition-all hover:scale-105 hover:bg-white/90 hover:text-slate-900 hover:shadow-md dark:text-slate-300 dark:hover:bg-slate-800/80"
                  title="Expand sidebar"
                >
                  <PanelLeftOpen className="h-5 w-5" />
                </Button>
                <div className="h-px w-8 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCreateCanvas}
                  className="h-10 w-10 rounded-xl text-slate-600 transition-all hover:scale-105 hover:bg-emerald-50/90 hover:text-emerald-700 hover:shadow-md dark:text-slate-300 dark:hover:bg-emerald-900/30"
                  title="Create new canvas"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex flex-1 items-center justify-center py-8">
                <div className="relative flex items-center justify-center">
                  <span className="rotate-90 whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.3em] text-slate-400/80">
                    Canvases
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-xs font-bold text-slate-700 shadow-sm">
                  {canvases.length}
                </div>
                {selectedCanvas && (
                  <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                )}
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

        {/* Spacer to push right sidebar to the right */}
        <div className="flex-1 pointer-events-none" />

        {/* Right Sidebar - Chat Panel (resizable) */}
        <div
          className={`pointer-events-auto ${
            isResizingRight
              ? "transition-none"
              : "transition-all duration-300 ease-in-out"
          } ${
            selectedNode
              ? chatFullscreen || isMobile
                ? "fixed inset-0 z-50 bg-white"
                : rightSidebarCollapsed
                ? "rounded-[32px] border border-white/60 bg-white/90 backdrop-blur-2xl shadow-xl supports-[backdrop-filter]:bg-white/85 dark:border-slate-700/60 dark:bg-slate-900/90"
                : "fixed top-0 right-0 h-screen border-l border-white/60 bg-white shadow-2xl z-[60]"
              : "overflow-hidden"
          }`}
          style={
            selectedNode
              ? chatFullscreen || isMobile
                ? undefined
                : rightSidebarCollapsed
                ? { width: "4rem" }
                : { width: rightSidebarWidth, minWidth: 420, maxWidth: 1100 }
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

      {/* Global Search Dialog */}
      <GlobalSearch
        canvases={canvases}
        onNavigate={handleSearchNavigate}
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
      />
    </div>
  );
}
