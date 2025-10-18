"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  FileText,
  GitBranch,
  MapPin,
  Clock,
  Sparkles,
  ChevronRight,
  Command,
  MessageSquare,
} from "lucide-react";
import type { CanvasData, NodeData } from "@/lib/storage";

interface SearchResult {
  canvasId: string;
  canvasTitle: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  model?: string;
  matchType: "title" | "label" | "model" | "content" | "chat";
  preview?: string;
  lastModified?: string;
  messageCount?: number;
}

interface GlobalSearchProps {
  canvases: CanvasData[];
  onNavigate: (canvasId: string, nodeId: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({
  canvases,
  onNavigate,
  open,
  onOpenChange,
}: GlobalSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selected index when search query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Comprehensive search across all canvases and nodes
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !canvases || canvases.length === 0) return [];

    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Debug: Log canvas structure (remove in production)
    if (canvases.length > 0 && canvases[0].nodes && canvases[0].nodes[0]) {
      console.log("Sample node structure:", {
        node: canvases[0].nodes[0],
        hasData: !!canvases[0].nodes[0].data,
        hasChatMessages: !!(canvases[0].nodes[0] as any).chatMessages,
        hasDataChatMessages: !!(canvases[0].nodes[0].data as any)?.chatMessages,
      });
    }

    canvases.forEach((canvas) => {
      if (!canvas) return;

      const canvasTitle = canvas.title || "Untitled Canvas";
      const canvasTitleMatch = canvasTitle.toLowerCase().includes(query);

      canvas.nodes?.forEach((node) => {
        // Add null checks for node and node.data
        if (!node || !node.data) return;

        const nodeLabel = node.data.label || "Untitled Node";
        const nodeLabelMatch = nodeLabel.toLowerCase().includes(query);
        const nodeModel = node.data.model || "";
        const nodeModelMatch = nodeModel.toLowerCase().includes(query);

        // Search through chat messages - check multiple possible locations
        // The structure can vary: node.data.chatMessages, node.chatMessages, or in nested data
        let chatMessages: any[] = [];

        if (node.data.chatMessages && Array.isArray(node.data.chatMessages)) {
          chatMessages = node.data.chatMessages;
        } else if (
          (node as any).chatMessages &&
          Array.isArray((node as any).chatMessages)
        ) {
          chatMessages = (node as any).chatMessages;
        } else if (
          node.data.data?.chatMessages &&
          Array.isArray(node.data.data.chatMessages)
        ) {
          chatMessages = node.data.data.chatMessages;
        }

        let chatMatch = false;
        let chatPreview = "";
        let matchedMessageCount = 0;

        if (chatMessages.length > 0) {
          chatMessages.forEach((message: any) => {
            if (
              message?.content &&
              typeof message.content === "string" &&
              message.content.toLowerCase().includes(query)
            ) {
              chatMatch = true;
              matchedMessageCount++;
              if (!chatPreview) {
                // Get a snippet of the matched message
                const content = message.content;
                const matchIndex = content.toLowerCase().indexOf(query);
                const start = Math.max(0, matchIndex - 30);
                const end = Math.min(
                  content.length,
                  matchIndex + query.length + 30
                );
                chatPreview =
                  (start > 0 ? "..." : "") +
                  content.substring(start, end) +
                  (end < content.length ? "..." : "");
              }
            }
          });
        }

        // Priority 1: Chat message matches (MOST IMPORTANT)
        if (chatMatch) {
          results.push({
            canvasId: canvas._id,
            canvasTitle,
            nodeId: node.id,
            nodeLabel,
            nodeType: node.type || "default",
            model: nodeModel,
            matchType: "chat",
            preview: chatPreview,
            lastModified: canvas.updatedAt,
            messageCount: matchedMessageCount,
          });
        }
        // Priority 2: Canvas title matches (show all nodes in that canvas)
        else if (canvasTitleMatch) {
          results.push({
            canvasId: canvas._id,
            canvasTitle,
            nodeId: node.id,
            nodeLabel,
            nodeType: node.type || "default",
            model: nodeModel,
            matchType: "title",
            preview: `Found in canvas: ${canvasTitle}`,
            lastModified: canvas.updatedAt,
          });
        }
        // Priority 3: Node label matches
        else if (nodeLabelMatch) {
          results.push({
            canvasId: canvas._id,
            canvasTitle,
            nodeId: node.id,
            nodeLabel,
            nodeType: node.type || "default",
            model: nodeModel,
            matchType: "label",
            preview: nodeLabel,
            lastModified: canvas.updatedAt,
          });
        }
        // Priority 4: Model name matches
        else if (nodeModelMatch && nodeModel) {
          results.push({
            canvasId: canvas._id,
            canvasTitle,
            nodeId: node.id,
            nodeLabel,
            nodeType: node.type || "default",
            model: nodeModel,
            matchType: "model",
            preview: `Model: ${nodeModel}`,
            lastModified: canvas.updatedAt,
          });
        }
      });
    });

    // Sort results by relevance with CHAT as highest priority
    return results.sort((a, b) => {
      // PRIORITY 1: Chat matches are MOST IMPORTANT (always first)
      if (a.matchType === "chat" && b.matchType !== "chat") return -1;
      if (a.matchType !== "chat" && b.matchType === "chat") return 1;

      // If both are chat matches, sort by message count
      if (a.matchType === "chat" && b.matchType === "chat") {
        return (b.messageCount || 0) - (a.messageCount || 0);
      }

      // PRIORITY 2: Exact matches in labels or titles
      const aExact =
        a.nodeLabel.toLowerCase() === query ||
        a.canvasTitle.toLowerCase() === query;
      const bExact =
        b.nodeLabel.toLowerCase() === query ||
        b.canvasTitle.toLowerCase() === query;

      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      // PRIORITY 3: Match type order (label > title > model > content)
      const typeOrder = { label: 0, title: 1, model: 2, content: 3, chat: 4 };
      const aOrder = typeOrder[a.matchType] ?? 99;
      const bOrder = typeOrder[b.matchType] ?? 99;

      if (aOrder !== bOrder) return aOrder - bOrder;

      // Finally by last modified
      return (
        new Date(b.lastModified || 0).getTime() -
        new Date(a.lastModified || 0).getTime()
      );
    });
  }, [searchQuery, canvases]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          Math.min(prev + 1, searchResults.length - 1)
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && searchResults.length > 0) {
        e.preventDefault();
        handleNavigate(searchResults[selectedIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, selectedIndex, searchResults]);

  const handleNavigate = (result: SearchResult) => {
    onNavigate(result.canvasId, result.nodeId);
    onOpenChange(false);
    setSearchQuery("");
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "entry":
        return <Sparkles size={14} className="text-blue-500" />;
      case "branch":
        return <GitBranch size={14} className="text-emerald-500" />;
      case "context":
        return <FileText size={14} className="text-violet-500" />;
      default:
        return <MapPin size={14} className="text-slate-500" />;
    }
  };

  const getMatchTypeBadge = (type: string, messageCount?: number) => {
    switch (type) {
      case "chat":
        return (
          <Badge
            variant="secondary"
            className="text-xs bg-orange-50 text-orange-700 border-orange-300 font-semibold flex items-center gap-1"
          >
            <MessageSquare size={11} />
            Chat {messageCount && messageCount > 1 ? `(${messageCount})` : ""}
          </Badge>
        );
      case "title":
        return (
          <Badge
            variant="secondary"
            className="text-xs bg-blue-50 text-blue-700 border-blue-200"
          >
            Canvas
          </Badge>
        );
      case "label":
        return (
          <Badge
            variant="secondary"
            className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200"
          >
            Node
          </Badge>
        );
      case "model":
        return (
          <Badge
            variant="secondary"
            className="text-xs bg-violet-50 text-violet-700 border-violet-200"
          >
            Model
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 bg-white border-slate-200 shadow-2xl rounded-xl overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200 bg-slate-50/50">
          <DialogTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Search size={20} className="text-slate-600" />
            Search Everywhere
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Search across all canvases, nodes, models, and{" "}
            <span className="font-semibold text-orange-600">
              chat conversations
            </span>
            . Use{" "}
            <kbd className="px-1.5 py-0.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-300 rounded">
              ↑↓
            </kbd>{" "}
            to navigate,{" "}
            <kbd className="px-1.5 py-0.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-300 rounded">
              Enter
            </kbd>{" "}
            to select
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              placeholder="Search canvases, nodes, models, and chat messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 text-base border-slate-300 focus:border-slate-500 focus:ring-slate-500"
              autoFocus
            />
          </div>
        </div>

        {/* Search Results */}
        <ScrollArea className="max-h-[400px]">
          {searchQuery.trim() === "" ? (
            <div className="px-6 py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                <Search size={28} className="text-slate-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-2">
                Start typing to search
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Search across all your canvases, nodes, models, and{" "}
                <span className="font-semibold text-orange-600">
                  chat conversations
                </span>{" "}
                to quickly find what you're looking for
              </p>
              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
                <Command size={12} />
                <span>+</span>
                <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded font-mono">
                  K
                </kbd>
                <span>to open search</span>
              </div>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                <Search size={28} className="text-slate-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-2">
                No results found
              </h3>
              <p className="text-sm text-slate-500">
                Try searching with different keywords
              </p>
            </div>
          ) : (
            <div className="py-2">
              {searchResults.map((result, index) => (
                <button
                  key={`${result.canvasId}-${result.nodeId}-${index}`}
                  onClick={() => handleNavigate(result)}
                  className={`w-full px-6 py-3 flex items-start gap-4 hover:bg-slate-50 transition-colors text-left ${
                    index === selectedIndex
                      ? "bg-slate-100 border-l-4 border-l-slate-900"
                      : "border-l-4 border-l-transparent"
                  }`}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {/* Node Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getNodeIcon(result.nodeType)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {result.nodeLabel}
                      </span>
                      {getMatchTypeBadge(result.matchType, result.messageCount)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <FileText size={12} />
                      <span className="truncate">{result.canvasTitle}</span>
                      {result.model && (
                        <>
                          <span>•</span>
                          <span className="truncate">{result.model}</span>
                        </>
                      )}
                    </div>
                    {result.preview && (
                      <p
                        className={`text-xs truncate ${
                          result.matchType === "chat"
                            ? "text-orange-600 font-medium"
                            : "text-slate-400"
                        }`}
                      >
                        {result.preview}
                      </p>
                    )}
                  </div>

                  {/* Navigation Arrow */}
                  <div className="flex-shrink-0 mt-1">
                    <ChevronRight
                      size={16}
                      className={`text-slate-400 transition-transform ${
                        index === selectedIndex ? "translate-x-1" : ""
                      }`}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer with stats */}
        {searchResults.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
            <span>
              {searchResults.length} result
              {searchResults.length !== 1 ? "s" : ""} found
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              Press Enter to navigate
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
