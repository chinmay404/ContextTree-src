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
  Calendar,
  Copy,
  Edit2,
  Hash,
  MoreHorizontal,
  PanelLeftClose,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Canvas {
  _id: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
  nodeCount: number;
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
  onCollapse,
}: CanvasListProps) {
  const [deleteCanvasId, setDeleteCanvasId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCanvases = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const withQuery = query
      ? canvases.filter((canvas) => {
          const titleMatch = canvas.title.toLowerCase().includes(query);
          const tagMatch = canvas.metaTags?.some((tag) =>
            tag.toLowerCase().includes(query)
          );
          return titleMatch || tagMatch;
        })
      : canvases;

    return withQuery.sort((a, b) => {
      const aDate = new Date(a.updatedAt || a.createdAt).getTime();
      const bDate = new Date(b.updatedAt || b.createdAt).getTime();
      return bDate - aDate;
    });
  }, [canvases, searchQuery]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: new Date().getFullYear() !== date.getFullYear() ? "numeric" : undefined,
    });
  };

  return (
    <div className="flex h-full flex-col bg-transparent">
      <div className="border-b border-slate-200/40 bg-transparent px-4 pb-3 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h2 className="text-sm font-semibold tracking-tight text-slate-900">
              Canvases
            </h2>
            <p className="text-[11px] text-slate-500">
              Quick access to your workspaces
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCreateCanvas}
              className="h-8 gap-1 rounded-lg border-slate-200/70 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </Button>
            {onCollapse && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onCollapse}
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search canvases"
            className="h-9 rounded-lg border-slate-200/70 bg-white pl-9 text-sm shadow-sm transition-colors focus-visible:ring-slate-200"
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full space-y-1 overflow-y-auto px-3 py-4">
          {filteredCanvases.length > 0 ? (
            filteredCanvases.map((canvas) => (
              <button
                key={canvas._id}
                type="button"
                onClick={() => onSelectCanvas(canvas._id)}
                className={cn(
                  "group w-full rounded-xl border border-transparent bg-white/70 px-3 py-3 text-left shadow-sm transition-all duration-200 hover:border-slate-200 hover:bg-white",
                  selectedCanvas === canvas._id &&
                    "border-slate-300 bg-white shadow-md"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {canvas.title}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {canvas.nodeCount} nodes
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(canvas.updatedAt || canvas.createdAt)}
                      </span>
                    </div>
                    {canvas.metaTags?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1 text-[10px] uppercase text-slate-400">
                        {canvas.metaTags.slice(0, 2).map((tag) => (
                          <span key={tag} className="rounded bg-slate-100 px-1.5 py-0.5">
                            #{tag}
                          </span>
                        ))}
                        {canvas.metaTags.length > 2 && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5">
                            +{canvas.metaTags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          event.preventDefault();
                        }}
                        className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                        title="Canvas options"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 text-sm">
                      <DropdownMenuItem
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelectCanvas(canvas._id);
                        }}
                        className="gap-2"
                      >
                        Open
                      </DropdownMenuItem>
                      {onRenameCanvas && (
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation();
                            const newTitle = prompt(
                              "Enter new canvas title:",
                              canvas.title
                            );
                            if (newTitle && newTitle.trim()) {
                              onRenameCanvas(canvas._id, newTitle.trim());
                            }
                          }}
                          className="gap-2"
                        >
                          <Edit2 className="h-4 w-4" />
                          Rename
                        </DropdownMenuItem>
                      )}
                      {onDuplicateCanvas && (
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation();
                            onDuplicateCanvas(canvas._id);
                          }}
                          className="gap-2"
                        >
                          <Copy className="h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {onDeleteCanvas && (
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteCanvasId(canvas._id);
                          }}
                          className="gap-2 text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </button>
            ))
          ) : canvases.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-slate-500">
              Create your first canvas to get started.
            </div>
          ) : (
            <div className="px-3 py-10 text-center text-sm text-slate-500">
              No canvases matched your search.
            </div>
          )}
        </div>
      </div>

      <AlertDialog
        open={!!deleteCanvasId}
        onOpenChange={() => setDeleteCanvasId(null)}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base text-slate-900">
              Delete canvas?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600">
              This action can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200 text-slate-600 hover:bg-slate-100">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
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
