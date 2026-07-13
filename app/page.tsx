"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Plus, LayoutGrid, Network } from "lucide-react";
import { CanvasView } from "@/components/canvas/canvas";
import { ContextStrip } from "@/components/context-strip";
import { ContextualConsoleComponent } from "@/components/contextual-console";
import { CanvasList } from "@/components/canvas-list";
import { storageService, type CanvasData } from "@/lib/storage";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { BrandLoader } from "@/components/brand-loader";
import { Landing } from "@/components/landing";
import { generateCanvasTitle } from "@/lib/utils";
import type { AdvancedSettings } from "@/lib/advanced-settings";
import { GlobalSearch } from "@/components/global-search";
import { OnboardingGuide } from "@/components/onboarding-guide";
import { FilePreviewPanel } from "@/components/file-preview-panel";
import { CreateCanvasDialog } from "@/components/create-canvas-dialog";

const normalizeCanvas = (canvas: any): CanvasData => ({
  ...canvas,
  metaTags: Array.isArray(canvas?.metaTags) ? canvas.metaTags : [],
  nodes: Array.isArray(canvas?.nodes) ? canvas.nodes : [],
  edges: Array.isArray(canvas?.edges) ? canvas.edges : [],
});

const normalizeCanvases = (canvases: any): CanvasData[] =>
  Array.isArray(canvases) ? canvases.map(normalizeCanvas) : [];

