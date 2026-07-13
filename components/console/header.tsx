"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  Edit2,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  X,
} from "lucide-react";
import { toast as sonnerToast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModelBadge } from "@/components/model-badge";
import { ModelSelectionPanel } from "@/components/model-selection-panel";
import { storageService } from "@/lib/storage";
import type { LineageEntry } from "./shared";

// When the lineage chain is longer than this, collapse the middle with "…".
const MAX_VISIBLE_CHAIN = 4;

// ─── Compare siblings menu item ─────────────────────────────
// Rendered inside DropdownMenuContent, which Radix only mounts while the
// menu is open — so the localStorage canvas cache (mirrored by the canvas
// on every load/update) is read at most once per menu open. Dispatching
// canvas-open-compare keeps this file decoupled from the canvas, which
// owns the compare modal.
function CompareSiblingsItem({ currentNodeId }: { currentNodeId?: string }) {
  const nodeIds = useMemo(() => {
    if (!currentNodeId || typeof window === "undefined") return null;
    try {
      for (const canvas of storageService.getAllCanvases()) {
        const node = canvas.nodes.find((n) => n._id === currentNodeId);
        if (!node) continue;
        if (!node.parentNodeId) return null; // roots have no siblings
        const siblings = canvas.nodes.filter(
          (s) =>
            s._id !== currentNodeId &&
            s.parentNodeId === node.parentNodeId &&
            (s.type === "entry" || s.type === "branch")
        );
        if (siblings.length === 0) return null;
        // Current node + up to 2 siblings (compare caps at 3 columns).
        return [currentNodeId, ...siblings.slice(0, 2).map((s) => s._id)];
      }
    } catch {
      // Cache unavailable — treat as no siblings.
    }
    return null;
  }, [currentNodeId]);

  return (
    <DropdownMenuItem
      disabled={!nodeIds}
      onSelect={() => {
        if (!nodeIds) return;
        window.dispatchEvent(
          new CustomEvent("canvas-open-compare", { detail: { nodeIds } })
        );
      }}
    >
      Compare siblings…
    </DropdownMenuItem>
  );
}

type ConsoleHeaderProps = {
  lineage: LineageEntry[];
  resolvedName?: string;
  /** Null while the selected node's data hasn't loaded — badge stays hidden (B1.3). */
  activeModelId: string | null;
  isEditingName: boolean;
  nameInput: string;
  onNameInputChange: (value: string) => void;
  onStartRename: () => void;
  onSaveName: () => void;
  onCancelRename: () => void;
  onNodeSelect?: (nodeId: string, nodeName?: string, nodeType?: string) => void;
  onModelChange: (modelId: string) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onClose?: () => void;
  /** Optional — the menu item is omitted when no delete callback exists. */
  onDeleteBranch?: () => void;
};

export function ConsoleHeader({
  lineage,
  resolvedName,
  activeModelId,
  isEditingName,
  nameInput,
  onNameInputChange,
  onStartRename,
  onSaveName,
  onCancelRename,
  onNodeSelect,
  onModelChange,
  isFullscreen = false,
  onToggleFullscreen,
  onClose,
  onDeleteBranch,
}: ConsoleHeaderProps) {
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  // Set when Esc cancels the rename so the input's blur doesn't save.
  const renameCancelledRef = useRef(false);

  // Ancestors only — the current node renders separately as the editable name.
  const ancestors = lineage.slice(0, -1);
  const truncated = lineage.length > MAX_VISIBLE_CHAIN;
  const visibleAncestors: (LineageEntry | "ellipsis")[] = truncated
    ? [ancestors[0], "ellipsis", ancestors[ancestors.length - 1]]
    : ancestors;

  return (
    <div className="flex-none h-12 border-b border-border bg-card z-10 px-4 flex items-center justify-between text-sm">
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {ancestors.length > 0 && (
          <div className="flex items-center gap-0.5 type-meta mr-1 min-w-0 shrink">
            {visibleAncestors.map((entry, idx) =>
              entry === "ellipsis" ? (
                <span key={`ellipsis-${idx}`} className="flex items-center gap-0.5">
                  <span className="px-0.5 select-none">…</span>
                  <ChevronRight size={12} strokeWidth={1.75} className="shrink-0" />
                </span>
              ) : (
                <span key={entry.id} className="flex items-center gap-0.5 min-w-0">
                  <button
                    onClick={() => onNodeSelect?.(entry.id, entry.name)}
                    className="hover:text-foreground truncate max-w-[80px]"
                    title={entry.name}
                  >
                    {entry.name}
                  </button>
                  <ChevronRight size={12} strokeWidth={1.75} className="shrink-0" />
                </span>
              )
            )}
          </div>
        )}

        {isEditingName ? (
          <input
            autoFocus
            className="type-ui font-semibold bg-transparent border-b-2 border-primary px-0 py-0 focus:outline-none flex-1 min-w-0"
            value={nameInput}
            onChange={(e) => onNameInputChange(e.target.value)}
            onBlur={() => {
              if (renameCancelledRef.current) {
                renameCancelledRef.current = false;
                return;
              }
              onSaveName();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSaveName();
              } else if (e.key === "Escape") {
                // Keep the console-level Escape handler (close/fullscreen
                // exit) from firing while cancelling the rename.
                e.stopPropagation();
                renameCancelledRef.current = true;
                onCancelRename();
              }
            }}
          />
        ) : (
          <button
            onClick={onStartRename}
            className="type-ui font-semibold truncate hover:text-primary transition-colors flex items-center gap-1 group min-w-0"
            title="Rename branch"
          >
            <span className="truncate">{resolvedName || "Untitled"}</span>
            <Edit2
              size={12}
              strokeWidth={1.75}
              className="shrink-0 text-muted-foreground group-hover:text-foreground"
            />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 ml-2 shrink-0">
        <DropdownMenu open={modelMenuOpen} onOpenChange={setModelMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="shrink-0 rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Change model"
              title="Change model"
            >
              {activeModelId && (
                <ModelBadge
                  modelId={activeModelId}
                  size="sm"
                  className="max-w-[220px] whitespace-nowrap"
                />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-[440px] max-w-[90vw] p-0"
          >
            <div className="max-h-[65vh] overflow-y-auto p-3">
              <ModelSelectionPanel
                selectedModel={activeModelId}
                onSelect={(modelId) => {
                  onModelChange(modelId);
                  setModelMenuOpen(false);
                }}
                compact
                mode="branch"
              />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
              aria-label="More actions"
            >
              <MoreHorizontal size={16} strokeWidth={1.75} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                // Defer so the input's autoFocus wins over Radix's
                // focus-restore to the menu trigger on close.
                setTimeout(onStartRename, 0);
              }}
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => sonnerToast("Compile export coming soon")}
            >
              Export from here
            </DropdownMenuItem>
            <CompareSiblingsItem
              currentNodeId={lineage[lineage.length - 1]?.id}
            />
            {onDeleteBranch && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={onDeleteBranch}
                >
                  Delete branch
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {onToggleFullscreen && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={onToggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize2 size={16} strokeWidth={1.75} />
            ) : (
              <Maximize2 size={16} strokeWidth={1.75} />
            )}
          </Button>
        )}
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <X size={16} strokeWidth={1.75} />
          </Button>
        )}
      </div>
    </div>
  );
}
