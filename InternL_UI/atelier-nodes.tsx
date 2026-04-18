"use client";

/**
 * atelier-nodes.tsx
 * ----------------------------------------------------------------------------
 * ContextTree's interior node designs — Atelier style.
 * Drop-in replacements for entry-node-minimal, branch-node-minimal,
 * context-node-minimal. Preserves your existing data contracts.
 *
 * Usage in canvas-area.tsx:
 *   import {
 *     EntryNodeAtelier,
 *     BranchNodeAtelier,
 *     ContextNodeAtelier,
 *   } from "@/components/nodes/atelier-nodes";
 *
 *   const nodeTypes = {
 *     entry: EntryNodeAtelier,
 *     branch: BranchNodeAtelier,
 *     context: ContextNodeAtelier,
 *     // ...
 *   };
 */

import { memo, useCallback, type MouseEvent } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Trash2, FileText, X as XIcon, GitBranch } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════
   Shared primitives
   ═══════════════════════════════════════════════════════════════════════ */

interface BaseNodeData {
  label: string;
  preview?: string;
  model?: string;
  timestamp?: string;
  isSelected?: boolean;
  messageCount?: number;
  onClick?: () => void;
  onDelete?: () => void;
  [key: string]: unknown;
}

function handleClassName(active: boolean, accent: "moss" | "amber" | "indigo") {
  const colorMap = {
    moss: "rgba(45, 95, 63, 1)",
    amber: "rgba(201, 123, 47, 1)",
    indigo: "rgba(67, 56, 202, 1)",
  };
  return [
    "!h-2.5 !w-2.5 !bg-[var(--at-paper)] !border-[1.5px]",
    "!transition-all !duration-200 !ease-out",
    active
      ? "!scale-100 !opacity-100"
      : "!scale-75 !opacity-0 group-hover:!scale-100 group-hover:!opacity-80",
  ].join(" ");
}

