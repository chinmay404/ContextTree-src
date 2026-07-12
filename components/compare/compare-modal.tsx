"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type UIEvent,
} from "react";
import { Link2, X } from "lucide-react";
import { toast } from "sonner";
import { ModelBadge } from "@/components/model-badge";
import type { CanvasData, ChatMessage, NodeData } from "@/lib/storage";
import { cn } from "@/lib/utils";

// ─── Pure helpers (mirrors canvas.tsx's tolerant message parsing) ──

const textFrom = (c: unknown): string => {
  if (!c) return "";
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    for (const p of c) {
      if (typeof p === "string" && p.trim()) return p.trim();
      if (p && typeof p === "object") {
        const t =
          (p as any)?.text?.value ?? (p as any)?.text ?? (p as any)?.value ?? (p as any)?.content;
        if (typeof t === "string" && t.trim()) return t.trim();
      }
    }
    return "";
  }
  if (typeof c === "object") {
    const t =
      (c as any).text?.value ?? (c as any).text ?? (c as any).value ?? (c as any).content;
    if (typeof t === "string") return t.trim();
  }
  return "";
};

/** Both flat role messages and legacy {user, assistant} turns render. */
const flattenMessages = (msgs: ChatMessage[] | undefined) => {
  if (!msgs?.length) return [] as { id: string; role: string; content: unknown }[];
  const out: { id: string; role: string; content: unknown }[] = [];
  msgs.forEach((m: any, i) => {
    if (!m) return;
    if (typeof m.role === "string") {
      out.push({ id: m.id || `msg-${i}`, role: m.role, content: m.content });
      return;
    }
    const id = m.id || `msg-${i}`;
    if (m.user) out.push({ id: `${id}-user`, role: "user", content: m.user.content });
    if (m.assistant)
      out.push({ id: `${id}-assistant`, role: "assistant", content: m.assistant.content });
  });
  return out;
};

/** Lineage hue: stable hash of the tree root's id → one of 8 CSS vars. */
const lineageColorFor = (nodes: NodeData[], id: string): string => {
  const byId = new Map(nodes.map((n) => [n._id, n]));
  let cur = id;
  const seen = new Set<string>();
  while (!seen.has(cur)) {
    seen.add(cur);
    const pid = byId.get(cur)?.parentNodeId;
    if (!pid || !byId.has(pid)) break;
    cur = pid;
  }
  let sum = 0;
  for (let i = 0; i < cur.length; i++) sum += cur.charCodeAt(i);
  return `var(--lineage-${sum % 8})`;
};

const branchName = (node: NodeData): string =>
  node.name || (node.type === "entry" ? "Base Context" : "Branch");

// ─── Component ───────────────────────────────────────────────

interface CompareModalProps {
  canvasId: string;
  canvas: CanvasData;
  /** 2-3 chat node ids; unknown ids are dropped. */
  nodeIds: string[];
  onClose: () => void;
  /** Close the modal and open this branch in the console. */
  onSelectNode: (node: NodeData) => void;
}

