"use client";

import { useMemo, useState } from "react";
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

  const CanvasItem = ({ canvas }: { canvas: Canvas }) => (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectCanvas(canvas._id)}
      className={cn(
        "group relative flex w-full items-start gap-2 rounded-md py-1.5 px-2 text-left transition-all hover:bg-slate-100",
        selectedCanvas === canvas._id
          ? "bg-indigo-50 ring-1 ring-indigo-200"
          : "transparent"
      )}
    >
      {/* Active Indicator Bar */}
      {selectedCanvas === canvas._id && (
        <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r bg-indigo-600" />
      )}

      <div className="min-w-0 flex-1 pl-1">
        <div className="flex items-center justify-between">
            <p className={cn(
                "truncate text-sm text-slate-700",
                selectedCanvas === canvas._id ? "font-semibold text-indigo-900" : "font-medium"
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
                        "ml-1 h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-600",
                        "opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity", // Only show on hover/focus
                        selectedCanvas === canvas._id && "opacity-100" // Always show if selected
                    )}
                >
                    <MoreVertical size={14} />
                </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 font-medium">
                {onRenameCanvas && (
                    <DropdownMenuItem
                    onClick={(e) => {
                        e.stopPropagation();
                        // Simple prompt for now, consistent with existing behavior
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
        
        {/* Metadata Line */}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500">
          <span>{canvas.nodeCount} nodes</span>
          <span className="text-slate-300">·</span>
          <span>{canvas.branchCount || 0} branches</span>
           <span className="text-slate-300">·</span>
          <span>{formatTimeAgo(canvas.updatedAt || canvas.createdAt)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col bg-slate-50/50">
      {/* Header Area */}
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-3 py-3">
        <div className="flex items-center justify-between">
           <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Workspace</span>
           <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-slate-400 hover:text-slate-900"
              onClick={onCreateCanvas}
              title="New Canvas"
           >
              <Plus size={16} />
           </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="h-8 rounded-md border-slate-200 bg-slate-50 pl-8 text-xs font-medium placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-slate-300"
          />
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
         {canvases.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-10 text-center opacity-40">
                <LayoutGrid className="mb-2 h-8 w-8" />
                <p className="text-xs font-medium">No canvases yet</p>
             </div>
         ) : searchQuery ? (
            /* Search Results (Flat List) */
            <div className="space-y-0.5">
               {groupedCanvases.today.concat(groupedCanvases.week, groupedCanvases.older).map(canvas => (
                   <CanvasItem key={canvas._id} canvas={canvas} />
               ))}
               {groupedCanvases.today.length + groupedCanvases.week.length + groupedCanvases.older.length === 0 && (
                 <p className="py-4 text-center text-xs text-slate-500">No matches found</p>
               )}
            </div>
         ) : (
            /* Grouped List */
            <div className="space-y-4">
               {groupedCanvases.today.length > 0 && (
                 <div className="space-y-0.5">
                    <h3 className="mb-1 px-2 text-[10px] font-bold uppercase text-slate-400">Today</h3>
                    {groupedCanvases.today.map(canvas => <CanvasItem key={canvas._id} canvas={canvas} />)}
                 </div>
               )}
               
               {groupedCanvases.week.length > 0 && (
                 <div className="space-y-0.5">
                    <h3 className="mb-1 px-2 text-[10px] font-bold uppercase text-slate-400">This Week</h3>
                    {groupedCanvases.week.map(canvas => <CanvasItem key={canvas._id} canvas={canvas} />)}
                 </div>
               )}
               
               {groupedCanvases.older.length > 0 && (
                 <div className="space-y-0.5">
                    <h3 className="mb-1 px-2 text-[10px] font-bold uppercase text-slate-400">Older</h3>
                    {groupedCanvases.older.map(canvas => <CanvasItem key={canvas._id} canvas={canvas} />)}
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
