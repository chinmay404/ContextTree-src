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
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
  LayoutGrid,
  LayoutList,
  Star,
  ArrowUpDown,
  Clock,
  TrendingUp,
  Filter,
  Tag,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

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

type SortOption = "name-asc" | "name-desc" | "date-desc" | "date-asc" | "nodes-desc" | "nodes-asc";
type ViewMode = "list" | "compact";

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
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem("canvas-favorites");
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {
        console.error("Error loading favorites:", e);
      }
    }
  }, []);

  // Save favorites to localStorage
  const toggleFavorite = (canvasId: string) => {
    setFavorites((prev) => {
      const newFavorites = prev.includes(canvasId)
        ? prev.filter((id) => id !== canvasId)
        : [...prev, canvasId];
      localStorage.setItem("canvas-favorites", JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  // Get all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    canvases.forEach((canvas) => {
      canvas.metaTags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [canvases]);

  // Filter and sort canvases
  const filteredAndSortedCanvases = useMemo(() => {
    let result = [...canvases];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((canvas) => {
        const titleMatch = canvas.title.toLowerCase().includes(query);
        const tagMatch = canvas.metaTags.some((tag) =>
          tag.toLowerCase().includes(query)
        );
        return titleMatch || tagMatch;
      });
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      result = result.filter((canvas) =>
        selectedTags.some((tag) => canvas.metaTags.includes(tag))
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.title.localeCompare(b.title);
        case "name-desc":
          return b.title.localeCompare(a.title);
        case "date-asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "date-desc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "nodes-asc":
          return a.nodeCount - b.nodeCount;
        case "nodes-desc":
          return b.nodeCount - a.nodeCount;
        default:
          return 0;
      }
    });

    // Favorites first
    result.sort((a, b) => {
      const aFav = favorites.includes(a._id);
      const bFav = favorites.includes(b._id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0;
    });

    return result;
  }, [canvases, searchQuery, selectedTags, sortBy, favorites]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalNodes = canvases.reduce((sum, canvas) => sum + canvas.nodeCount, 0);
    const recentCanvases = canvases.filter((canvas) => {
      const diffTime = Date.now() - new Date(canvas.createdAt).getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    }).length;

    return {
      totalCanvases: canvases.length,
      totalNodes,
      recentCanvases,
      favoriteCount: favorites.length,
    };
  }, [canvases, favorites]);

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
  const hasResults = filteredAndSortedCanvases.length > 0;
  const showEmptySearchState = !hasResults && (searchQuery.trim().length > 0 || selectedTags.length > 0);

  const toggleTagFilter = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

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
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 rounded-lg transition-all duration-200"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200/50 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs text-slate-500 font-light">Total</span>
            </div>
            <p className="text-2xl font-light text-slate-900">{stats.totalCanvases}</p>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200/50 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-2 mb-1">
              <Hash className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs text-slate-500 font-light">Nodes</span>
            </div>
            <p className="text-2xl font-light text-slate-900">{stats.totalNodes}</p>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200/50 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs text-slate-500 font-light">Recent</span>
            </div>
            <p className="text-2xl font-light text-slate-900">{stats.recentCanvases}</p>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200/50 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              <span className="text-xs text-slate-500 font-light">Starred</span>
            </div>
            <p className="text-2xl font-light text-slate-900">{stats.favoriteCount}</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search canvases or tags..."
            className="pl-9 pr-3 h-10 rounded-xl bg-white/90 border-slate-200/70 focus-visible:ring-slate-200 text-sm transition-all duration-200"
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9 gap-2 bg-white/80 border-slate-200/70 hover:bg-white text-slate-600 rounded-lg transition-all duration-200"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span className="text-xs">Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-xs font-light text-slate-500">
                Sort by
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <DropdownMenuRadioItem value="date-desc" className="text-sm">
                  <Calendar className="h-3.5 w-3.5 mr-2" />
                  Newest first
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="date-asc" className="text-sm">
                  <Calendar className="h-3.5 w-3.5 mr-2" />
                  Oldest first
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="name-asc" className="text-sm">
                  <FileText className="h-3.5 w-3.5 mr-2" />
                  A to Z
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="name-desc" className="text-sm">
                  <FileText className="h-3.5 w-3.5 mr-2" />
                  Z to A
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="nodes-desc" className="text-sm">
                  <TrendingUp className="h-3.5 w-3.5 mr-2" />
                  Most nodes
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="nodes-asc" className="text-sm">
                  <Hash className="h-3.5 w-3.5 mr-2" />
                  Least nodes
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Mode Toggle */}
          <div className="flex gap-1 bg-white/80 border border-slate-200/70 rounded-lg p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("list")}
              className={cn(
                "h-7 w-7 rounded transition-all duration-200",
                viewMode === "list"
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-400 hover:text-slate-600"
              )}
              title="List view"
            >
              <LayoutList className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("compact")}
              className={cn(
                "h-7 w-7 rounded transition-all duration-200",
                viewMode === "compact"
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-400 hover:text-slate-600"
              )}
              title="Compact view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "h-9 w-9 bg-white/80 border-slate-200/70 hover:bg-white rounded-lg transition-all duration-200",
                    selectedTags.length > 0 && "bg-amber-50 border-amber-300 text-amber-600"
                  )}
                  title="Filter by tags"
                >
                  <Filter className="h-3.5 w-3.5" />
                  {selectedTags.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-amber-500 text-white text-[10px] rounded-full flex items-center justify-center">
                      {selectedTags.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs font-light text-slate-500">
                  Filter by tags
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {selectedTags.length > 0 && (
                  <>
                    <DropdownMenuItem
                      onClick={() => setSelectedTags([])}
                      className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Clear all filters
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <div className="max-h-64 overflow-y-auto">
                  {allTags.map((tag) => (
                    <DropdownMenuItem
                      key={tag}
                      onClick={() => toggleTagFilter(tag)}
                      className="text-sm"
                    >
                      <Tag className="h-3.5 w-3.5 mr-2" />
                      {tag}
                      {selectedTags.includes(tag) && (
                        <span className="ml-auto text-amber-500">✓</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Active Filters */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {selectedTags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 border-amber-300 cursor-pointer hover:bg-amber-200 transition-colors"
                onClick={() => toggleTagFilter(tag)}
              >
                {tag}
                <span className="ml-1">×</span>
              </Badge>
            ))}
          </div>
        )}

        {/* Showing Count */}
        <div className="flex items-center justify-between text-xs text-slate-500 font-light mb-3">
          <span>
            Showing
            <span className="text-slate-900 font-medium mx-1">
              {filteredAndSortedCanvases.length}
            </span>
            of
            <span className="text-slate-900 font-medium mx-1">
              {totalCanvases}
            </span>
            {totalCanvases === 1 ? "canvas" : "canvases"}
          </span>
        </div>

        {/* Create Canvas Button */}
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
          {filteredAndSortedCanvases.map((canvas, index) => {
            const isFavorite = favorites.includes(canvas._id);
            
            return viewMode === "list" ? (
              // List View
              <Card
                key={canvas._id}
                className={cn(
                  "group relative p-4 cursor-pointer transition-all duration-300 ease-out border-0",
                  selectedCanvas === canvas._id
                    ? "bg-gradient-to-br from-slate-100/80 to-white shadow-lg ring-2 ring-slate-200/60 scale-[1.02]"
                    : "bg-white/60 backdrop-blur-sm hover:bg-white/90 hover:shadow-md hover:ring-1 hover:ring-slate-200/40 hover:scale-[1.01]"
                )}
                onClick={() => onSelectCanvas(canvas._id)}
                style={{
                  animationDelay: `${index * 30}ms`,
                }}
              >
                {/* Main Content */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    {/* Title Row */}
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={cn(
                          "w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all duration-300",
                          selectedCanvas === canvas._id
                            ? "bg-slate-700 shadow-sm ring-2 ring-slate-300/30"
                            : "bg-slate-400 group-hover:bg-slate-500 group-hover:scale-110"
                        )}
                      />
                      <h4 className="font-light text-slate-900 truncate text-base leading-tight">
                        {canvas.title}
                      </h4>
                      {isFavorite && (
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
                      )}
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
                            className={cn(
                              "text-xs px-2.5 py-1 border-slate-200/80 text-slate-600 h-6 font-light rounded-md transition-colors",
                              selectedTags.includes(tag)
                                ? "bg-amber-50/90 border-amber-300 text-amber-700"
                                : "bg-slate-50/90"
                            )}
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
                  <div className="flex-shrink-0 flex items-start gap-1">
                    {/* Favorite Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        toggleFavorite(canvas._id);
                      }}
                      className={cn(
                        "opacity-0 group-hover:opacity-100 transition-all duration-300 p-2 rounded-lg hover:bg-slate-100/80 focus:opacity-100 focus:outline-none",
                        isFavorite && "opacity-100"
                      )}
                      title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Star
                        className={cn(
                          "h-4 w-4 transition-all",
                          isFavorite
                            ? "text-amber-500 fill-amber-500"
                            : "text-slate-400 hover:text-amber-500"
                        )}
                      />
                    </button>

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
            ) : (
              // Compact View
              <Card
                key={canvas._id}
                className={cn(
                  "group relative p-3 cursor-pointer transition-all duration-300 ease-out border-0",
                  selectedCanvas === canvas._id
                    ? "bg-gradient-to-br from-slate-100/80 to-white shadow-lg ring-2 ring-slate-200/60"
                    : "bg-white/60 backdrop-blur-sm hover:bg-white/90 hover:shadow-md hover:ring-1 hover:ring-slate-200/40"
                )}
                onClick={() => onSelectCanvas(canvas._id)}
                style={{
                  animationDelay: `${index * 30}ms`,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0 transition-all duration-300",
                        selectedCanvas === canvas._id
                          ? "bg-slate-700"
                          : "bg-slate-400 group-hover:bg-slate-500"
                      )}
                    />
                    <span className="text-sm font-light text-slate-900 truncate">
                      {canvas.title}
                    </span>
                    {isFavorite && (
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-slate-500 font-light">
                      {canvas.nodeCount}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-all duration-300 text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100/80 focus:opacity-100 focus:outline-none"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-48 bg-white shadow-lg"
                      >
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(canvas._id);
                          }}
                          className="gap-2 cursor-pointer"
                        >
                          <Star className={cn("h-4 w-4", isFavorite && "fill-amber-500 text-amber-500")} />
                          {isFavorite ? "Remove favorite" : "Add favorite"}
                        </DropdownMenuItem>
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
            );
          })}

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

                      );
          })}

          {/* Empty State */}
          {canvases.length === 0 && (
            <div className="text-center py-16 px-6 animate-in fade-in duration-500">
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
            <div className="text-center py-12 px-6 animate-in fade-in duration-500">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-slate-900 font-light text-base mb-2">
                No matching canvases
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-light leading-relaxed mb-3">
                {selectedTags.length > 0
                  ? "Try adjusting your filters or search query."
                  : "Try a different title or tag to find the canvas you're looking for."}
              </p>
              {(selectedTags.length > 0 || searchQuery.trim()) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedTags([]);
                    setSearchQuery("");
                  }}
                  className="mt-2 text-xs"
                >
                  Clear all filters
                </Button>
              )}
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
