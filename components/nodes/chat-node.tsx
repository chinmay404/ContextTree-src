"use client";

import { memo, useCallback, type MouseEvent } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Focus, Info, Trash2 } from "lucide-react";
import { ModelBadge } from "@/components/model-badge";
import { cn } from "@/lib/utils";

export interface ChatNodeData {
  label?: string;
  preview?: string;
  model?: string;
  messageCount?: number;
  timestamp?: string;
  isSelected?: boolean;
  lineageColor?: string;
  streaming?: boolean;
  kind?: string;
  /** Name of the parent node this branch was forked from. */
  parentName?: string;
  /** In the shift-click compare selection (dashed outline). */
  compareSelected?: boolean;
  onClick?: () => void;
  /** Shift-click: toggle this node in/out of the compare selection. */
  onToggleCompare?: () => void;
  onFocus?: () => void;
  onShowDetails?: () => void;
  onDelete?: () => void;
  [key: string]: unknown;
}

type ChatNodeType = Node<ChatNodeData>;

const FALLBACK_LINEAGE = "#5b8def";

// Apple-style short relative time.
function timeAgo(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

function ChatNodeComponent({ data, selected }: NodeProps<ChatNodeType>) {
  const handleClick = useCallback(
    (e: MouseEvent) => {
      // Shift-click toggles compare selection instead of opening the console.
      if (e.shiftKey && data.onToggleCompare) {
        e.stopPropagation(); // keep xyflow from treating it as a selection click
        data.onToggleCompare();
        return;
      }
      data.onClick?.();
    },
    [data]
  );
  const stop = useCallback(
    (action?: () => void) => (e: MouseEvent) => {
      e.stopPropagation();
      action?.();
    },
    []
  );

  const active = selected || data.isSelected;
  const isEntry = data.kind === "entry";
  const lineageColor = data.lineageColor || FALLBACK_LINEAGE;
  const title = (data.label || (isEntry ? "Base Context" : "Branch")).trim();
  const preview = (data.preview || "").trim();
  const time = timeAgo(data.timestamp);

  // Handles are hover-only: hidden at rest so the dots never sit mid-edge.
  const handleClassName = cn(
    "!h-1.5 !w-1.5 !min-h-0 !min-w-0 !border !transition-all !duration-200 !ease-out",
    "!scale-75 !opacity-0 group-hover:!scale-100 group-hover:!opacity-100"
  );
  const handleStyle = { backgroundColor: lineageColor, borderColor: "var(--card)" };

  return (
    <div
      className={cn(
        "group relative w-[280px] cursor-pointer rounded-2xl border border-border bg-card",
        "transition-all duration-200 ease-out hover:border-white/15 hover:shadow-md",
        active && "ring-2 ring-primary ring-offset-1 ring-offset-background",
        data.compareSelected &&
          "outline-dashed outline-2 outline-offset-2 outline-primary/50"
      )}
      onClick={handleClick}
      data-slot="chat-node"
    >
      {/* Full-height lineage stripe. Wrapped in a rounded clipping layer so
          the stripe stays inside the rounded corner without putting
          overflow-hidden on the card itself (which would clip the hover
          action bar and the connection handles). */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
      >
        <span
          className="absolute bottom-[1px] left-[1px] top-[1px] w-[3px]"
          style={{ backgroundColor: lineageColor }}
        />
      </span>

      {/* Hover action popup. The wrapper spans the card and pads the gap
          below the bar so the cursor never crosses a dead zone on its way
          up (hover would drop and the buttons would vanish mid-travel). */}
      <div
        className={cn(
          "absolute bottom-full left-0 right-0 z-10 flex justify-center pb-1.5",
          "pointer-events-none opacity-0 transition-opacity duration-150",
          "group-hover:pointer-events-auto group-hover:opacity-100"
        )}
        data-slot="chat-node-actions"
      >
      <div
        className="flex items-center gap-0.5 rounded-lg border border-border bg-popover p-0.5 shadow-lg"
      >
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={stop(data.onFocus)}
          aria-label="Focus node"
          title="Focus"
        >
          <Focus size={12} />
        </button>
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={stop(data.onShowDetails)}
          aria-label="View node details"
          title="Details"
        >
          <Info size={12} />
        </button>
        {!isEntry && (
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
            onClick={stop(data.onDelete)}
            aria-label="Delete node"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
      </div>

      <div className="px-4 py-3">
        {/* Header: name + model badge */}
        <div className="flex items-center gap-2">
          <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {title}
          </h3>
          {data.model && (
            <ModelBadge
              modelId={typeof data.model === "string" ? data.model : undefined}
              size="sm"
              className="max-w-[120px] shrink-0 !shadow-none"
            />
          )}
        </div>

        {/* Preview */}
        {preview && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{preview}</p>
        )}

        {/* Footer */}
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="tabular-nums">{data.messageCount ?? 0} msgs</span>
          {time && (
            <>
              <span aria-hidden>·</span>
              <span className="tabular-nums">{time}</span>
            </>
          )}
          {isEntry && (
            <span className="rounded-full border border-border bg-secondary px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wide">
              root
            </span>
          )}
          {Boolean(data.streaming) && (
            <span
              aria-label="Streaming response"
              className="ml-auto h-[6px] w-[6px] animate-pulse rounded-full bg-primary"
            />
          )}
        </div>

        {/* Branched-from meta */}
        {data.parentName && (
          <p className="type-meta mt-1 truncate text-muted-foreground">
            from {data.parentName}
          </p>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className={handleClassName}
        style={handleStyle}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className={handleClassName}
        style={handleStyle}
      />
    </div>
  );
}

export const ChatNode = memo(ChatNodeComponent);
