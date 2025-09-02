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
  Plus,
  FileText,
  Calendar,
  Hash,
  MoreHorizontal,
  Edit2,
  Trash2,
} from "lucide-react";

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
}

export function CanvasList({
  canvases,
  selectedCanvas,
  onSelectCanvas,
  onCreateCanvas,
  onDeleteCanvas,
}: CanvasListProps) {
  return (
    <div className="space-y-6">
      {/* Create New Canvas Button */}
      <Button
        onClick={onCreateCanvas}
        className="w-full gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-sm h-10 rounded-lg text-sm"
      >
        <Plus className="h-4 w-4" />
        New Canvas
      </Button>

      {/* Canvas List */}
      <div className="space-y-2">
        {canvases.map((canvas) => (
          <Card
            key={canvas._id}
            className={`group relative p-3 cursor-pointer transition-all hover:shadow-md hover:shadow-slate-200/50 border border-slate-200/80 ${
              selectedCanvas === canvas._id
                ? "ring-1 ring-slate-900/20 bg-slate-50/80 border-slate-300/80 shadow-sm"
                : "bg-white/80 backdrop-blur-sm hover:bg-white"
            }`}
            onClick={() => onSelectCanvas(canvas._id)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      selectedCanvas === canvas._id
                        ? "bg-slate-700"
                        : "bg-slate-400"
                    }`}
                  ></div>
                  <h4 className="font-medium text-slate-900 truncate text-sm">
                    {canvas.title}
                  </h4>
                </div>
              </div>
              {onDeleteCanvas && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      title="Delete canvas"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this canvas?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove the canvas, all its nodes
                        and messages. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700"
                        onClick={() => onDeleteCanvas(canvas._id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {new Date(canvas.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  <span>{canvas.nodeCount}</span>
                </div>
              </div>
            </div>

            {canvas.metaTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {canvas.metaTags.slice(0, 3).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-xs px-1.5 py-0.5 bg-slate-50/80 border-slate-200 text-slate-600 h-5"
                  >
                    {tag}
                  </Badge>
                ))}
                {canvas.metaTags.length > 3 && (
                  <Badge
                    variant="outline"
                    className="text-xs px-1.5 py-0.5 bg-slate-50/80 border-slate-200 text-slate-400 h-5"
                  >
                    +{canvas.metaTags.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </Card>
        ))}

        {canvases.length === 0 && (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <FileText className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-slate-900 font-medium text-sm mb-2">
              No canvases yet
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed max-w-xs mx-auto">
              Create your first canvas to start building flows
            </p>
            <Button
              onClick={onCreateCanvas}
              size="sm"
              className="gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-sm text-xs"
            >
              <Plus className="h-3 w-3" />
              Create Canvas
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
