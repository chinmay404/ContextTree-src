"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  FileText,
  Calendar,
  Hash,
  MoreHorizontal,
  Edit2,
  Trash2,
  Copy,
  ExternalLink,
  PanelLeftClose,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";

interface Canvas {
  _id: string;
  title: string;
  createdAt: string;
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
    if (!searchQuery.trim()) return canvases;

    const query = searchQuery.toLowerCase();
    return canvases.filter((canvas) => {
      const titleMatch = canvas.title.toLowerCase().includes(query);
      const tagMatch = canvas.metaTags.some((tag) =>
        tag.toLowerCase().includes(query)
      );
      return titleMatch || tagMatch;
    });
  }, [canvases, searchQuery]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Today";
    if (diffDays === 2) return "Yesterday";
    if (diffDays <= 7) return `${diffDays - 1} days ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const totalCanvases = canvases.length;
  const hasResults = filteredCanvases.length > 0;
  const showEmptySearchState = !hasResults && searchQuery.trim().length > 0;

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* Header */}
      <div className="p-4 border-b border-slate-200/40 bg-transparent">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <h2 className="text-xl font-light text-slate-900 tracking-tight">
              Your Canvases
            </h2>
            <p className="text-xs text-slate-500 font-light">
              Curate and organize the conversations that power your flows.
            </p>
          </div>
          {onCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onCollapse}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 rounded-lg"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 font-light mb-4">
          <span>
            You have
            <span className="text-slate-900 font-medium mx-1">
              {totalCanvases}
            </span>
            {totalCanvases === 1 ? "canvas" : "canvases"}
          </span>
          {totalCanvases > 0 && (
            <span className="bg-slate-100/70 border border-slate-200/70 text-slate-600 rounded-full px-2 py-0.5">
              {filteredCanvases.length} shown
            </span>
          )}
        </div>

        <div className="relative mb-4">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search canvases or tags..."
            className="pl-9 pr-3 h-10 rounded-xl bg-white/90 border-slate-200/70 focus-visible:ring-slate-200 text-sm"
          />
        </div>

        <Button
          onClick={onCreateCanvas}
          className="w-full gap-3 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white shadow-md h-11 rounded-xl text-sm font-light transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          New Canvas
        </Button>
      </div>

      {/* Canvas List */}
      <div className="flex-1 overflow-hidden bg-transparent">
        <div className="h-full overflow-y-auto p-3 space-y-2">
          {filteredCanvases.map((canvas, index) => (
            <Card
              key={canvas._id}
              className={`group relative p-4 cursor-pointer transition-all duration-300 ease-out border-0 ${
                selectedCanvas === canvas._id
                  ? "bg-gradient-to-br from-slate-100/80 to-white shadow-lg ring-2 ring-slate-200/60 scale-[1.02]"
                  : "bg-white/60 backdrop-blur-sm hover:bg-white/90 hover:shadow-md hover:ring-1 hover:ring-slate-200/40 hover:scale-[1.01]"
              }`}
              onClick={() => onSelectCanvas(canvas._id)}
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              {/* Main Content */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-2">
                  {/* Title Row */}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all duration-300 ${
                        selectedCanvas === canvas._id
                          ? "bg-slate-700 shadow-sm ring-2 ring-slate-300/30"
                          : "bg-slate-400 group-hover:bg-slate-500 group-hover:scale-110"
                      }`}
                    />
                    <h4 className="font-light text-slate-900 truncate text-base leading-tight">
                      {canvas.title}
                    </h4>
                  </div>

                  {/* Meta Information */}
                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      <span className="font-light">
                        {formatDate(canvas.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Hash className="h-3 w-3" />
                      <span className="font-light">
                        {canvas.nodeCount} nodes
                      </span>
                    </div>
                  </div>

                  {/* Tags */}
                  {canvas.metaTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {canvas.metaTags.slice(0, 2).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-xs px-2.5 py-1 bg-slate-50/90 border-slate-200/80 text-slate-600 h-6 font-light rounded-md"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {canvas.metaTags.length > 2 && (
                        <Badge
                          variant="outline"
                          className="text-xs px-2.5 py-1 bg-slate-50/90 border-slate-200/80 text-slate-400 h-6 font-light rounded-md"
                        >
                          +{canvas.metaTags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions Menu */}
                <div className="flex-shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-all duration-300 text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100/80 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-300/30"
                        title="Canvas options"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-48 bg-white shadow-lg"
                    >
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCanvas(canvas._id);
                        }}
                        className="gap-2 cursor-pointer"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open Canvas
                      </DropdownMenuItem>

                      {onRenameCanvas && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            const newTitle = prompt(
                              "Enter new canvas title:",
                              canvas.title
                            );
                            if (newTitle && newTitle.trim()) {
                              onRenameCanvas(canvas._id, newTitle.trim());
                            }
                          }}
                          className="gap-2 cursor-pointer"
                        >
                          <Edit2 className="h-4 w-4" />
                          Rename
                        </DropdownMenuItem>
                      )}

                      {onDuplicateCanvas && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateCanvas(canvas._id);
                          }}
                          className="gap-2 cursor-pointer"
                        >
                          <Copy className="h-4 w-4" />
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
                          className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          ))}

          {/* Empty State */}
          {canvases.length === 0 && (
            <div className="text-center py-16 px-6">
              <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-slate-900 font-light text-lg mb-3">
                No canvases yet
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto font-light">
                Use the button above to create your first canvas and start
                building conversation flows.
              </p>
            </div>
          )}

          {showEmptySearchState && (
            <div className="text-center py-12 px-6">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-slate-900 font-light text-base mb-2">
                No matching canvases
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-light leading-relaxed">
                Try a different title or tag to find the canvas you’re looking
                for.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteCanvasId}
        onOpenChange={() => setDeleteCanvasId(null)}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">
              Delete Canvas?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              This will permanently delete “
              {canvases.find((c) => c._id === deleteCanvasId)?.title}” and all
              its content. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200 text-slate-600 hover:bg-slate-50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
              onClick={() => {
                if (deleteCanvasId && onDeleteCanvas) {
                  onDeleteCanvas(deleteCanvasId);
                  setDeleteCanvasId(null);
                }
              }}
            >
              Delete Canvas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
