"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogTrigger,
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
} from "lucide-react";
import { useState } from "react";

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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200/60 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900">Canvases</h2>
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
            {canvases.length}
          </span>
        </div>
        
        <Button
          onClick={onCreateCanvas}
          className="w-full gap-2 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white shadow-sm h-9 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md"
        >
          <Plus className="h-4 w-4" />
          New Canvas
        </Button>
      </div>

      {/* Canvas List */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-3 space-y-2">
          {canvases.map((canvas) => (
            <Card
              key={canvas._id}
              className={`group relative p-3 cursor-pointer transition-all duration-200 border-0 ${
                selectedCanvas === canvas._id
                  ? "bg-gradient-to-r from-slate-50 to-slate-100/50 shadow-sm ring-1 ring-slate-200 scale-[1.02]"
                  : "bg-white/60 backdrop-blur-sm hover:bg-white hover:shadow-md hover:scale-[1.01] hover:ring-1 hover:ring-slate-200/50"
              }`}
              onClick={() => onSelectCanvas(canvas._id)}
            >
              {/* Main Content */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Title Row */}
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${
                        selectedCanvas === canvas._id
                          ? "bg-slate-700 shadow-sm"
                          : "bg-slate-400 group-hover:bg-slate-500"
                      }`}
                    />
                    <h4 className="font-medium text-slate-900 truncate text-sm leading-tight">
                      {canvas.title}
                    </h4>
                  </div>

                  {/* Meta Information */}
                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(canvas.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      <span>{canvas.nodeCount} nodes</span>
                    </div>
                  </div>

                  {/* Tags */}
                  {canvas.metaTags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {canvas.metaTags.slice(0, 2).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-xs px-2 py-0.5 bg-slate-50/80 border-slate-200/80 text-slate-600 h-5 font-normal"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {canvas.metaTags.length > 2 && (
                        <Badge
                          variant="outline"
                          className="text-xs px-2 py-0.5 bg-slate-50/80 border-slate-200/80 text-slate-400 h-5 font-normal"
                        >
                          +{canvas.metaTags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="opacity-0 group-hover:opacity-100 transition-all duration-200 text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100/80 ml-2"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() => onSelectCanvas(canvas._id)}
                      className="gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Canvas
                    </DropdownMenuItem>
                    
                    {onRenameCanvas && (
                      <DropdownMenuItem
                        onClick={() => {
                          const newTitle = prompt("Enter new canvas title:", canvas.title);
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
                        onClick={() => onDuplicateCanvas(canvas._id)}
                        className="gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuSeparator />
                    
                    {onDeleteCanvas && (
                      <DropdownMenuItem
                        onClick={() => setDeleteCanvasId(canvas._id)}
                        className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}

          {/* Empty State */}
          {canvases.length === 0 && (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <FileText className="h-7 w-7 text-slate-400" />
              </div>
              <h3 className="text-slate-900 font-semibold text-sm mb-2">
                No canvases yet
              </h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed max-w-xs mx-auto">
                Create your first canvas to start building conversation flows and organize your AI interactions.
              </p>
              <Button
                onClick={onCreateCanvas}
                size="sm"
                className="gap-2 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white shadow-sm text-xs font-medium"
              >
                <Plus className="h-3 w-3" />
                Create Your First Canvas
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteCanvasId} onOpenChange={() => setDeleteCanvasId(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">Delete Canvas?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              This will permanently delete "{canvases.find(c => c._id === deleteCanvasId)?.title}" and all its content. 
              This action cannot be undone.
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
