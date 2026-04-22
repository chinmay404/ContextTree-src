"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
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
import { ModelBadge } from "@/components/model-badge";
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
  Layers,
} from "lucide-react";
import type { CanvasData } from "@/lib/storage";

interface SearchResult {
  canvasId: string;
  canvasTitle: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  model?: string;
  matchType: "title" | "label" | "model" | "chat" | "summary";
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

// Highlight matched query inside a preview string.
function Highlighted({
  text,
  query,
  className,
}: {
  text: string;
  query: string;
  className?: string;
}) {
  if (!query) return <span className={className}>{text}</span>;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx < 0) return <span className={className}>{text}</span>;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <span className={className}>
      {before}
      <mark className="bg-amber-200/70 text-slate-900 rounded px-0.5">
        {match}
      </mark>
      {after}
    </span>
  );
}

// Build a search preview centered on the match.
function buildPreview(content: string, query: string, radius = 36): string {
  const lower = content.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx < 0) return content.slice(0, radius * 2);
  const start = Math.max(0, idx - radius);
  const end = Math.min(content.length, idx + q.length + radius);
  return (
    (start > 0 ? "…" : "") +
    content.slice(start, end).replace(/\s+/g, " ").trim() +
    (end < content.length ? "…" : "")
  );
}

// Flatten all possible message storage shapes into plain {role, content} items
// so search can look inside them regardless of how the node was persisted.
function readMessages(node: any): Array<{ role: string; content: string }> {
  const out: Array<{ role: string; content: string }> = [];
  const push = (role: string, content: any) => {
    if (typeof content === "string" && content.trim()) {
      out.push({ role, content });
    }
  };

  const sources: any[] = [];
  if (Array.isArray(node?.chatMessages)) sources.push(...node.chatMessages);
  if (Array.isArray(node?.data?.chatMessages))
    sources.push(...node.data.chatMessages);
  if (Array.isArray(node?.data?.data?.chatMessages))
    sources.push(...node.data.data.chatMessages);

  for (const m of sources) {
    if (!m) continue;
    if (typeof m.role === "string") {
      push(m.role, m.content);
    } else {
      if (m.user) push("user", m.user.content);
      if (m.assistant) push("assistant", m.assistant.content);
    }
  }
  return out;
}

function resolveLabel(node: any): string {
  return (
    node?.name ||
    node?.data?.label ||
    (node?.type === "entry" ? "Base Context" : "Untitled Node")
  );
}

function resolveModel(node: any): string {
  return node?.model || node?.data?.model || "";
}