export function CompareModal({
  canvasId,
  canvas,
  nodeIds,
  onClose,
  onSelectNode,
}: CompareModalProps) {
  const branches = useMemo(() => {
    const byId = new Map(canvas.nodes.map((n) => [n._id, n]));
    return nodeIds
      .map((id) => byId.get(id))
      .filter((n): n is NodeData => Boolean(n))
      .slice(0, 3)
      .map((node) => ({
        node,
        messages: flattenMessages(node.chatMessages),
        lineageColor: lineageColorFor(canvas.nodes, node._id),
      }));
  }, [canvas, nodeIds]);

  // Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Optional ratio-based scroll sync (off by default — columns scroll
  // independently unless the user links them).
  const [scrollLinked, setScrollLinked] = useState(false);
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const syncingRef = useRef(false);
  const handleScroll = useCallback(
    (idx: number) => (e: UIEvent<HTMLDivElement>) => {
      if (!scrollLinked || syncingRef.current) return;
      const src = e.currentTarget;
      const srcMax = src.scrollHeight - src.clientHeight;
      if (srcMax <= 0) return;
      const ratio = src.scrollTop / srcMax;
      syncingRef.current = true;
      columnRefs.current.forEach((el, i) => {
        if (!el || i === idx) return;
        const max = el.scrollHeight - el.clientHeight;
        if (max > 0) el.scrollTop = ratio * max;
      });
      requestAnimationFrame(() => {
        syncingRef.current = false;
      });
    },
    [scrollLinked]
  );

  // ─── Promote: winner stays, other compared siblings collapse ──
  // Persists via the same per-node PATCH the rename flow uses; nothing is
  // ever deleted — demoted branches stay on the canvas as restorable pills.
  const promotingRef = useRef(false);
  const promote = useCallback(
    async (winner: NodeData) => {
      if (promotingRef.current) return;
      promotingRef.current = true;

      const losers = branches
        .map((b) => b.node)
        .filter((n) => n._id !== winner._id);

      // Optimistic: canvas.tsx listens for canvas-update-node and re-renders.
      for (const loser of losers) {
        window.dispatchEvent(
          new CustomEvent("canvas-update-node", {
            detail: { nodeId: loser._id, updates: { demoted: true } },
          })
        );
      }
      window.dispatchEvent(
        new CustomEvent("canvas-update-node", {
          detail: { nodeId: winner._id, updates: { demoted: false } },
        })
      );
      onSelectNode(winner); // closes the modal + opens the winner

      const patch = (nodeId: string, demoted: boolean) =>
        fetch(`/api/canvases/${canvasId}/nodes/${nodeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ demoted }),
        }).then((res) => {
          if (!res.ok) throw new Error(`Failed to persist (${res.status})`);
        });

      const writes = losers.map((l) => patch(l._id, true));
      if (winner.demoted) writes.push(patch(winner._id, false));
      const results = await Promise.allSettled(writes);
      promotingRef.current = false;

      if (results.some((r) => r.status === "rejected")) {
        toast.error(
          "Promotion didn't fully save — some branches may reappear on reload"
        );
      } else {
        toast.success(
          `Promoted "${branchName(winner)}" — ${
            losers.length === 1 ? "1 sibling" : `${losers.length} siblings`
          } collapsed`
        );
      }
    },
    [branches, canvasId, onSelectNode]
  );

  if (branches.length < 2) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Compare branches">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Sheet */}
      <div className="absolute inset-4 md:inset-10 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Title bar */}
        <div className="flex h-12 flex-none items-center justify-between border-b border-border px-4">
          <span className="type-ui font-semibold">
            Compare {branches.length} branches
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setScrollLinked((v) => !v)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-lg px-2.5 type-meta transition-colors",
                scrollLinked
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              aria-pressed={scrollLinked}
              title="Scroll all columns together"
            >
              <Link2 size={13} strokeWidth={1.75} />
              Sync scroll
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Close comparison"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Columns */}
        <div className="flex min-h-0 flex-1 divide-x divide-border">
          {branches.map(({ node, messages, lineageColor }, idx) => (
            <div key={node._id} className="flex min-w-0 flex-1 flex-col">
              {/* Branch header — lineage-striped */}
              <div className="relative flex-none border-b border-border px-4 py-3">
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 left-0 w-[3px]"
                  style={{ backgroundColor: lineageColor }}
                />
                <div className="flex items-center gap-2">
                  <span className="type-ui min-w-0 flex-1 truncate font-semibold">
                    {branchName(node)}
                  </span>
                  {node.model && (
                    <ModelBadge
                      modelId={node.model}
                      size="sm"
                      className="max-w-[130px] shrink-0 !shadow-none"
                    />
                  )}
                </div>
                <div className="type-meta mt-0.5 text-muted-foreground">
                  {messages.length === 1 ? "1 message" : `${messages.length} messages`}
                  {node.demoted && (
                    <span className="ml-1.5 rounded-full border border-border bg-secondary px-1.5 py-px">
                      demoted
                    </span>
                  )}
                </div>
              </div>

              {/* Messages — this branch's fork-scoped conversation only */}
              <div
                ref={(el) => {
                  columnRefs.current[idx] = el;
                }}
                onScroll={handleScroll(idx)}
                className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3"
              >
                {messages.length === 0 ? (
                  <p className="type-meta text-muted-foreground">No messages yet.</p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id}>
                      <div className="type-meta mb-1 text-muted-foreground">
                        {m.role === "user" ? "You" : "Assistant"}
                      </div>
                      <div className="type-body whitespace-pre-wrap break-words text-foreground">
                        {textFrom(m.content)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer actions */}
              <div className="flex flex-none items-center gap-2 border-t border-border px-4 py-3">
                <button
                  type="button"
                  onClick={() => onSelectNode(node)}
                  className="flex-1 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Continue this one
                </button>
                <button
                  type="button"
                  onClick={() => promote(node)}
                  className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Promote
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