function formatTimeAgo(timestamp?: string): string {
  if (!timestamp) return "";
  const then = new Date(timestamp).getTime();
  const now = Date.now();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/* Inline Paper Card wrapper for a node.
   The left accent bar is implemented as a ::before using a data-accent attr. */
function NodeCard({
  active,
  accent,
  width,
  children,
  onClick,
}: {
  active: boolean;
  accent: "moss" | "amber" | "indigo";
  width: number;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const ringColor = {
    moss: "rgba(45, 95, 63, 1)",
    amber: "rgba(201, 123, 47, 1)",
    indigo: "rgba(67, 56, 202, 1)",
  }[accent];

  const accentVar = {
    moss: "var(--at-moss)",
    amber: "var(--at-amber)",
    indigo: "var(--at-indigo)",
  }[accent];

  const barWidth = accent === "moss" ? 3 : 2;

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer transition-all duration-200 ease-out hover:-translate-y-[1px]"
      style={{ width }}
    >
      {/* Paper card */}
      <div
        className="relative overflow-hidden"
        style={{
          background: accent === "moss" ? "var(--at-paper)" : "var(--at-paper-soft)",
          border: "1px solid var(--at-paper-edge)",
          borderRadius: "var(--at-radius-lg)",
          boxShadow: active
            ? `var(--at-shadow-lg), 0 0 0 1.5px ${ringColor}`
            : "var(--at-shadow-sm)",
          transition: "box-shadow 200ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* Left accent bar — the "book ribbon" */}
        <span
          aria-hidden
          className="absolute left-0 top-0 bottom-0"
          style={{
            width: barWidth,
            background: accentVar,
            borderRadius:
              "var(--at-radius-lg) 0 0 var(--at-radius-lg)",
          }}
        />

        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ENTRY NODE — Main Thread
   ═══════════════════════════════════════════════════════════════════════ */

export interface EntryNodeData extends BaseNodeData {
  primary?: boolean;
  color?: string;
  textColor?: string;
  dotColor?: string;
  highlightTier?: 0 | 1 | 2;
  sharedLabel?: string;
}

type EntryNodeType = Node<EntryNodeData, "entry">;

function EntryNodeComponent({ data, selected }: NodeProps<EntryNodeType>) {
  const handleClick = useCallback(() => data.onClick?.(), [data]);
  const stop = useCallback(
    (action?: () => void) => (e: MouseEvent) => {
      e.stopPropagation();
      action?.();
    },
    []
  );

  const active = selected || !!data.isSelected;
  const title = (data.label || "Main Thread").trim();
  const preview = (data.preview || "").trim();
  const messageCount = data.messageCount ?? 0;
  const timeAgo = formatTimeAgo(data.timestamp);

  return (
    <NodeCard active={active} accent="moss" width={320} onClick={handleClick}>
      <div className="relative px-5 py-4 pl-6">
        {/* Type label */}
        <div className="mb-2.5 flex items-center gap-2">
          <span
            className="atelier-type-label"
            data-accent="moss"
            style={{
              fontFamily: "var(--at-font-serif)",
              fontStyle: "italic",
              fontSize: 11,
              color: "var(--at-moss)",
            }}
          >
            Main thread
          </span>
          {data.primary && (
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--at-moss)" }}
            />
          )}
        </div>

        {/* Title */}
        <h3
          className="leading-[1.3] tracking-[-0.01em]"
          style={{
            fontFamily: "var(--at-font-serif)",
            fontWeight: 400,
            fontSize: 18,
            color: "var(--at-ink)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {title}
        </h3>

        {/* Preview */}
        {preview && (
          <p
            className="mt-2 leading-[1.55]"
            style={{
              fontFamily: "var(--at-font-sans)",
              fontSize: 13,
              color: "var(--at-ink-soft)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {preview}
          </p>
        )}

        {/* Meta row */}
        {(data.model || messageCount > 0 || timeAgo) && (
          <div
            className="mt-3 flex items-center gap-2"
            style={{
              fontFamily: "var(--at-font-mono)",
              fontSize: 10,
              color: "var(--at-ink-muted)",
            }}
          >
            {data.model && (
              <span style={{ color: "var(--at-moss)" }}>{data.model}</span>
            )}
            {data.model && (messageCount > 0 || timeAgo) && (
              <span style={{ color: "var(--at-paper-edge)" }}>·</span>
            )}
            {messageCount > 0 && <span>{messageCount} msg{messageCount !== 1 ? "s" : ""}</span>}
            {messageCount > 0 && timeAgo && (
              <span style={{ color: "var(--at-paper-edge)" }}>·</span>
            )}
            {timeAgo && <span>{timeAgo}</span>}
          </div>
        )}
      </div>

      {/* Delete button — only on hover, only for non-primary entries */}
      {!data.primary && (
        <button
          onClick={stop(data.onDelete)}
          className="absolute -top-2 -right-2 hidden h-6 w-6 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:flex group-hover:opacity-100"
          style={{
            background: "var(--at-paper)",
            border: "1px solid var(--at-paper-edge)",
            color: "var(--at-ink-muted)",
            boxShadow: "var(--at-shadow-md)",
          }}
          aria-label="Delete node"
        >
          <XIcon size={11} />
        </button>
      )}

      {/* Handles */}
      <Handle type="source" position={Position.Bottom} className={handleClassName(active, "moss")} style={{ borderColor: "var(--at-moss)" }} />
      <Handle type="source" position={Position.Right} className={handleClassName(active, "moss")} style={{ borderColor: "var(--at-moss)" }} />
      <Handle type="target" position={Position.Top} className={handleClassName(active, "moss")} style={{ borderColor: "var(--at-moss)" }} />
      <Handle type="target" position={Position.Left} className={handleClassName(active, "moss")} style={{ borderColor: "var(--at-moss)" }} />
    </NodeCard>
  );
}

export const EntryNodeAtelier = memo(EntryNodeComponent);
EntryNodeAtelier.displayName = "EntryNodeAtelier";

/* ═══════════════════════════════════════════════════════════════════════
   BRANCH NODE — Tangent
   ═══════════════════════════════════════════════════════════════════════ */

export interface BranchNodeData extends BaseNodeData {
  branchBadge?: string; // "01", "02"...
  parentName?: string;
  branchCount?: number;
  color?: string;
}

type BranchNodeType = Node<BranchNodeData, "branch">;

function BranchNodeComponent({ data, selected }: NodeProps<BranchNodeType>) {
  const handleClick = useCallback(() => data.onClick?.(), [data]);
  const stop = useCallback(
    (action?: () => void) => (e: MouseEvent) => {
      e.stopPropagation();
      action?.();
    },
    []
  );

  const active = selected || !!data.isSelected;
  const title = (data.label || "Branch").trim();
  const preview = (data.preview || "").trim();
  const messageCount = data.messageCount ?? 0;
  const timeAgo = formatTimeAgo(data.timestamp);
  const branchLabel = data.branchBadge || "01";
  const parentName = (data.parentName || "Main").trim();
  const parentDisplay =
    parentName.length > 20 ? parentName.slice(0, 18) + "…" : parentName;

  return (
    <NodeCard active={active} accent="amber" width={280} onClick={handleClick}>
      <div className="relative px-4 py-3.5 pl-5">
        {/* Type label + parent */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <span
            className="atelier-type-label"
            data-accent="amber"
            style={{
              fontFamily: "var(--at-font-serif)",
              fontStyle: "italic",
              fontSize: 11,
              color: "var(--at-amber)",
            }}
          >
            Branch · {branchLabel}
          </span>
          <span
            className="truncate"
            style={{
              fontFamily: "var(--at-font-sans)",
              fontSize: 10.5,
              color: "var(--at-ink-muted)",
              maxWidth: 130,
            }}
            title={`from ${parentName}`}
          >
            ↳ from {parentDisplay}
          </span>
        </div>

        {/* Title */}
        <h3
          className="leading-[1.3] tracking-[-0.005em]"
          style={{
            fontFamily: "var(--at-font-serif)",
            fontWeight: 400,
            fontSize: 16,
            color: "var(--at-ink)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {title}
        </h3>

        {/* Preview */}
        {preview && (
          <p
            className="mt-1.5 leading-[1.55]"
            style={{
              fontFamily: "var(--at-font-sans)",
              fontSize: 12.5,
              color: "var(--at-ink-soft)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {preview}
          </p>
        )}

        {/* Meta row */}
        <div className="mt-3 flex items-center justify-between gap-2">
          {data.model && (
            <span
              className="atelier-chip"
              data-accent="moss"
              style={{
                fontFamily: "var(--at-font-mono)",
                fontSize: 10,
                padding: "2px 6px",
              }}
              title={`Model: ${data.model}`}
            >
              {data.model.length > 18 ? data.model.slice(0, 16) + "…" : data.model}
            </span>
          )}

          <div
            className="flex items-center gap-1.5"
            style={{
              fontFamily: "var(--at-font-mono)",
              fontSize: 10,
              color: "var(--at-ink-muted)",
            }}
          >
            {messageCount > 0 && <span>{messageCount} msg{messageCount !== 1 ? "s" : ""}</span>}
            {(data.branchCount ?? 0) > 0 && (
              <>
                <span style={{ color: "var(--at-paper-edge)" }}>·</span>
                <span className="inline-flex items-center gap-0.5">
                  <GitBranch size={9} />
                  {data.branchCount}
                </span>
              </>
            )}
            {timeAgo && (
              <>
                <span style={{ color: "var(--at-paper-edge)" }}>·</span>
                <span>{timeAgo}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={stop(data.onDelete)}
        className="absolute -top-2 -right-2 hidden h-6 w-6 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:flex group-hover:opacity-100"
        style={{
          background: "var(--at-paper)",
          border: "1px solid var(--at-paper-edge)",
          color: "var(--at-ink-muted)",
          boxShadow: "var(--at-shadow-md)",
        }}
        aria-label="Delete branch"
      >
        <XIcon size={11} />
      </button>

      {/* Handles */}
      <Handle type="target" position={Position.Top} className={handleClassName(active, "amber")} style={{ borderColor: "var(--at-amber)" }} />
      <Handle type="target" position={Position.Left} className={handleClassName(active, "amber")} style={{ borderColor: "var(--at-amber)" }} />
      <Handle type="source" position={Position.Bottom} className={handleClassName(active, "amber")} style={{ borderColor: "var(--at-amber)" }} />
      <Handle type="source" position={Position.Right} className={handleClassName(active, "amber")} style={{ borderColor: "var(--at-amber)" }} />
    </NodeCard>
  );
}

export const BranchNodeAtelier = memo(BranchNodeComponent);
BranchNodeAtelier.displayName = "BranchNodeAtelier";

/* ═══════════════════════════════════════════════════════════════════════
   CONTEXT NODE — Reference
   ═══════════════════════════════════════════════════════════════════════ */

export interface ContextNodeData extends BaseNodeData {
  content?: string;
  fileName?: string;
  fileType?: "pdf" | "doc" | "text" | "image" | "link";
  pages?: number;
  tokenCount?: number;
  loading?: boolean;
  error?: string;
}

type ContextNodeType = Node<ContextNodeData, "context">;

function ContextNodeComponent({ data, selected }: NodeProps<ContextNodeType>) {
  const handleClick = useCallback(() => data.onClick?.(), [data]);
  const stop = useCallback(
    (action?: () => void) => (e: MouseEvent) => {
      e.stopPropagation();
      action?.();
    },
    []
  );

  const active = selected || !!data.isSelected;
  const title = (data.fileName || data.label || "Reference").trim();
  const quote = (data.content || data.preview || "").trim();
  const isLoading = !!data.loading;

  return (
    <div
      onClick={handleClick}
      className="group relative cursor-pointer transition-all duration-200 ease-out hover:-translate-y-[1px]"
      style={{ width: 260 }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          background: "var(--at-paper-soft)",
          backgroundImage: `repeating-linear-gradient(
            45deg,
            rgba(67, 56, 202, 0.04) 0px,
            rgba(67, 56, 202, 0.04) 1px,
            transparent 1px,
            transparent 6px
          )`,
          border: "1px solid var(--at-paper-edge)",
          borderRadius: "var(--at-radius-lg)",
          boxShadow: active
            ? "var(--at-shadow-lg), 0 0 0 1.5px var(--at-indigo)"
            : "var(--at-shadow-sm)",
          transition: "box-shadow 200ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* Indigo accent bar */}
        <span
          aria-hidden
          className="absolute left-0 top-0 bottom-0"
          style={{
            width: 2,
            background: "var(--at-indigo)",
            borderRadius: "var(--at-radius-lg) 0 0 var(--at-radius-lg)",
          }}
        />

        <div className="relative px-4 py-3 pl-5">
          {/* Type label */}
          <div className="mb-2">
            <span
              style={{
                fontFamily: "var(--at-font-serif)",
                fontStyle: "italic",
                fontSize: 11,
                color: "var(--at-indigo)",
              }}
            >
              Reference {data.fileType ? ` · ${data.fileType.toUpperCase()}` : ""}
            </span>
          </div>

          {/* Filename row */}
          <div className="flex items-center gap-2 mb-2">
            <FileText
              size={14}
              style={{ color: "var(--at-indigo)", flexShrink: 0 }}
            />
            <span
              className="truncate"
              style={{
                fontFamily: "var(--at-font-sans)",
                fontWeight: 500,
                fontSize: 13,
                color: "var(--at-ink)",
              }}
              title={title}
            >
              {title}
            </span>
          </div>

          {/* Content quote or loading state */}
          {isLoading ? (
            <div className="space-y-1.5">
              <div className="atelier-shimmer h-2.5 w-full rounded" />
              <div className="atelier-shimmer h-2.5 w-4/5 rounded" />
              <div className="atelier-shimmer h-2.5 w-3/5 rounded" />
            </div>
          ) : (
            quote && (
              <p
                className="italic leading-[1.5]"
                style={{
                  fontFamily: "var(--at-font-sans)",
                  fontSize: 12,
                  color: "var(--at-ink-soft)",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                "{quote}"
              </p>
            )
          )}

          {/* Meta */}
          {(data.pages || data.tokenCount) && (
            <div
              className="mt-2.5 flex items-center gap-2"
              style={{
                fontFamily: "var(--at-font-mono)",
                fontSize: 10,
                color: "var(--at-ink-muted)",
              }}
            >
              {data.pages && <span>{data.pages} pages</span>}
              {data.pages && data.tokenCount && (
                <span style={{ color: "var(--at-paper-edge)" }}>·</span>
              )}
              {data.tokenCount && (
                <span>{data.tokenCount.toLocaleString()} tokens</span>
              )}
            </div>
          )}
        </div>

        {/* Error state */}
        {data.error && (
          <div
            className="mx-4 mb-3 px-2.5 py-1.5 rounded text-[11px]"
            style={{
              background: "rgba(180, 47, 47, 0.06)",
              border: "1px solid rgba(180, 47, 47, 0.2)",
              color: "#8A1F1F",
              fontFamily: "var(--at-font-sans)",
            }}
          >
            {data.error}
          </div>
        )}
      </div>

      {/* Delete button */}
      <button
        onClick={stop(data.onDelete)}
        className="absolute -top-2 -right-2 hidden h-6 w-6 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:flex group-hover:opacity-100"
        style={{
          background: "var(--at-paper)",
          border: "1px solid var(--at-paper-edge)",
          color: "var(--at-ink-muted)",
          boxShadow: "var(--at-shadow-md)",
        }}
        aria-label="Delete reference"
      >
        <XIcon size={11} />
      </button>

      {/* Handles */}
      <Handle type="source" position={Position.Bottom} className={handleClassName(active, "indigo")} style={{ borderColor: "var(--at-indigo)" }} />
      <Handle type="source" position={Position.Right} className={handleClassName(active, "indigo")} style={{ borderColor: "var(--at-indigo)" }} />
      <Handle type="target" position={Position.Top} className={handleClassName(active, "indigo")} style={{ borderColor: "var(--at-indigo)" }} />
      <Handle type="target" position={Position.Left} className={handleClassName(active, "indigo")} style={{ borderColor: "var(--at-indigo)" }} />
    </div>
  );
}

export const ContextNodeAtelier = memo(ContextNodeComponent);
ContextNodeAtelier.displayName = "ContextNodeAtelier";