export function GlobalSearch({
  canvases,
  onNavigate,
  open,
  onOpenChange,
}: GlobalSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const searchResults = useMemo<SearchResult[]>(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || !canvases?.length) return [];
    const query = trimmed.toLowerCase();

    const results: SearchResult[] = [];

    for (const canvas of canvases) {
      if (!canvas) continue;
      const canvasTitle = canvas.title || "Untitled Canvas";
      const canvasTitleMatch = canvasTitle.toLowerCase().includes(query);

      for (const rawNode of canvas.nodes || []) {
        const node = rawNode as any;
        if (!node) continue;

        const nodeId = node._id || node.id;
        if (!nodeId) continue;

        const nodeLabel = resolveLabel(node);
        const nodeModel = resolveModel(node);
        const contract = node.contextContract || "";

        const nodeLabelMatch = nodeLabel.toLowerCase().includes(query);
        const nodeModelMatch =
          !!nodeModel && nodeModel.toLowerCase().includes(query);
        const contractMatch =
          !!contract && contract.toLowerCase().includes(query);

        // Scan messages
        const messages = readMessages(node);
        let chatMatches = 0;
        let chatPreview = "";
        for (const m of messages) {
          if (m.content.toLowerCase().includes(query)) {
            chatMatches += 1;
            if (!chatPreview) chatPreview = buildPreview(m.content, query);
          }
        }

        // Emit best match type per node (don't spam the list).
        if (chatMatches > 0) {
          results.push({
            canvasId: canvas._id,
            canvasTitle,
            nodeId,
            nodeLabel,
            nodeType: node.type || "default",
            model: nodeModel,
            matchType: "chat",
            preview: chatPreview,
            lastModified: canvas.updatedAt || canvas.createdAt,
            messageCount: chatMatches,
          });
        } else if (contractMatch) {
          results.push({
            canvasId: canvas._id,
            canvasTitle,
            nodeId,
            nodeLabel,
            nodeType: node.type || "default",
            model: nodeModel,
            matchType: "summary",
            preview: buildPreview(
              contract,
              query
            ),
            lastModified: canvas.updatedAt || canvas.createdAt,
          });
        } else if (nodeLabelMatch) {
          results.push({
            canvasId: canvas._id,
            canvasTitle,
            nodeId,
            nodeLabel,
            nodeType: node.type || "default",
            model: nodeModel,
            matchType: "label",
            preview: nodeLabel,
            lastModified: canvas.updatedAt || canvas.createdAt,
          });
        } else if (nodeModelMatch) {
          results.push({
            canvasId: canvas._id,
            canvasTitle,
            nodeId,
            nodeLabel,
            nodeType: node.type || "default",
            model: nodeModel,
            matchType: "model",
            preview: `Model: ${nodeModel}`,
            lastModified: canvas.updatedAt || canvas.createdAt,
          });
        } else if (canvasTitleMatch) {
          results.push({
            canvasId: canvas._id,
            canvasTitle,
            nodeId,
            nodeLabel,
            nodeType: node.type || "default",
            model: nodeModel,
            matchType: "title",
            preview: `Found in canvas: ${canvasTitle}`,
            lastModified: canvas.updatedAt || canvas.createdAt,
          });
        }
      }
    }

    // Rank: chat > summary > label > title > model, then by recency.
    const priority: Record<SearchResult["matchType"], number> = {
      chat: 0,
      summary: 1,
      label: 2,
      title: 3,
      model: 4,
    };
    return results
      .sort((a, b) => {
        if (priority[a.matchType] !== priority[b.matchType]) {
          return priority[a.matchType] - priority[b.matchType];
        }
        if (a.matchType === "chat" && b.matchType === "chat") {
          return (b.messageCount || 0) - (a.messageCount || 0);
        }
        return (
          new Date(b.lastModified || 0).getTime() -
          new Date(a.lastModified || 0).getTime()
        );
      })
      .slice(0, 100); // cap to keep DOM light
  }, [searchQuery, canvases]);

  // Group by canvas for nicer UI
  const groupedResults = useMemo(() => {
    const groups = new Map<string, { title: string; items: SearchResult[] }>();
    for (const r of searchResults) {
      if (!groups.has(r.canvasId)) {
        groups.set(r.canvasId, { title: r.canvasTitle, items: [] });
      }
      groups.get(r.canvasId)!.items.push(r);
    }
    return Array.from(groups.entries()).map(([id, g]) => ({ id, ...g }));
  }, [searchResults]);

  const flatOrder = searchResults;

  // Keyboard nav
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, flatOrder.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && flatOrder.length > 0) {
        e.preventDefault();
        handleNavigate(flatOrder[selectedIndex]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, selectedIndex, flatOrder]);

  // Keep selected row in view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-result-idx="${selectedIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

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
      case "externalContext":
        return <FileText size={14} className="text-violet-500" />;
      default:
        return <MapPin size={14} className="text-slate-500" />;
    }
  };

  const getMatchTypeBadge = (type: SearchResult["matchType"], count?: number) => {
    switch (type) {
      case "chat":
        return (
          <Badge
            variant="secondary"
            className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 font-medium flex items-center gap-1"
          >
            <MessageSquare size={10} />
            {count && count > 1 ? `${count} matches` : "Chat"}
          </Badge>
        );
      case "summary":
        return (
          <Badge
            variant="secondary"
            className="text-[10px] bg-sky-50 text-sky-700 border-sky-200"
          >
            Context
          </Badge>
        );
      case "title":
        return (
          <Badge
            variant="secondary"
            className="text-[10px] bg-blue-50 text-blue-700 border-blue-200"
          >
            Canvas
          </Badge>
        );
      case "label":
        return (
          <Badge
            variant="secondary"
            className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"
          >
            Node
          </Badge>
        );
      case "model":
        return (
          <Badge
            variant="secondary"
            className="text-[10px] bg-violet-50 text-violet-700 border-violet-200"
          >
            Model
          </Badge>
        );
    }
  };

  // Flat index tracker for highlighting
  let cursor = 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 bg-white border-slate-200 shadow-2xl rounded-2xl overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-200 bg-gradient-to-br from-white to-slate-50/60">
          <DialogTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center text-white">
              <Search size={14} />
            </div>
            Search
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Canvases, nodes, models, summaries and chat messages —{" "}
            <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded">
              ↑↓
            </kbd>{" "}
            to navigate,{" "}
            <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded">
              Enter
            </kbd>{" "}
            to open.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-3 border-b border-slate-200 bg-white">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              placeholder="Type to search everywhere…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 h-10 text-sm border-slate-200 focus-visible:border-slate-400"
              autoFocus
            />
          </div>
        </div>

        <ScrollArea className="max-h-[440px]">
          <div ref={listRef}>
            {searchQuery.trim() === "" ? (
              <div className="px-6 py-12 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 mb-3">
                  <Search size={20} className="text-slate-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Start typing to search
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Find across canvases, nodes, chat messages, running summaries
                  and models.
                </p>
                <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                  <Command size={11} />
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono">
                    K
                  </kbd>
                  <span>opens search</span>
                </div>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 mb-3">
                  <Search size={20} className="text-slate-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  No results
                </h3>
                <p className="text-xs text-slate-500">
                  Try different keywords — search looks in canvases, nodes, and
                  chat history.
                </p>
              </div>
            ) : (
              <div className="py-2">
                {groupedResults.map((group) => (
                  <div key={group.id} className="mb-2">
                    <div className="px-5 py-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      <Layers size={10} />
                      <span className="truncate">{group.title}</span>
                      <span className="tabular-nums opacity-60">
                        {group.items.length}
                      </span>
                    </div>
                    {group.items.map((result) => {
                      const idx = cursor++;
                      const active = idx === selectedIndex;
                      return (
                        <motion.button
                          key={`${result.canvasId}-${result.nodeId}-${idx}`}
                          data-result-idx={idx}
                          initial={{ opacity: 0, y: 2 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.12 }}
                          onClick={() => handleNavigate(result)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`w-full px-5 py-2.5 flex items-start gap-3 transition-colors text-left border-l-2 ${
                            active
                              ? "bg-slate-50 border-l-slate-900"
                              : "border-l-transparent hover:bg-slate-50/60"
                          }`}
                        >
                          <div className="flex-shrink-0 mt-0.5 h-6 w-6 rounded-md bg-white border border-slate-200 flex items-center justify-center">
                            {getNodeIcon(result.nodeType)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-semibold text-slate-900 truncate">
                                <Highlighted
                                  text={result.nodeLabel}
                                  query={searchQuery}
                                />
                              </span>
                              {getMatchTypeBadge(
                                result.matchType,
                                result.messageCount
                              )}
                            </div>
                            {result.model && (
                              <div className="mb-1">
                                <ModelBadge
                                  modelId={result.model}
                                  size="sm"
                                  className="max-w-[220px]"
                                />
                              </div>
                            )}
                            {result.preview && (
                              <p className="text-[12px] leading-snug text-slate-500 line-clamp-2">
                                <Highlighted
                                  text={result.preview}
                                  query={searchQuery}
                                />
                              </p>
                            )}
                          </div>

                          <ChevronRight
                            size={14}
                            className={`flex-shrink-0 mt-1 transition-transform ${
                              active
                                ? "text-slate-900 translate-x-0.5"
                                : "text-slate-300"
                            }`}
                          />
                        </motion.button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {searchResults.length > 0 && (
          <div className="px-5 py-2.5 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-medium">
              {searchResults.length} result
              {searchResults.length !== 1 ? "s" : ""}
              {searchResults.length === 100 ? " (showing first 100)" : ""}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={10} />
              Ranked by relevance
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
