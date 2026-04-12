"use client";

import { useState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { CanvasArea } from "@/components/canvas-area";
import { ReactFlowProvider } from "@xyflow/react";
import { ContextStrip } from "@/components/context-strip";
import { ContextualConsoleComponent } from "@/components/contextual-console";
import { CanvasList } from "@/components/canvas-list";
import { storageService, type CanvasData } from "@/lib/storage";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { LandingPage } from "@/components/landing-page";
import { generateCanvasTitle } from "@/lib/utils";
import { GlobalSearch } from "@/components/global-search";
import { OnboardingGuide } from "@/components/onboarding-guide";
import { FilePreviewPanel } from "@/components/file-preview-panel";
import { CreateCanvasDialog } from "@/components/create-canvas-dialog";

export default function ContextTreePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const isMobile = useIsMobile();

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedNodeName, setSelectedNodeName] = useState<string>();
  const [selectedNodeType, setSelectedNodeType] = useState<string>();
  const [canvases, setCanvases] = useState<CanvasData[]>([]);
  const [selectedCanvas, setSelectedCanvas] = useState<string | null>(null);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [chatFullscreen, setChatFullscreen] = useState(false);
  const [rightPanelWidth, setRightPanelWidth] = useState(520);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartW = useRef(520);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreatingCanvas, setIsCreatingCanvas] = useState(false);
  const [canvasRefreshTrigger, setCanvasRefreshTrigger] = useState(0);
  const [isCreateCanvasDialogOpen, setIsCreateCanvasDialogOpen] = useState(false);
  const [createCanvasTitle, setCreateCanvasTitle] = useState(generateCanvasTitle());
  const [hasLoadedCanvases, setHasLoadedCanvases] = useState(false);
  const hasPromptedEmptyCanvasRef = useRef(false);

  // ── Keyboard shortcuts ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        setLeftSidebarCollapsed((c) => !c);
      }
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Right panel resize ──────────────────────────────────────────────
  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      if (chatFullscreen || isMobile) return;
      const delta = resizeStartX.current - e.clientX;
      setRightPanelWidth(Math.min(1100, Math.max(420, resizeStartW.current + delta)));
    };
    const onUp = () => setIsResizing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isResizing, chatFullscreen, isMobile]);

  const beginResize = (e: React.MouseEvent) => {
    if (chatFullscreen || isMobile || !selectedNode) return;
    resizeStartX.current = e.clientX;
    resizeStartW.current = rightPanelWidth;
    setIsResizing(true);
    e.preventDefault();
  };

  // ── Load canvases ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user?.email) {
      if (!isAuthenticated) {
        setCanvases([]);
        setSelectedCanvas(null);
        setHasLoadedCanvases(false);
      }
      return;
    }

    const loadCanvases = async () => {
      try {
        const response = await fetch("/api/canvases", {
          cache: "no-cache",
          headers: { "Cache-Control": "no-cache" },
        });

        if (!response.ok) {
          if (response.status === 401) {
            setCanvases([]);
            setSelectedCanvas(null);
            setHasLoadedCanvases(true);
            return;
          }
          setCanvases(storageService.getAllCanvases());
          setHasLoadedCanvases(true);
          return;
        }

        const data = await response.json();
        setCanvases(data.canvases || []);
        setHasLoadedCanvases(true);

        if (data.canvases?.length > 0 && !selectedCanvas) {
          setSelectedCanvas(data.canvases[0]._id);
        }
      } catch {
        setCanvases(storageService.getAllCanvases());
        setHasLoadedCanvases(true);
      }
    };

    loadCanvases();
  }, [isAuthenticated, user?.email, canvasRefreshTrigger, selectedCanvas]);

  // Refresh canvases when auth changes
  useEffect(() => {
    if (!isAuthenticated || !user?.email) return;
    const t = setTimeout(() => setCanvasRefreshTrigger((p) => p + 1), 100);
    return () => clearTimeout(t);
  }, [isAuthenticated, user?.email]);

  useEffect(() => {
    if (!isAuthenticated || !user?.email || !hasLoadedCanvases) {
      hasPromptedEmptyCanvasRef.current = false;
      return;
    }

    if (canvases.length > 0) {
      hasPromptedEmptyCanvasRef.current = false;
      return;
    }

    if (!selectedCanvas && !hasPromptedEmptyCanvasRef.current) {
      hasPromptedEmptyCanvasRef.current = true;
      setCreateCanvasTitle("My First Project");
      setIsCreateCanvasDialogOpen(true);
    }
  }, [canvases.length, hasLoadedCanvases, isAuthenticated, selectedCanvas, user?.email]);

  // Check user limits
  useEffect(() => {
    if (!isAuthenticated || !user?.email) return;

    const checkLimit = async () => {
      try {
        const res = await fetch("/api/user-limit/check");
        if (res.ok) {
          const data = await res.json();
          if (!data.canAccess) {
            window.location.href = `/user-limit-reached?message=${encodeURIComponent(data.message || "")}`;
          }
        }
      } catch { /* continue silently */ }
    };

    checkLimit();
    const interval = setInterval(checkLimit, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user?.email]);

  // ── Node selection ──────────────────────────────────────────────────
  const handleNodeSelect = (nodeId: string | null, nodeName?: string, nodeType?: string) => {
    setSelectedNode(nodeId);
    setSelectedNodeName(nodeName);
    setSelectedNodeType(nodeType);
    if (nodeId) setChatFullscreen(false);
  };

  // Listen for node renames from canvas
  useEffect(() => {
    const handler = (e: any) => {
      const { nodeId, name } = e.detail || {};
      if (nodeId && name && nodeId === selectedNode) {
        setSelectedNodeName(name);
      }
    };
    window.addEventListener("canvas-node-renamed", handler);
    return () => window.removeEventListener("canvas-node-renamed", handler);
  }, [selectedNode]);

  // ── Canvas CRUD ─────────────────────────────────────────────────────
  const openCreateCanvasDialog = (title = generateCanvasTitle()) => {
    setCreateCanvasTitle(title);
    setIsCreateCanvasDialogOpen(true);
  };

  const handleCreateCanvas = async ({
    title,
    model,
  }: {
    title: string;
    model: string;
  }) => {
    if (!user?.email || isCreatingCanvas) return;
    setIsCreatingCanvas(true);

    const newCanvas = storageService.createDefaultCanvas(user.email, title, model);
    storageService.saveCanvas(newCanvas);

    try {
      const res = await fetch("/api/canvases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCanvas),
      });

      const canvas = res.ok ? (await res.json()).canvas : newCanvas;
      setCanvases((prev) =>
        prev.some((c) => c._id === canvas._id) ? prev : [canvas, ...prev]
      );
      setSelectedCanvas(canvas._id);
      setIsCreateCanvasDialogOpen(false);
    } catch {
      setCanvases((prev) =>
        prev.some((c) => c._id === newCanvas._id) ? prev : [newCanvas, ...prev]
      );
      setSelectedCanvas(newCanvas._id);
      setIsCreateCanvasDialogOpen(false);
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

    const remove = () => {
      storageService.deleteCanvas(canvasId);
      const updated = canvases.filter((c) => c._id !== canvasId);
      setCanvases(updated);
      if (selectedCanvas === canvasId) {
        setSelectedCanvas(updated[0]?._id ?? null);
        setSelectedNode(null);
        setSelectedNodeName(undefined);
      }
    };

    try {
      const res = await fetch(`/api/canvases/${canvasId}`, { method: "DELETE" });
      if (res.ok) remove();
    } catch {
      remove();
    }
  };

  const handleDuplicateCanvas = async (canvasId: string) => {
    if (!user?.email) return;
    const original = canvases.find((c) => c._id === canvasId);
    if (!original) return;

    const dup = storageService.duplicateCanvas(original, user.email);
    storageService.saveCanvas(dup);

    try {
      const res = await fetch("/api/canvases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dup),
      });
      const canvas = res.ok ? (await res.json()).canvas : dup;
      setCanvases((prev) => [...prev, canvas]);
    } catch {
      setCanvases((prev) => [...prev, dup]);
    }
  };

  const handleRenameCanvas = async (canvasId: string, newTitle: string) => {
    if (!user?.email || !newTitle.trim()) return;
    const title = newTitle.trim();

    const updated = canvases.map((c) =>
      c._id === canvasId ? { ...c, title, updatedAt: new Date().toISOString() } : c
    );
    setCanvases(updated);

    try {
      const res = await fetch(`/api/canvases/${canvasId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        const updatedCanvas = updated.find((c) => c._id === canvasId);
        if (updatedCanvas) storageService.saveCanvas(updatedCanvas);
      } else {
        setCanvases(canvases);
      }
    } catch {
      setCanvases(canvases);
    }
  };

  const handleSearchNavigate = (canvasId: string, nodeId: string) => {
    setSelectedCanvas(canvasId);
    setTimeout(() => {
      setSelectedNode(nodeId);
      const canvas = canvases.find((c) => c._id === canvasId);
      const node = canvas?.nodes.find((n) => n._id === nodeId);
      if (node) setSelectedNodeName(node.name || node.data?.label);
    }, 100);
  };

  // ── Loading / auth gates ────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" text="Loading ContextTree..." />
      </div>
    );
  }

  if (!isAuthenticated) return <LandingPage />;

  const activeCanvas = canvases.find((c) => c._id === selectedCanvas);
  const showRightPanel = !!selectedNode;

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-50 font-sans">
      <CreateCanvasDialog
        open={isCreateCanvasDialogOpen}
        onOpenChange={setIsCreateCanvasDialogOpen}
        onCreate={handleCreateCanvas}
        isCreating={isCreatingCanvas}
        initialTitle={createCanvasTitle}
      />

      <ContextStrip
        canvasName={activeCanvas?.title}
        isSynced={true}
        onToggleSidebar={() => setLeftSidebarCollapsed((c) => !c)}
      />

      <div className="flex flex-1 overflow-hidden relative pt-14">
        {/* Left sidebar — workspace list */}
        <div
          className={`flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-in-out z-30 ${
            leftSidebarCollapsed || chatFullscreen ? "w-0 overflow-hidden opacity-0" : "w-60"
          }`}
        >
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
            onCreateCanvas={() => openCreateCanvasDialog()}
            onDeleteCanvas={handleDeleteCanvas}
            onDuplicateCanvas={handleDuplicateCanvas}
            onRenameCanvas={handleRenameCanvas}
            onCollapse={() => setLeftSidebarCollapsed(true)}
          />
        </div>

        {/* Canvas — primary surface */}
        <div
          className={`flex-1 relative transition-all duration-300 ease-in-out ${
            chatFullscreen ? "opacity-10 pointer-events-none blur-sm scale-[0.98]" : "opacity-100"
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
            <div className="flex items-center justify-center h-full bg-slate-50">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                  <Plus size={24} />
                </div>
                <p className="text-slate-500 text-sm">Select or create a canvas to start</p>
                <button
                  type="button"
                  onClick={() => openCreateCanvasDialog(canvases.length === 0 ? "My First Project" : generateCanvasTitle())}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                >
                  <Plus size={14} />
                  Create Canvas
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Resize handle */}
        {showRightPanel && !chatFullscreen && (
          <div
            onMouseDown={beginResize}
            className="w-1 cursor-col-resize hover:bg-slate-300 active:bg-slate-400 transition-colors z-50 flex-shrink-0"
          />
        )}

        {/* Right panel — contextual console */}
        <div
          className={`bg-white transition-all duration-300 ease-in-out flex flex-col border-l border-slate-200 ${
            showRightPanel
              ? chatFullscreen
                ? "fixed right-0 top-14 bottom-0 w-[90%] md:w-[85%] lg:w-[80%] shadow-2xl z-50 border-l-0"
                : "relative"
              : "w-0 overflow-hidden border-l-0"
          }`}
          style={
            showRightPanel && !chatFullscreen
              ? { width: rightPanelWidth, minWidth: 420, maxWidth: 1100 }
              : undefined
          }
        >
          {selectedNode &&
            (selectedNodeType === "externalContext" ? (
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
                onToggleFullscreen={() => setChatFullscreen((f) => !f)}
                onClose={() => {
                  setSelectedNode(null);
                  setChatFullscreen(false);
                }}
                onNodeSelect={(nodeId: string, nodeName?: string) => {
                  setSelectedNode(nodeId);
                  setSelectedNodeName(nodeName);
                }}
              />
            ))}
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
