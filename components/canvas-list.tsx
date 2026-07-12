"use client";

import { memo, useCallback, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
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
  X,
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

// ─── Row ─────────────────────────────────────────────────────
// Hoisted to module scope and memoized on the row's stable props: defining
// this inline inside CanvasList gave it a fresh component identity on every
// render, remounting all rows (and replaying their enter animations) on any
// state change. Enter animations are removed entirely — only the selection
// indicator keeps a layout animation.

type CanvasItemProps = {
  canvas: Canvas;
  isSelected: boolean;
  onSelect: (canvasId: string) => void;
  onRename?: (canvasId: string, newTitle: string) => void;
  onDuplicate?: (canvasId: string) => void;
  onRequestDelete?: (canvasId: string) => void;
};

const CanvasItem = memo(
  function CanvasItem({
    canvas,
    isSelected,
    onSelect,
    onRename,
    onDuplicate,
    onRequestDelete,
  }: CanvasItemProps) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(canvas._id)}
        className={cn(
          "group relative flex w-full items-start gap-2 rounded-lg py-1.5 px-2 text-left transition-colors hover:bg-accent",
          isSelected ? "bg-primary/10 ring-1 ring-primary/30" : "transparent"
        )}
      >
        {/* Active Indicator Bar */}
        {isSelected && (
          <motion.div
            layoutId="canvas-active-indicator"
            className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r bg-primary"
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
          />
        )}

        <div className="min-w-0 flex-1 pl-1">
          <div className="flex items-center justify-between">
            <p
              className={cn(
                "truncate type-ui",
                isSelected && "font-semibold text-primary"
              )}
            >
              {canvas.title}
            </p>

            {/* 3-Dot Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  className={cn(
                    "ml-1 h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground",
                    "opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity",
                    isSelected && "opacity-100"
                  )}
                >
                  <MoreVertical size={14} strokeWidth={1.75} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {onRename && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      const newTitle = prompt("Rename canvas:", canvas.title);
                      if (newTitle && newTitle.trim()) {
                        onRename(canvas._id, newTitle.trim());
                      }
                    }}
                    className="gap-2 text-[13px] font-medium"
                  >
                    <Edit2 className="size-3.5" strokeWidth={1.75} />
                    Rename
                  </DropdownMenuItem>
                )}
                {onDuplicate && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate(canvas._id);
                    }}
                    className="gap-2 text-[13px] font-medium"
                  >
                    <Copy className="size-3.5" strokeWidth={1.75} />
                    Duplicate
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onRequestDelete && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestDelete(canvas._id);
                    }}
                    className="gap-2 text-[13px] font-medium text-destructive focus:text-destructive"
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.75} />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Metadata Line */}
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 type-meta">
            <span className="inline-flex items-center gap-1">
              <CircleDot size={11} strokeWidth={1.75} className="text-muted-foreground" />
              {canvas.nodeCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <GitBranch size={11} strokeWidth={1.75} className="text-muted-foreground" />
              {canvas.branchCount || 0}
            </span>
            <span className="text-muted-foreground">·</span>
            <span>{formatTimeAgo(canvas.updatedAt || canvas.createdAt)}</span>
          </div>
        </div>
      </div>
    );
  },
  // Compare the canvas by value: page.tsx maps canvases to fresh objects on
  // every render, so identity checks alone would defeat the memo. Handler
  // props are stable ref-backed wrappers and are deliberately skipped.
  (prev, next) =>
    prev.isSelected === next.isSelected &&
    prev.canvas._id === next.canvas._id &&
    prev.canvas.title === next.canvas.title &&
    prev.canvas.createdAt === next.canvas.createdAt &&
    prev.canvas.updatedAt === next.canvas.updatedAt &&
    prev.canvas.nodeCount === next.canvas.nodeCount &&
    prev.canvas.branchCount === next.canvas.branchCount
);

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

  // Stable, ref-backed handler wrappers so memoized rows never re-render (or
  // hold stale closures) when the parent recreates its callbacks.
  const handlersRef = useRef({ onSelectCanvas, onRenameCanvas, onDuplicateCanvas });
  handlersRef.current = { onSelectCanvas, onRenameCanvas, onDuplicateCanvas };
  const handleSelect = useCallback(
    (canvasId: string) => handlersRef.current.onSelectCanvas(canvasId),
    []
  );
  const handleRename = useCallback(
    (canvasId: string, newTitle: string) =>
      handlersRef.current.onRenameCanvas?.(canvasId, newTitle),
    []
  );
  const handleDuplicate = useCallback(
    (canvasId: string) => handlersRef.current.onDuplicateCanvas?.(canvasId),
    []
  );
  const handleRequestDelete = useCallback(
    (canvasId: string) => setDeleteCanvasId(canvasId),
    []
  );

  const renderItem = (canvas: Canvas) => (
    <CanvasItem
      key={canvas._id}
      canvas={canvas}
      isSelected={selectedCanvas === canvas._id}
      onSelect={handleSelect}
      onRename={onRenameCanvas ? handleRename : undefined}
      onDuplicate={onDuplicateCanvas ? handleDuplicate : undefined}
      onRequestDelete={onDeleteCanvas ? handleRequestDelete : undefined}
    />
  );

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

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header Area */}
      <div className="flex flex-col gap-2.5 border-b border-border bg-card px-3 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="type-meta uppercase tracking-[0.08em]">
              Workspace
            </span>
            <span className="rounded-full bg-accent px-1.5 py-0.5 type-mono text-muted-foreground tabular-nums">
              {canvases.length}
            </span>
          </div>
          <button
            onClick={onCreateCanvas}
            title="New Canvas (⌘N)"
            data-tour="create-canvas"
            className="flex items-center justify-center h-7 w-7 rounded-lg text-muted-foreground hover:text-primary-foreground hover:bg-primary transition-colors active:scale-95"
          >
            <Plus size={14} strokeWidth={1.75} />
          </button>
        </div>

        <div className="relative">
          <Search
            strokeWidth={1.75}
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search canvases..."
            className="h-8 rounded-lg border-border bg-muted pl-8 pr-7 text-[13px] md:text-[13px] font-medium placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:bg-card transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded text-muted-foreground hover:text-foreground hover:bg-accent flex items-center justify-center"
              aria-label="Clear search"
            >
              <X size={12} strokeWidth={1.75} />
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
                <div className="relative mb-3 w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                    <LayoutGrid size={18} strokeWidth={1.75} className="text-muted-foreground" />
                </div>
                <p className="type-ui text-muted-foreground">No canvases yet</p>
                <p className="mt-1 text-xs text-muted-foreground max-w-[180px] leading-relaxed">
                    Create your first canvas to start branching conversations.
                </p>
                <button
                    onClick={onCreateCanvas}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary type-ui text-primary-foreground px-2.5 py-1.5 hover:bg-primary/90 transition-colors active:scale-95"
                >
                    <Plus size={14} strokeWidth={1.75} /> New Canvas
                </button>
             </motion.div>
         ) : searchQuery ? (
            /* Search Results (Flat List) */
            <div className="space-y-0.5">
               {groupedCanvases.today
                 .concat(groupedCanvases.week, groupedCanvases.older)
                 .map(renderItem)}
               {groupedCanvases.today.length + groupedCanvases.week.length + groupedCanvases.older.length === 0 && (
                 <p className="py-4 text-center type-meta">No matches found</p>
               )}
            </div>
         ) : (
            /* Grouped List */
            <div className="space-y-4">
               {groupedCanvases.today.length > 0 && (
                 <div className="space-y-0.5">
                    <h3 className="mb-1 px-2 type-meta uppercase tracking-[0.08em]">Today</h3>
                    {groupedCanvases.today.map(renderItem)}
                 </div>
               )}

               {groupedCanvases.week.length > 0 && (
                 <div className="space-y-0.5">
                    <h3 className="mb-1 px-2 type-meta uppercase tracking-[0.08em]">This Week</h3>
                    {groupedCanvases.week.map(renderItem)}
                 </div>
               )}

               {groupedCanvases.older.length > 0 && (
                 <div className="space-y-0.5">
                    <h3 className="mb-1 px-2 type-meta uppercase tracking-[0.08em]">Older</h3>
                    {groupedCanvases.older.map(renderItem)}
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
            <AlertDialogTitle className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
              Delete workspace?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-muted-foreground">
              This action cannot be undone. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-[13px] font-medium">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-8 bg-destructive text-destructive-foreground text-[13px] font-medium hover:bg-destructive/90"
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
