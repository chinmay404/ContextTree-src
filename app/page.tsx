"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus, PanelLeftOpen, Search, Command, Focus } from "lucide-react";
import { CanvasArea } from "@/components/canvas-area";
import { ReactFlowProvider } from "reactflow";
import { ContextStrip } from "@/components/context-strip";
import { ContextualConsoleComponent } from "@/components/contextual-console";
import { CanvasList } from "@/components/canvas-list";
import { storageService, type CanvasData } from "@/lib/storage";
import UserAuth from "@/components/user-auth";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { LandingPage } from "@/components/landing-page";
import { generateCanvasTitle } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GlobalSearch } from "@/components/global-search";
import { OnboardingGuide } from "@/components/onboarding-guide";
import { FilePreviewPanel } from "@/components/file-preview-panel";

export default function ContextTreePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const isMobile = useIsMobile();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedNodeName, setSelectedNodeName] = useState<
    string | undefined
  >();
  const [selectedNodeType, setSelectedNodeType] = useState<string | undefined>();
  const [canvases, setCanvases] = useState<CanvasData[]>([]);
  const [selectedCanvas, setSelectedCanvas] = useState<string | null>(null);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false); // Open by default
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [chatFullscreen, setChatFullscreen] = useState(false);
  const [rightSidebarWidth, setRightSidebarWidth] = useState<number>(520); // Increased for better readability
  const [isResizingRight, setIsResizingRight] = useState(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(520);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const isCreatingDefaultCanvasRef = useRef(false);
  const [isCreatingCanvas, setIsCreatingCanvas] = useState(false);

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
            if (isCreatingDefaultCanvasRef.current) return;
            isCreatingDefaultCanvasRef.current = true;

            console.log("No canvases found, creating default canvas");
            // Create a default canvas for new users
            const newCanvas = storageService.createDefaultCanvas(
              user.email,
              "My First Project"
            );
            storageService.saveCanvas(newCanvas);

            // Try to persist to server
            try {
              const createResponse = await fetch("/api/canvases", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newCanvas),
              });

              if (createResponse.ok) {
                const createData = await createResponse.json();
                setCanvases([createData.canvas]);
                setSelectedCanvas(createData.canvas._id);
                
                // Auto-select the first node to open the right panel
                if (createData.canvas.nodes && createData.canvas.nodes.length > 0) {
                  setSelectedNode(createData.canvas.nodes[0]._id);
                  setSelectedNodeName(createData.canvas.nodes[0].name);
                  setRightSidebarCollapsed(false);
                }
              } else {
                // Fallback if server fails but local succeeded
                setCanvases([newCanvas]);
                setSelectedCanvas(newCanvas._id);
                
                // Auto-select the first node
                if (newCanvas.nodes && newCanvas.nodes.length > 0) {
                  setSelectedNode(newCanvas.nodes[0]._id);
                  setSelectedNodeName(newCanvas.nodes[0].name);
                  setRightSidebarCollapsed(false);
                }
              }
            } catch (err) {
              console.error("Failed to create default canvas on server", err);
              setCanvases([newCanvas]);
              setSelectedCanvas(newCanvas._id);
              
              // Auto-select the first node
              if (newCanvas.nodes && newCanvas.nodes.length > 0) {
                 setSelectedNode(newCanvas.nodes[0]._id);
                 setSelectedNodeName(newCanvas.nodes[0].name);
                 setRightSidebarCollapsed(false);
              }
            }
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

  const handleNodeSelect = (nodeId: string | null, nodeName?: string, nodeType?: string) => {
    console.log(`Selecting node: ${nodeId} (${nodeName}, type: ${nodeType})`);
    setSelectedNode(nodeId);
    setSelectedNodeName(nodeName);
    setSelectedNodeType(nodeType);

    // Ensure chat panel is visible when a node is selected
    if (nodeId) {
      setRightSidebarCollapsed(false);
      setChatFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = (e: any) => {
      const { nodeId, name } = e.detail || {};
      if (!nodeId || !name) return;
      if (nodeId === selectedNode) {
        setSelectedNodeName(name);
      }
    };
    window.addEventListener("canvas-node-renamed", handler as any);
    return () => window.removeEventListener("canvas-node-renamed", handler as any);
  }, [selectedNode]);

  const handleCreateCanvas = async () => {
    if (!user?.email || isCreatingCanvas) return;
    setIsCreatingCanvas(true);

    const newCanvas = storageService.createDefaultCanvas(
      user.email,
      generateCanvasTitle()
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
        setCanvases((prev) => {
           if (prev.some(c => c._id === data.canvas._id)) return prev;
           return [data.canvas, ...prev];
        });
        setSelectedCanvas(newCanvas._id);
      } else {
        // Fallback to local state update
        setCanvases((prev) => {
           if (prev.some(c => c._id === newCanvas._id)) return prev;
           return [newCanvas, ...prev];
        });
        setSelectedCanvas(newCanvas._id);
      }
    } catch (err) {
      console.error("Failed to save canvas to MongoDB", err);
      // Ensure UI is updated even on error if local storage succeeded
      setCanvases((prev) => {
          if (prev.some(c => c._id === newCanvas._id)) return prev;
          return [newCanvas, ...prev];
      });
      setSelectedCanvas(newCanvas._id);
    } finally {
        setIsCreatingCanvas(false);
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

  const activeCanvas = canvases.find((c) => c._id === selectedCanvas);
  const nodeCount = activeCanvas?.nodes?.length || 0;
  const branchCount = activeCanvas?.nodes?.filter((n: any) => n.type === "branch").length || 0;

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-50 font-sans">
      {/* 5. CONTEXT STRIP (TOP, MINIMAL) */}
      <ContextStrip 
        canvasName={activeCanvas?.title}
        isSynced={true}
        onToggleSidebar={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
      />

      <div className="flex flex-1 overflow-hidden relative pt-14">
          {/* 4. LEFT SIDEBAR — WORKSPACE SWITCHER (MINIMAL) */}
          <div className={`flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-in-out z-30 ${
              leftSidebarCollapsed || chatFullscreen ? "w-0 overflow-hidden opacity-0" : "w-60"
          }`}>
             <CanvasList 
                canvases={canvases.map((canvas) => ({
                    _id: canvas._id,
                    title: canvas.title,
                    createdAt: canvas.createdAt,
                    updatedAt: canvas.updatedAt,
                    nodeCount: canvas.nodes.length,
                    branchCount: canvas.nodes.filter((n: any) => n.type === "branch").length,
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

          {/* 1. CANVAS (PRIMARY SURFACE) */}
          <div className={`flex-1 relative transition-all duration-500 ease-in-out ${
              chatFullscreen ? "opacity-10 pointer-events-none filter blur-[2px] scale-[0.98]" : "opacity-100"
          }`}>
              {selectedCanvas ? (
                <ReactFlowProvider>
                  <CanvasArea
                    canvasId={selectedCanvas}
                    selectedNode={selectedNode}
                    onNodeSelect={handleNodeSelect}
                  />
                </ReactFlowProvider>
              ) : (
                <div className="flex items-center justify-center h-full bg-slate-50">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                        <Plus size={24} />
                    </div>
                    <p className="text-slate-500">Select or create a canvas to start</p>
                  </div>
                </div>
              )}
          </div>

          {/* 2. RIGHT PANEL — CONTEXTUAL CONVERSATION CONSOLE (CORE) */}
          <div className={`bg-white shadow-2xl transition-all duration-300 ease-in-out flex flex-col z-40 border-l border-slate-200 ${
              selectedNode 
                  ? (chatFullscreen ? "fixed right-0 top-10 bottom-0 w-[90%] md:w-[85%] lg:w-[80%] shadow-none border-l-0 z-50" : "w-[480px] relative") 
                  : "w-0 overflow-hidden border-l-0"
          }`}>
              {selectedNode && (
                  selectedNodeType === "externalContext" ? (
                    <FilePreviewPanel
                      selectedNode={selectedNode}
                      selectedNodeName={selectedNodeName}
                      canvasId={selectedCanvas || ""}
                      onClose={() => {
                        setSelectedNode(null);
                        setChatFullscreen(false);
                      }}
                    />
                  ) : (
                  <ContextualConsoleComponent 
                       selectedNode={selectedNode}
                       selectedNodeName={selectedNodeName}
                       selectedCanvas={selectedCanvas}
                       isFullscreen={chatFullscreen}
                       isCollapsed={rightSidebarCollapsed} 
                       onToggleFullscreen={() => setChatFullscreen(!chatFullscreen)}
                       onClose={() => {
                           setSelectedNode(null);
                           setChatFullscreen(false);
                       }}
                       onNodeSelect={(nodeId: string, nodeName?: string) => {
                          // Pass through locally without type implies stay in console context
                          // If we wanted to switch type we'd need to fetch the node type here or make this callback support it
                          setSelectedNode(nodeId);
                          setSelectedNodeName(nodeName);
                        }}
                  />
                  )
              )}
          </div>
      </div>

      <GlobalSearch
        canvases={canvases}
        onNavigate={handleSearchNavigate}
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
      />
      <OnboardingGuide />
    </div>
  );
}
