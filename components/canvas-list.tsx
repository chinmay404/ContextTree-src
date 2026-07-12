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

  const CanvasItem = ({ canvas, index = 0 }: { canvas: Canvas; index?: number }) => (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => onSelectCanvas(canvas._id)}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03, ease: "easeOut" }}
      className={cn(
        "group relative flex w-full items-start gap-2 rounded-lg py-1.5 px-2 text-left transition-colors hover:bg-accent",
        selectedCanvas === canvas._id
          ? "bg-primary/10 ring-1 ring-primary/30"
          : "transparent"
      )}
    >
      {/* Active Indicator Bar */}
      {selectedCanvas === canvas._id && (
        <motion.div
          layoutId="canvas-active-indicator"
          className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r bg-primary"
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}

      <div className="min-w-0 flex-1 pl-1">
        <div className="flex items-center justify-between">
            <p className={cn(
                "truncate type-ui",
                selectedCanvas === canvas._id && "font-semibold text-primary"
            )}>
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
                        selectedCanvas === canvas._id && "opacity-100"
                    )}
                >
                    <MoreVertical size={14} strokeWidth={1.75} />
                </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                {onRenameCanvas && (
                    <DropdownMenuItem
                    onClick={(e) => {
                        e.stopPropagation();
                        const newTitle = prompt("Rename canvas:", canvas.title);
                        if (newTitle && newTitle.trim()) {
                        onRenameCanvas(canvas._id, newTitle.trim());
                        }
                    }}
                    className="gap-2 text-[13px] font-medium"
                    >
                    <Edit2 className="size-3.5" strokeWidth={1.75} />
                    Rename
                    </DropdownMenuItem>
                )}
                {onDuplicateCanvas && (
                    <DropdownMenuItem
                    onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateCanvas(canvas._id);
                    }}
                    className="gap-2 text-[13px] font-medium"
                    >
                    <Copy className="size-3.5" strokeWidth={1.75} />
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
    </motion.div>
  );

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
               {groupedCanvases.today.concat(groupedCanvases.week, groupedCanvases.older).map((canvas, i) => (
                   <CanvasItem key={canvas._id} canvas={canvas} index={i} />
               ))}
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
                    {groupedCanvases.today.map((canvas, i) => <CanvasItem key={canvas._id} canvas={canvas} index={i} />)}
                 </div>
               )}

               {groupedCanvases.week.length > 0 && (
                 <div className="space-y-0.5">
                    <h3 className="mb-1 px-2 type-meta uppercase tracking-[0.08em]">This Week</h3>
                    {groupedCanvases.week.map((canvas, i) => <CanvasItem key={canvas._id} canvas={canvas} index={i} />)}
                 </div>
               )}

               {groupedCanvases.older.length > 0 && (
                 <div className="space-y-0.5">
                    <h3 className="mb-1 px-2 type-meta uppercase tracking-[0.08em]">Older</h3>
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
