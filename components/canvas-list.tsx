"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Copy,
  Edit2,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  LayoutGrid,
  GitBranch,
  CircleDot,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Canvas {
  _id: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
  nodeCount: number;
  branchCount?: number;
  metaTags: string[];
}

interface CanvasListProps {
  canvases: Canvas[];
  selectedCanvas?: string;
  onSelectCanvas: (canvasId: string) => void;
  onCreateCanvas: () => void;
  onDeleteCanvas?: (canvasId: string) => void;
  onDuplicateCanvas?: (canvasId: string) => void;
  onRenameCanvas?: (canvasId: string, newTitle: string) => void;
  onCollapse?: () => void;
}

export function CanvasList({
  canvases,
  selectedCanvas,
  onSelectCanvas,
  onCreateCanvas,
  onDeleteCanvas,
  onDuplicateCanvas,
  onRenameCanvas,
}: CanvasListProps) {
  const [deleteCanvasId, setDeleteCanvasId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Temporal grouping logic
  const groupedCanvases = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;

    let filtered = canvases;
    if (query) {
       filtered = canvases.filter((canvas) => {
          const titleMatch = canvas.title.toLowerCase().includes(query);
          return titleMatch;
        });
    }
    
    // Sort by most recent first
    filtered = [...filtered].sort((a, b) => {
      const aDate = new Date(a.updatedAt || a.createdAt).getTime();
      const bDate = new Date(b.updatedAt || b.createdAt).getTime();
      return bDate - aDate;
    });

    const groups = {
      today: [] as Canvas[],
      week: [] as Canvas[],
      older: [] as Canvas[],
    };

    filtered.forEach(canvas => {
      const date = new Date(canvas.updatedAt || canvas.createdAt).getTime();
      if (date >= todayStart) {
        groups.today.push(canvas);
      } else if (date >= weekStart) {
        groups.week.push(canvas);
      } else {
        groups.older.push(canvas);
      }
    });

    return groups;
  }, [canvases, searchQuery]);

  // Format relative time (e.g. "2h ago")
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const CanvasItem = ({ canvas, index = 0 }: { canvas: Canvas; index?: number }) => {
    const isActive = selectedCanvas === canvas._id;
    return (
      <motion.div
        role="button"
        tabIndex={0}
        onClick={() => onSelectCanvas(canvas._id)}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, delay: index * 0.03, ease: "easeOut" }}
        className="group relative flex w-full items-start gap-2 py-1.5 px-2.5 text-left transition-colors"
        style={{
          background: isActive ? "var(--at-paper)" : "transparent",
          border: isActive ? "1px solid var(--at-paper-edge)" : "1px solid transparent",
          borderRadius: "var(--at-radius-md)",
          boxShadow: isActive ? "var(--at-shadow-sm)" : "none",
        }}
        onMouseEnter={(e) => {
          if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "var(--at-paper)";
        }}
        onMouseLeave={(e) => {
          if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "transparent";
        }}
      >
        {/* Active ribbon */}
        {isActive && (
          <motion.div
            layoutId="canvas-active-indicator"
            className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r"
            style={{ background: "var(--at-moss)" }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
          />
        )}

        <div className="min-w-0 flex-1 pl-1">
          <div className="flex items-center justify-between gap-1">
            <p
              className="truncate"
              style={{
                fontFamily: isActive ? "var(--at-font-serif)" : "var(--at-font-sans)",
                fontWeight: isActive ? 500 : 500,
                fontSize: isActive ? 14 : 13,
                color: isActive ? "var(--at-ink)" : "var(--at-ink-soft)",
                letterSpacing: isActive ? "-0.005em" : "0",
              }}
            >
              {canvas.title}
            </p>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  className={cn(
                    "ml-1 h-5 w-5 shrink-0 items-center justify-center rounded",
                    "opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity",
                    isActive && "opacity-100"
                  )}
                  style={{ color: "var(--at-ink-muted)" }}
                >
                  <MoreVertical size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 font-medium">
                {onRenameCanvas && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      const newTitle = prompt("Rename canvas:", canvas.title);
                      if (newTitle && newTitle.trim()) {
                        onRenameCanvas(canvas._id, newTitle.trim());
                      }
                    }}
                    className="gap-2 text-xs"
                  >
                    <Edit2 size={13} />
                    Rename
                  </DropdownMenuItem>
                )}
                {onDuplicateCanvas && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateCanvas(canvas._id);
                    }}
                    className="gap-2 text-xs"
                  >
                    <Copy size={13} />
                    Duplicate
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onDeleteCanvas && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteCanvasId(canvas._id);
                    }}
                    className="gap-2 text-xs text-red-600 focus:text-red-600"
                  >
                    <Trash2 size={13} />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Metadata — mono strip */}
          <div
            className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1"
            style={{
              fontFamily: "var(--at-font-mono)",
              fontSize: 10,
              color: "var(--at-ink-muted)",
            }}
          >
            <span className="inline-flex items-center gap-0.5">
              <CircleDot size={9} style={{ color: "var(--at-moss-soft)" }} />
              {canvas.nodeCount}
            </span>
            <span className="inline-flex items-center gap-0.5">
              <GitBranch size={9} style={{ color: "var(--at-amber)" }} />
              {canvas.branchCount || 0}
            </span>
            <span style={{ color: "var(--at-paper-edge)" }}>·</span>
            <span>{formatTimeAgo(canvas.updatedAt || canvas.createdAt)}</span>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div
      className="flex h-full flex-col"
      style={{
        background: "var(--at-paper-soft)",
        fontFamily: "var(--at-font-sans)",
      }}
    >
      {/* Header */}
      <div
        className="flex flex-col gap-2.5 px-3 py-3"
        style={{
          background: "var(--at-paper)",
          borderBottom: "1px solid var(--at-paper-edge)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              style={{
                fontFamily: "var(--at-font-serif)",
                fontStyle: "italic",
                fontSize: 11,
                color: "var(--at-ink-muted)",
                letterSpacing: "0.02em",
              }}
            >
              Canvases
            </span>
            <span
              className="tabular-nums"
              style={{
                background: "var(--at-paper-soft)",
                border: "1px solid var(--at-paper-edge)",
                color: "var(--at-ink-muted)",
                fontSize: 9,
                fontWeight: 600,
                padding: "1px 6px",
                borderRadius: 99,
              }}
            >
              {canvases.length}
            </span>
          </div>
          <button
            onClick={onCreateCanvas}
            title="New Canvas (⌘N)"
            data-tour="create-canvas"
            className="atelier-button"
            data-variant="primary"
            style={{ padding: 0, width: 26, height: 26 }}
          >
            <Plus size={13} />
          </button>
        </div>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
            style={{ color: "var(--at-ink-faint)" }}
          />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search canvases…"
            className="h-8 w-full pl-8 pr-7 transition-all focus-visible:outline-none"
            style={{
              background: "var(--at-paper-soft)",
              border: "1px solid var(--at-paper-edge)",
              borderRadius: "var(--at-radius-md)",
              fontFamily: "var(--at-font-sans)",
              fontSize: 12,
              color: "var(--at-ink)",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded flex items-center justify-center"
              style={{
                color: "var(--at-ink-muted)",
                fontSize: 14,
              }}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar">
         {canvases.length === 0 ? (
             <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center justify-center py-12 text-center"
             >
                <div
                  className="relative mb-3 w-12 h-12 flex items-center justify-center"
                  style={{
                    background: "var(--at-paper)",
                    border: "1px solid var(--at-paper-edge)",
                    borderRadius: "var(--at-radius-lg)",
                    color: "var(--at-moss)",
                  }}
                >
                    <LayoutGrid className="h-5 w-5" />
                </div>
                <p
                  style={{
                    fontFamily: "var(--at-font-serif)",
                    fontStyle: "italic",
                    fontSize: 12,
                    color: "var(--at-ink-soft)",
                  }}
                >
                  No canvases yet
                </p>
                <p
                  className="mt-1 max-w-[180px] leading-relaxed"
                  style={{
                    fontSize: 10.5,
                    color: "var(--at-ink-muted)",
                    fontFamily: "var(--at-font-sans)",
                  }}
                >
                    Start your first page of notes.
                </p>
                <button
                    onClick={onCreateCanvas}
                    className="atelier-button mt-3"
                    data-variant="primary"
                    style={{ fontSize: 11, padding: "5px 10px" }}
                >
                    <Plus size={11} /> New Canvas
                </button>
             </motion.div>
         ) : searchQuery ? (
            /* Search Results (Flat List) */
            <div className="space-y-0.5">
               {groupedCanvases.today.concat(groupedCanvases.week, groupedCanvases.older).map((canvas, i) => (
                   <CanvasItem key={canvas._id} canvas={canvas} index={i} />
               ))}
               {groupedCanvases.today.length + groupedCanvases.week.length + groupedCanvases.older.length === 0 && (
                 <p
                   className="py-4 text-center"
                   style={{
                     fontFamily: "var(--at-font-serif)",
                     fontStyle: "italic",
                     fontSize: 12,
                     color: "var(--at-ink-muted)",
                   }}
                 >
                   No matches found
                 </p>
               )}
            </div>
         ) : (
            /* Grouped List */
            <div className="space-y-4">
               {groupedCanvases.today.length > 0 && (
                 <div className="space-y-0.5">
                    <h3
                      className="mb-1 px-2"
                      style={{
                        fontFamily: "var(--at-font-serif)",
                        fontStyle: "italic",
                        fontSize: 10.5,
                        color: "var(--at-ink-muted)",
                        letterSpacing: "0.02em",
                      }}
                    >
                      Today
                    </h3>
                    {groupedCanvases.today.map((canvas, i) => <CanvasItem key={canvas._id} canvas={canvas} index={i} />)}
                 </div>
               )}

               {groupedCanvases.week.length > 0 && (
                 <div className="space-y-0.5">
                    <h3
                      className="mb-1 px-2"
                      style={{
                        fontFamily: "var(--at-font-serif)",
                        fontStyle: "italic",
                        fontSize: 10.5,
                        color: "var(--at-ink-muted)",
                        letterSpacing: "0.02em",
                      }}
                    >
                      This week
                    </h3>
                    {groupedCanvases.week.map((canvas, i) => <CanvasItem key={canvas._id} canvas={canvas} index={i} />)}
                 </div>
               )}

               {groupedCanvases.older.length > 0 && (
                 <div className="space-y-0.5">
                    <h3
                      className="mb-1 px-2"
                      style={{
                        fontFamily: "var(--at-font-serif)",
                        fontStyle: "italic",
                        fontSize: 10.5,
                        color: "var(--at-ink-muted)",
                        letterSpacing: "0.02em",
                      }}
                    >
                      Older
                    </h3>
                    {groupedCanvases.older.map((canvas, i) => <CanvasItem key={canvas._id} canvas={canvas} index={i} />)}
                 </div>
               )}
            </div>
         )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog
        open={!!deleteCanvasId}
        onOpenChange={() => setDeleteCanvasId(null)}
      >
        <AlertDialogContent className="max-w-xs">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold text-slate-900">
              Delete workspace?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600">
              This action cannot be undone. Area you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-8 bg-black text-xs hover:bg-slate-800"
              onClick={() => {
                if (deleteCanvasId && onDeleteCanvas) {
                  onDeleteCanvas(deleteCanvasId);
                  setDeleteCanvasId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