// Per-canvas "View tree" overrides for linear-first mode, persisted for the
// session so a canvas the user force-exited stays in tree view on revisit.
const LINEAR_EXIT_STORAGE_KEY = "context-tree-linear-exited";

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
  const [treeViewOverrides, setTreeViewOverrides] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(window.sessionStorage.getItem(LINEAR_EXIT_STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  });

  const activeCanvas = canvases.find((c) => c._id === selectedCanvas);
  // Linear-first ("centered chat") mode retired 2026-07-13 (owner decision):
  // every canvas uses the tree + right-docked console, including a brand-new
  // canvas whose only node is the root. See
  // docs/superpowers/specs/2026-07-13-contexttree-fix-pass-design.md (D-3).
  const isLinear = false;

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
    let frame = 0;
    const onMove = (e: MouseEvent) => {
      if (chatFullscreen || isMobile) return;
      const delta = resizeStartX.current - e.clientX;
      const nextWidth = Math.min(1100, Math.max(420, resizeStartW.current + delta));
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setRightPanelWidth(nextWidth));
    };
    const onUp = () => setIsResizing(false);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
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
          setCanvases(normalizeCanvases(storageService.getAllCanvases()));
          setHasLoadedCanvases(true);
          return;
        }

        const data = await response.json();
        const normalizedCanvases = normalizeCanvases(data.canvases);
        setCanvases(normalizedCanvases);
        setHasLoadedCanvases(true);

        if (normalizedCanvases.length > 0 && !selectedCanvas) {
          setSelectedCanvas(normalizedCanvases[0]._id);
        }
      } catch {
        setCanvases(normalizeCanvases(storageService.getAllCanvases()));
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

  // Keep the canvases list in sync with forks and whole-canvas refreshes so
  // isLinear flips the moment a branch is created — no refetch needed.
  useEffect(() => {
    const onFork = (e: any) => {
      const { canvasId, node, edge } = e.detail || {};
      if (!canvasId || !node) return;
      setCanvases((prev) =>
        prev.map((c) => {
          if (c._id !== canvasId) return c;
          const hasNode = c.nodes.some((n) => n._id === node._id);
          const edges = Array.isArray(c.edges) ? c.edges : [];
          const hasEdge = edge ? edges.some((x) => x._id === edge._id) : true;
          if (hasNode && hasEdge) return c;
          return {
            ...c,
            nodes: hasNode ? c.nodes : [...c.nodes, node],
            edges: edge && !hasEdge ? [...edges, edge] : edges,
          };
        })
      );
    };
    const onDataUpdated = (e: any) => {
      const updated = e.detail;
      if (!updated?._id) return;
      setCanvases((prev) =>
        prev.map((c) => (c._id === updated._id ? normalizeCanvas(updated) : c))
      );
    };
    window.addEventListener("canvas-fork-node", onFork);
    window.addEventListener("canvas-data-updated", onDataUpdated);
    return () => {
      window.removeEventListener("canvas-fork-node", onFork);
      window.removeEventListener("canvas-data-updated", onDataUpdated);
    };
  }, []);

  // Linear mode: auto-select the entry node so the composer is immediately
  // usable — a brand-new canvas opens straight into a working chat.
  useEffect(() => {
    if (!isLinear || selectedNode || !activeCanvas) return;
    const entry =
      activeCanvas.nodes.find((n) => n._id === activeCanvas.primaryNodeId) ||
      activeCanvas.nodes.find((n) => n.type === "entry") ||
      activeCanvas.nodes[0];
    if (!entry) return;
    handleNodeSelect(
      entry._id,
      entry.name || (entry.type === "entry" ? "Base Context" : undefined),
      entry.type
    );
  }, [isLinear, selectedNode, activeCanvas]);

  // "View tree" — force-exit linear mode for this canvas (session-persisted).
  const exitLinearMode = () => {
    if (!selectedCanvas) return;
    setTreeViewOverrides((prev) => {
      const next = { ...prev, [selectedCanvas]: true };
      try {
        window.sessionStorage.setItem(LINEAR_EXIT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable — override still applies for this render */
      }
      return next;
    });
  };

  // ── Canvas CRUD ─────────────────────────────────────────────────────
  const openCreateCanvasDialog = (title = generateCanvasTitle()) => {
    setCreateCanvasTitle(title);
    setIsCreateCanvasDialogOpen(true);
  };

  const handleCreateCanvas = async ({
    title,
    model,
    systemPrompt,
    advancedSettings,
  }: {
    title: string;
    model: string;
    systemPrompt: string;
    advancedSettings: AdvancedSettings;
  }) => {
    if (!user?.email || isCreatingCanvas) return;
    setIsCreatingCanvas(true);

    const focusPrimaryNode = (canvas: CanvasData) => {
      const nodes = Array.isArray(canvas.nodes) ? canvas.nodes : [];
      const primaryNode =
        nodes.find((node) => node._id === canvas.primaryNodeId) ||
        nodes[0];

      setSelectedCanvas(canvas._id);
      setSelectedNode(primaryNode?._id ?? null);
      setSelectedNodeName(
        primaryNode?.name || (primaryNode?.type === "entry" ? "Base Context" : undefined)
      );
      setSelectedNodeType(primaryNode?.type);
      setChatFullscreen(false);
    };

    const newCanvas = storageService.createDefaultCanvas(
      user.email,
      title,
      model,
      systemPrompt,
      advancedSettings
    );
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
      focusPrimaryNode(canvas);
      setIsCreateCanvasDialogOpen(false);
    } catch {
      setCanvases((prev) =>
        prev.some((c) => c._id === newCanvas._id) ? prev : [newCanvas, ...prev]
      );
      focusPrimaryNode(newCanvas);
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

    // Select away from the canvas BEFORE deleting so CanvasView unmounts and
    // its pending saves can't fire mid-delete.
    if (selectedCanvas === canvasId) {
      const fallback = canvases.find((c) => c._id !== canvasId);
      setSelectedCanvas(fallback?._id ?? null);
      setSelectedNode(null);
      setSelectedNodeName(undefined);
    }

    // Drop the local cache up front: canvas save paths guard on this cache,
    // so removing it first guarantees deletion wins over any in-flight save.
    storageService.deleteCanvas(canvasId);

    const removeFromList = () =>
      setCanvases((prev) => prev.filter((c) => c._id !== canvasId));

    try {
      const res = await fetch(`/api/canvases/${canvasId}`, { method: "DELETE" });
      if (res.ok) {
        removeFromList();
      } else {
        toast.error("Couldn't delete canvas");
      }
    } catch {
      // Offline: remove locally, server copy is reconciled on next load.
      removeFromList();
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
      <motion.div
        className="h-screen flex items-center justify-center bg-background"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col items-center gap-4">
          <BrandLoader variant="draw" size={64} label="Loading ContextTree" />
          <p className="text-sm font-medium text-muted-foreground tracking-tight">
            Loading ContextTree...
          </p>
        </div>
      </motion.div>
    );
  }

  if (!isAuthenticated) return <Landing />;

  const showRightPanel = !!selectedNode;

  return (
    <motion.div
      className="flex flex-col h-screen w-full overflow-hidden bg-background font-sans"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <CreateCanvasDialog
        open={isCreateCanvasDialogOpen}
        onOpenChange={setIsCreateCanvasDialogOpen}
        onCreate={handleCreateCanvas}
        isCreating={isCreatingCanvas}
        initialTitle={createCanvasTitle}
      />

      <ContextStrip
        canvasName={activeCanvas?.title}
        onToggleSidebar={() => setLeftSidebarCollapsed((c) => !c)}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden relative pt-14">
        {/* Left sidebar — workspace list */}
        <motion.div
          className="flex flex-col border-r border-border bg-card z-30 overflow-hidden"
          animate={{
            width: leftSidebarCollapsed || chatFullscreen ? 0 : 240,
            opacity: leftSidebarCollapsed || chatFullscreen ? 0 : 1,
          }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
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
        </motion.div>

        {/* Canvas — primary surface (hidden entirely in linear-first mode) */}
        {!isLinear && (
        <motion.div
          className="flex-1 relative"
          data-tour="canvas-surface"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{
            opacity: chatFullscreen ? 0.1 : 1,
            scale: chatFullscreen ? 0.98 : 1,
            filter: chatFullscreen ? "blur(4px)" : "blur(0px)",
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{ pointerEvents: chatFullscreen ? "none" : "auto" }}
        >
          <AnimatePresence mode="wait">
            {selectedCanvas ? (
              <motion.div
                key={selectedCanvas}
                className="h-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CanvasView
                  canvasId={selectedCanvas}
                  selectedNode={selectedNode}
                  onNodeSelect={handleNodeSelect}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                className="relative flex items-center justify-center h-full overflow-hidden"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                {/* Ambient background */}
                <div className="absolute inset-0 bg-background">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_55%_at_50%_50%,#000_45%,transparent_100%)]" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] rounded-full bg-[radial-gradient(closest-side,rgba(99,102,241,0.08),transparent_70%)]" />
                </div>

                <div className="relative text-center space-y-6 max-w-sm px-6">
                  {/* Animated tree icon */}
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="mx-auto w-20 h-20 rounded-3xl bg-card border border-border flex items-center justify-center shadow-sm relative"
                  >
                    <svg width="40" height="40" viewBox="0 0 40 40" className="text-foreground">
                      <motion.line
                        x1="20" y1="8" x2="20" y2="20"
                        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: 0.35, duration: 0.4 }}
                      />
                      <motion.path
                        d="M 20 20 C 20 26, 10 26, 10 32"
                        stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: 0.55, duration: 0.5 }}
                      />
                      <motion.path
                        d="M 20 20 C 20 26, 30 26, 30 32"
                        stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: 0.55, duration: 0.5 }}
                      />
                      <motion.circle cx="20" cy="8" r="2.5" fill="currentColor"
                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.25 }} />
                      <motion.circle cx="10" cy="32" r="2.5" fill="#6366f1"
                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.95 }} />
                      <motion.circle cx="30" cy="32" r="2.5" fill="#a855f7"
                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.05 }} />
                    </svg>
                  </motion.div>

                  <motion.div
                    className="space-y-1.5"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <p className="text-foreground text-lg font-semibold tracking-tight">
                      Start a new canvas
                    </p>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      One prompt, many branches. Compare models side-by-side on an
                      infinite, auto-saving canvas.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => openCreateCanvasDialog(canvases.length === 0 ? "My First Project" : generateCanvasTitle())}
                      className="group inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:bg-primary/90 active:scale-[0.98]"
                    >
                      <Plus size={14} className="transition-transform group-hover:rotate-90" />
                      New Canvas
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSearchOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-all"
                    >
                      Search
                      <kbd className="inline-flex items-center rounded bg-accent border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                        ⌘K
                      </kbd>
                    </button>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        )}

        {/* Resize handle */}
        {!isLinear && showRightPanel && !chatFullscreen && (
          <div
            onMouseDown={beginResize}
            className="z-50 w-2 flex-shrink-0 cursor-col-resize bg-muted transition-colors hover:bg-accent"
            role="separator"
            aria-label="Resize conversation panel"
          />
        )}

        {/* Right panel — contextual console.
            In linear-first mode this same element (and the console inside it —
            same JSX slot, so the console never remounts and in-flight streams
            survive the transition) becomes THE main surface, centered like a
            plain chat app. */}
        <div
          data-tour="right-panel"
          className={
            isLinear
              ? "relative flex flex-1 min-w-0 flex-col bg-background"
              : `bg-card flex flex-col border-l border-border shadow-[-8px_0_24px_rgba(15,23,42,0.04)] ${
                  isResizing ? "" : "transition-[width,transform,opacity] duration-200 ease-out"
                } ${
                  showRightPanel
                    ? chatFullscreen
                      ? "fixed right-0 top-14 bottom-0 w-[90%] md:w-[85%] lg:w-[80%] shadow-2xl z-50 border-l-0"
                      : "relative"
                    : "w-0 overflow-hidden border-l-0"
                }`
          }
          style={
            !isLinear && showRightPanel && !chatFullscreen
              ? { width: rightPanelWidth, minWidth: 420, maxWidth: 1100 }
              : undefined
          }
        >
          {isLinear && activeCanvas ? (
            <div className="flex h-10 flex-none items-center justify-between border-b border-border bg-card px-4">
              <span className="type-ui truncate">{activeCanvas.title}</span>
              <button
                type="button"
                onClick={exitLinearMode}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 type-ui text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Show the canvas tree view"
              >
                <Network size={16} strokeWidth={1.75} />
                View tree
              </button>
            </div>
          ) : null}
          <div
            className={
              isLinear
                ? "container mx-auto w-full max-w-3xl flex-1 min-h-0"
                : "contents"
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
                  isFullscreen={isLinear ? false : chatFullscreen}
                  onToggleFullscreen={
                    isLinear ? undefined : () => setChatFullscreen((f) => !f)
                  }
                  onClose={
                    isLinear
                      ? undefined
                      : () => {
                          setSelectedNode(null);
                          setChatFullscreen(false);
                        }
                  }
                  onNodeSelect={(nodeId: string, nodeName?: string, nodeType?: string) => {
                    setSelectedNode(nodeId);
                    setSelectedNodeName(nodeName);
                    setSelectedNodeType(nodeType || "branch");
                  }}
                />
              ))}
          </div>
        </div>
      </div>

      <GlobalSearch
        canvases={canvases}
        onNavigate={handleSearchNavigate}
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
      />
      {selectedCanvas && !isCreateCanvasDialogOpen && !isLinear ? <OnboardingGuide /> : null}
    </motion.div>
  );
}
