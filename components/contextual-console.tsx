"use client";

import {
  useState,
  useEffect,
  useRef,
  memo,
  useCallback,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  X,
  Maximize2,
  Minimize2,
  GitBranch,
  ArrowDown,
  Copy,
  Check,
  ArrowRight,
  Edit2,
  ChevronRight,
  MessageSquareDashed,
  Send,
} from "lucide-react";
import { storageService } from "@/lib/storage";
import { toast } from "@/hooks/use-toast";
import { getDefaultModel } from "@/lib/models";
import { deriveNodeNameFromPrompt } from "@/lib/utils";
import { ModelBadge, ModelProviderIcon } from "@/components/model-badge";
import { ModelSelectionPanel } from "@/components/model-selection-panel";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";

// ─── Types ──────────────────────────────────────────────────
interface ChatPanelProps {
  selectedNode: string | null;
  selectedNodeName?: string;
  onClose?: () => void;
  selectedCanvas?: string | null;
  isFullscreen?: boolean;
  isCollapsed?: boolean;
  onToggleFullscreen?: () => void;
  onNodeSelect?: (nodeId: string, nodeName?: string, nodeType?: string) => void;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// ─── Helpers ────────────────────────────────────────────────
const ASSISTANT_ID_SUFFIXES = ["_assistant", "-assistant", "_ai", "_a", "-a"];
const USER_ID_SUFFIXES = ["_user", "-user", "_u", "-u"];

const splitMessageId = (id?: string | null) => {
  let value = (id || "").trim();
  let role: "user" | "assistant" = "user";

  let changed = true;
  while (changed && value) {
    changed = false;

    for (const suffix of ASSISTANT_ID_SUFFIXES) {
      if (value.endsWith(suffix)) {
        role = "assistant";
        value = value.slice(0, -suffix.length);
        changed = true;
        break;
      }
    }

    if (changed) continue;

    for (const suffix of USER_ID_SUFFIXES) {
      if (value.endsWith(suffix)) {
        value = value.slice(0, -suffix.length);
        changed = true;
        break;
      }
    }
  }

  return { baseId: value, role };
};

const normalizeForkId = (id?: string | null) => {
  const { baseId, role } = splitMessageId(id);
  return baseId ? (role === "assistant" ? `${baseId}_ai` : baseId) : "";
};

const genId = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const dedupeMessages = (items: Message[]): Message[] => {
  const byId = new Map<string, Message>();
  for (const item of items) {
    byId.set(item.id, item);
  }
  return Array.from(byId.values()).sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );
};

const normalizeMessages = (raw: any[], nodeId: string): Message[] =>
  dedupeMessages(
    raw.flatMap((msg: any, idx: number) => {
      if (msg.user || msg.assistant) {
        const parts: Message[] = [];
        const baseId = msg.id || `msg-${idx}-${nodeId}`;
        if (msg.user) {
          parts.push({
            id: baseId,
            role: "user",
            content: msg.user.content,
            timestamp: msg.user.timestamp
              ? new Date(msg.user.timestamp)
              : new Date(),
          });
        }
        if (msg.assistant) {
          parts.push({
            id: `${baseId}_ai`,
            role: "assistant",
            content: msg.assistant.content,
            timestamp: msg.assistant.timestamp
              ? new Date(msg.assistant.timestamp)
              : new Date(),
          });
        }
        return parts;
      }
      return [
        {
          id: (() => {
            const rawId = msg.id || `msg-${idx}-${nodeId}`;
            const { baseId, role } = splitMessageId(rawId);
            return baseId
              ? role === "assistant"
                ? `${baseId}_ai`
                : baseId
              : rawId;
          })(),
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        },
      ];
    })
  );

const extractMessages = (node: any): any[] => {
  if (Array.isArray(node?.chatMessages)) return node.chatMessages;
  if (Array.isArray(node?.data?.chatMessages)) return node.data.chatMessages;
  if (Array.isArray(node?.data?.data?.chatMessages))
    return node.data.data.chatMessages;
  return [];
};

// ─── Thinking block parser ──────────────────────────────────
const parseThinking = (content: string) => {
  const regex = /<think>([\s\S]*?)<\/think>/g;
  const parts: { type: "text" | "thinking"; content: string }[] = [];
  let last = 0;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > last)
      parts.push({ type: "text", content: content.slice(last, match.index) });
    parts.push({ type: "thinking", content: match[1].trim() });
    last = match.index + match[0].length;
  }
  if (last < content.length)
    parts.push({ type: "text", content: content.slice(last) });
  return parts.length ? parts : [{ type: "text" as const, content }];
};

// ─── Hoisted subcomponents (DO NOT inline back into render) ─
// Defining these at module scope keeps their component identity stable across
// renders so React.memo actually works — otherwise every render creates a new
// component type and we tear down + rebuild every message row.

type MessageItemProps = {
  message: Message;
  isUser: boolean;
  activeModelId: string;
  forkedNodes: Array<{ _id: string; name?: string; type?: string }>;
  onStartFork: (messageId: string) => void;
  onSelectForkedNode: (nodeId: string, nodeName?: string, nodeType?: string) => void;
};

const MessageItem = memo(function MessageItem({
  message,
  isUser,
  activeModelId,
  forkedNodes,
  onStartFork,
  onSelectForkedNode,
}: MessageItemProps) {
  const [copied, setCopied] = useState(false);

  return (
    <div
      className={`group px-5 py-4 ${isUser ? "" : "bg-[var(--at-paper-soft)]/40"} border-b last:border-0`}
      style={{ borderColor: "var(--at-paper-edge)" }}
    >
      <div className="flex gap-3 max-w-3xl mx-auto">
        <div className="flex-shrink-0 pt-0.5">
          {isUser ? (
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center"
              style={{ background: "var(--at-moss-tint)", color: "var(--at-moss)" }}
            >
              <User size={14} />
            </div>
          ) : (
            <ModelProviderIcon
              modelId={activeModelId}
              size={28}
              className="rounded-full"
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--at-ink)", fontFamily: "var(--at-font-sans)" }}
            >
              {isUser ? "You" : "Assistant"}
            </span>
            <span
              className="text-[10px]"
              style={{ fontFamily: "var(--at-font-mono)", color: "var(--at-ink-faint)" }}
            >
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!isUser && (
                <button
                  onClick={() => onStartFork(message.id)}
                  className="atelier-button"
                  data-variant="ghost"
                  style={{ padding: "3px 8px", fontSize: 10.5, height: 22 }}
                >
                  <GitBranch size={10} /> Fork
                </button>
              )}
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(message.content);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="atelier-button"
                data-variant="ghost"
                style={{ padding: 0, width: 22, height: 22 }}
              >
                {copied ? <Check size={10} /> : <Copy size={10} />}
              </button>
            </div>
          </div>

          <div
            className="leading-relaxed"
            style={{
              fontFamily: "var(--at-font-sans)",
              fontSize: 14.5,
              color: "var(--at-ink)",
            }}
          >
            {isUser ? (
              <div className="whitespace-pre-wrap">{message.content}</div>
            ) : (
              <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:rounded-lg prose-code:before:content-none prose-code:after:content-none"
                style={{ color: "var(--at-ink)" }}
              >
                {parseThinking(message.content).map((part, i) => (
                  <div key={i}>
                    {part.type === "thinking" ? (
                      <details className="mb-3 rounded-lg px-3 py-2 text-sm"
                        style={{
                          border: "1px solid var(--at-amber-tint)",
                          background: "var(--at-amber-tint)",
                        }}
                      >
                        <summary className="cursor-pointer text-xs font-medium"
                          style={{ color: "var(--at-amber)", fontFamily: "var(--at-font-serif)", fontStyle: "italic" }}
                        >
                          Thinking
                        </summary>
                        <div className="mt-2 pl-3 italic whitespace-pre-wrap text-xs"
                          style={{ borderLeft: "2px solid var(--at-amber-soft)", color: "var(--at-ink-soft)" }}
                        >
                          {part.content}
                        </div>
                      </details>
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                          p: ({ children }) => (
                            <p className="mb-3 last:mb-0">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc pl-5 mb-3 space-y-1"
                              style={{ "--tw-prose-bullets": "var(--at-amber)" } as any}
                            >
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal pl-5 mb-3 space-y-1">
                              {children}
                            </ol>
                          ),
                          h1: ({ children }) => (
                            <h1 className="mb-3 mt-5 first:mt-0"
                              style={{
                                fontFamily: "var(--at-font-serif)",
                                fontWeight: 500,
                                fontSize: 20,
                                letterSpacing: "-0.01em",
                                color: "var(--at-ink)",
                              }}
                            >
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="mb-2 mt-5"
                              style={{
                                fontFamily: "var(--at-font-serif)",
                                fontWeight: 500,
                                fontSize: 17,
                                color: "var(--at-ink)",
                              }}
                            >
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="mb-2 mt-4"
                              style={{
                                fontFamily: "var(--at-font-serif)",
                                fontWeight: 500,
                                fontSize: 15,
                                color: "var(--at-ink)",
                              }}
                            >
                              {children}
                            </h3>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote
                              className="pl-3 italic my-3"
                              style={{
                                borderLeft: "2px solid var(--at-amber)",
                                color: "var(--at-ink-soft)",
                              }}
                            >
                              {children}
                            </blockquote>
                          ),
                          code: ({ children, className }) => {
                            if (!className)
                              return (
                                <code
                                  style={{
                                    background: "var(--at-paper)",
                                    color: "var(--at-ink-soft)",
                                    padding: "1px 5px",
                                    borderRadius: 4,
                                    fontFamily: "var(--at-font-mono)",
                                    fontSize: 12.5,
                                  }}
                                >
                                  {children}
                                </code>
                              );
                            return (
                              <code
                                className={className}
                                style={{ fontFamily: "var(--at-font-mono)", fontSize: 12.5 }}
                              >
                                {children}
                              </code>
                            );
                          },
                          pre: ({ children }) => (
                            <div className="relative my-4">
                              <pre
                                style={{
                                  background: "var(--at-ink)",
                                  color: "var(--at-paper)",
                                  padding: "14px 16px",
                                  borderRadius: 8,
                                  overflowX: "auto",
                                  fontSize: 12.5,
                                  fontFamily: "var(--at-font-mono)",
                                  lineHeight: 1.55,
                                }}
                              >
                                {children}
                              </pre>
                            </div>
                          ),
                          table: ({ children }) => (
                            <div
                              className="overflow-x-auto my-4 rounded-lg"
                              style={{ border: "1px solid var(--at-paper-edge)" }}
                            >
                              <table className="w-full text-sm">{children}</table>
                            </div>
                          ),
                          th: ({ children }) => (
                            <th
                              className="px-3 py-2 text-left text-xs font-semibold"
                              style={{
                                background: "var(--at-paper-soft)",
                                color: "var(--at-ink-muted)",
                                borderBottom: "1px solid var(--at-paper-edge)",
                              }}
                            >
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td
                              className="px-3 py-2"
                              style={{
                                color: "var(--at-ink-soft)",
                                borderBottom: "1px solid var(--at-paper-edge)",
                              }}
                            >
                              {children}
                            </td>
                          ),
                          a: ({ children, href }) => (
                            <a
                              href={href}
                              style={{
                                color: "var(--at-moss)",
                                textDecoration: "underline",
                                textDecorationColor: "var(--at-moss-soft)",
                                textUnderlineOffset: 3,
                              }}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {part.content}
                      </ReactMarkdown>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {forkedNodes.length > 0 && (
            <div
              className="mt-2 flex flex-wrap items-center gap-1.5"
              style={{
                fontFamily: "var(--at-font-sans)",
                fontSize: 11,
                color: "var(--at-ink-muted)",
              }}
            >
              <GitBranch size={10} style={{ color: "var(--at-amber)" }} />
              {forkedNodes.map((n) => (
                <button
                  key={n._id}
                  onClick={() => onSelectForkedNode(n._id, n.name, n.type)}
                  className="atelier-chip"
                  data-accent="amber"
                  style={{ cursor: "pointer", fontSize: 10.5 }}
                >
                  {n.name || "Branch"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}, (prev, next) =>
  prev.message.id === next.message.id &&
  prev.message.content === next.message.content &&
  prev.activeModelId === next.activeModelId &&
  prev.forkedNodes.length === next.forkedNodes.length &&
  prev.forkedNodes.every((n, i) => n._id === next.forkedNodes[i]?._id)
);

const TypingIndicator = memo(function TypingIndicator({
  activeModelId,
}: {
  activeModelId: string;
}) {
  return (
    <div
      className="px-5 py-4"
      style={{ background: "var(--at-paper-soft)", borderBottom: "1px solid var(--at-paper-edge)" }}
    >
      <div className="flex gap-3 max-w-3xl mx-auto">
        <ModelProviderIcon
          modelId={activeModelId}
          size={28}
          className="rounded-full flex-shrink-0"
        />
        <div className="pt-2 atelier-streaming">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
});

type ForkDialogProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: (model: string) => void;
};

const ForkDialog = memo(function ForkDialog({
  open,
  onCancel,
  onConfirm,
}: ForkDialogProps) {
  const [model, setModel] = useState(getDefaultModel());
  useEffect(() => {
    if (open) setModel(getDefaultModel());
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(10,14,26,0.4)] backdrop-blur-sm">
      <div
        className="w-full max-w-md mx-4 p-5"
        style={{
          background: "var(--at-paper)",
          border: "1px solid var(--at-paper-edge)",
          borderRadius: "var(--at-radius-xl)",
          boxShadow: "var(--at-shadow-lg)",
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div
              style={{
                fontFamily: "var(--at-font-serif)",
                fontStyle: "italic",
                fontSize: 11,
                color: "var(--at-amber)",
                letterSpacing: "0.02em",
              }}
            >
              Fork · new branch
            </div>
            <h3
              className="flex items-center gap-2 mt-1"
              style={{
                fontFamily: "var(--at-font-serif)",
                fontWeight: 500,
                fontSize: 20,
                color: "var(--at-ink)",
                letterSpacing: "-0.01em",
              }}
            >
              <GitBranch size={18} style={{ color: "var(--at-amber)" }} />
              Branch the conversation
            </h3>
            <p
              className="mt-1"
              style={{
                fontFamily: "var(--at-font-sans)",
                fontSize: 13,
                color: "var(--at-ink-muted)",
              }}
            >
              Choose a model for the new thread.
            </p>
          </div>
          <button onClick={onCancel} className="atelier-button" data-variant="ghost"
            style={{ padding: 0, width: 32, height: 32 }}
          >
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[56vh] overflow-y-auto mb-4 pr-1">
          <ModelSelectionPanel selectedModel={model} onSelect={setModel} />
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="atelier-button flex-1" style={{ justifyContent: "center" }}>
            Cancel
          </button>
          <button
            onClick={() => onConfirm(model)}
            className="atelier-button flex-1"
            data-variant="primary"
            style={{ justifyContent: "center" }}
          >
            Create Branch
          </button>
        </div>
      </div>
    </div>
  );
});

// ─── Main component ─────────────────────────────────────────
const ContextualConsole = ({
  selectedNode,
  selectedNodeName,
  onClose,
  selectedCanvas,
  isFullscreen = false,
  onToggleFullscreen,
  onNodeSelect,
}: ChatPanelProps) => {
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [canvasData, setCanvasData] = useState<any>(null);
  const [showForkDialog, setShowForkDialog] = useState(false);
  const [pendingForkMsg, setPendingForkMsg] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nodeLineage, setNodeLineage] = useState<{ id: string; name: string }[]>([]);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nearBottomRef = useRef(true);
  // Race-control: one token per selectedNode load, abort the previous.
  const loadTokenRef = useRef(0);

  const currentMessages = useMemo(
    () => (selectedNode ? messages[selectedNode] || [] : []),
    [selectedNode, messages]
  );

  const resolvedName = useMemo(() => {
    if (!selectedNode || !canvasData?.nodes) return selectedNodeName;
    const node = canvasData.nodes.find((n: any) => n._id === selectedNode);
    return node?.name || selectedNodeName;
  }, [selectedNode, selectedNodeName, canvasData]);

  // ─── Combined canvas + messages fetch ──────────────────
  // Previously this component fired TWO independent fetches for the same
  // canvas on every selection change — one for canvas metadata and one for
  // messages. We now fetch once per (canvas, node) pair with an abort
  // controller and a token guard so late responses never clobber newer state.
  useEffect(() => {
    if (!selectedCanvas || !selectedNode) {
      setIsLoadingMessages(false);
      return;
    }

    const token = ++loadTokenRef.current;
    const controller = new AbortController();

    // Show cached messages instantly if available — avoids "blank chat" flicker.
    const cached = storageService.getNodeMessages(selectedCanvas, selectedNode);
    if (cached?.length) {
      setMessages((p) =>
        p[selectedNode]?.length
          ? p
          : { ...p, [selectedNode]: normalizeMessages(cached, selectedNode) }
      );
    }
    setIsLoadingMessages(true);

    (async () => {
      try {
        const res = await fetch(`/api/canvases/${selectedCanvas}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (loadTokenRef.current !== token) return;

        setCanvasData(data.canvas);
        const node = data.canvas?.nodes?.find(
          (n: any) => n._id === selectedNode
        );

        let processed = normalizeMessages(extractMessages(node), selectedNode);
        if (!processed.length) {
          const local = storageService.getNodeMessages(
            selectedCanvas,
            selectedNode
          );
          if (local.length)
            processed = normalizeMessages(local, selectedNode);
        }
        if (loadTokenRef.current !== token) return;
        setMessages((p) => ({ ...p, [selectedNode]: processed }));
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        // Fall back to local cache on network error
        const local = storageService.getNodeMessages(
          selectedCanvas,
          selectedNode
        );
        if (local.length && loadTokenRef.current === token) {
          setMessages((p) => ({
            ...p,
            [selectedNode]: normalizeMessages(local, selectedNode),
          }));
        }
      } finally {
        if (loadTokenRef.current === token) setIsLoadingMessages(false);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [selectedCanvas, selectedNode]);

  // ─── Build lineage ──────────────────────────────────────
  useEffect(() => {
    if (!selectedNode || !canvasData?.nodes) {
      setNodeLineage([]);
      return;
    }
    const lineage: { id: string; name: string }[] = [];
    let cur: string | undefined = selectedNode;
    const visited = new Set<string>();
    while (cur && !visited.has(cur)) {
      visited.add(cur);
      const node = canvasData.nodes.find((n: any) => n._id === cur);
      if (node) {
        lineage.unshift({
          id: node._id,
          name: node.name || `Node ${node._id.slice(-6)}`,
        });
        cur = node.parentNodeId;
      } else break;
    }
    setNodeLineage(lineage);
  }, [selectedNode, canvasData]);

  // ─── Sync name input ───────────────────────────────────
  useEffect(() => {
    if (!isEditingName) setNameInput(resolvedName || "");
  }, [resolvedName, isEditingName]);

  // ─── Save name ─────────────────────────────────────────
  const saveName = useCallback(async () => {
    if (!selectedNode || !selectedCanvas) return;
    const name = nameInput.trim();
    if (!name || name === resolvedName) {
      setIsEditingName(false);
      return;
    }
    setIsEditingName(false);
    setCanvasData((p: any) =>
      p
        ? {
            ...p,
            nodes: p.nodes.map((n: any) =>
              n._id === selectedNode ? { ...n, name } : n
            ),
          }
        : p
    );
    window.dispatchEvent(
      new CustomEvent("canvas-update-node", {
        detail: { nodeId: selectedNode, updates: { name } },
      })
    );
    window.dispatchEvent(
      new CustomEvent("canvas-node-renamed", {
        detail: { nodeId: selectedNode, name },
      })
    );
    try {
      await fetch(
        `/api/canvases/${selectedCanvas}/nodes/${selectedNode}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }
      );
    } catch {
      toast({
        title: "Error",
        description: "Failed to save name",
        variant: "destructive",
      });
    }
  }, [selectedNode, selectedCanvas, nameInput, resolvedName]);

  // ─── Listen for renames from canvas ────────────────────
  useEffect(() => {
    const handler = (e: any) => {
      const { nodeId, name } = e.detail || {};
      if (!nodeId || !name) return;
      setCanvasData((p: any) =>
        p
          ? {
              ...p,
              nodes: p.nodes.map((n: any) =>
                n._id === nodeId ? { ...n, name } : n
              ),
            }
          : p
      );
    };
    window.addEventListener("canvas-node-renamed", handler);
    return () => window.removeEventListener("canvas-node-renamed", handler);
  }, []);

  // ─── Scroll management ─────────────────────────────────
  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      const vp = scrollRef.current;
      if (!vp) return;
      vp.scrollTo({ top: vp.scrollHeight, behavior });
    },
    []
  );

  useEffect(() => {
    if (nearBottomRef.current)
      scrollToBottom(currentMessages.length > 0 ? "smooth" : "auto");
  }, [currentMessages.length, scrollToBottom]);

  useEffect(() => {
    nearBottomRef.current = true;
    setShowScrollBtn(false);
  }, [selectedNode]);

  useEffect(() => {
    const vp = scrollRef.current;
    if (!vp) return;
    const handler = () => {
      const atBottom =
        vp.scrollHeight - (vp.scrollTop + vp.clientHeight) <= 80;
      nearBottomRef.current = atBottom;
      setShowScrollBtn(!atBottom && currentMessages.length > 0);
    };
    vp.addEventListener("scroll", handler, { passive: true });
    return () => vp.removeEventListener("scroll", handler);
  }, [currentMessages.length]);

  // ─── Get node model ────────────────────────────────────
  const getNodeModel = useCallback(
    (nodeId: string): string => {
      const node = canvasData?.nodes?.find((n: any) => n._id === nodeId);
      return node?.model || getDefaultModel();
    },
    [canvasData]
  );
  const activeModelId = useMemo(
    () => (selectedNode ? getNodeModel(selectedNode) : getDefaultModel()),
    [getNodeModel, selectedNode]
  );

  // ─── Auto resize textarea ─────────────────────────────
  const autoResize = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, []);

  // ─── Send message ──────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || !selectedNode || !selectedCanvas) return;

    const nodeId = selectedNode;
    const canvasId = selectedCanvas;

    const userMsg: Message = {
      id: genId(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };
    const updatedMsgs = dedupeMessages([...currentMessages, userMsg]);
    setMessages((p) => ({ ...p, [nodeId]: updatedMsgs }));

    // Auto-name the node the first time it gets a real user message. We only
    // overwrite generic defaults ("New Branch", "Branch from …", "Untitled")
    // so a name the user typed manually is never clobbered.
    const isFirstUserMessage = currentMessages.every((m) => m.role !== "user");
    if (isFirstUserMessage) {
      const current = (resolvedName || "").trim();
      const isGeneric =
        !current ||
        /^(untitled|new branch|branch|base context|branch from\b)/i.test(current);
      if (isGeneric) {
        const derived = deriveNodeNameFromPrompt(userMsg.content);
        if (derived && derived !== current) {
          // Optimistic in-memory update
          setCanvasData((p: any) =>
            p
              ? {
                  ...p,
                  nodes: p.nodes.map((n: any) =>
                    n._id === nodeId ? { ...n, name: derived } : n
                  ),
                }
              : p
          );
          window.dispatchEvent(
            new CustomEvent("canvas-update-node", {
              detail: { nodeId, updates: { name: derived } },
            })
          );
          window.dispatchEvent(
            new CustomEvent("canvas-node-renamed", {
              detail: { nodeId, name: derived },
            })
          );
          fetch(`/api/canvases/${canvasId}/nodes/${nodeId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: derived }),
          }).catch(() => {});
        }
      }
    }

    storageService.saveNodeMessages(
      canvasId,
      nodeId,
      updatedMsgs.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
      }))
    );

    setInputValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsTyping(true);

    fetch(`/api/canvases/${canvasId}/nodes/${nodeId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: userMsg.id,
        role: userMsg.role,
        content: userMsg.content,
        timestamp: userMsg.timestamp.toISOString(),
      }),
    }).catch(() => {});

    try {
      let model = getNodeModel(nodeId);
      if (!model || model === "None") model = getDefaultModel();

      const currentNode = canvasData?.nodes?.find(
        (n: any) => n._id === nodeId
      );
      const res = await fetch("/api/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canvasId,
          nodeId,
          model,
          message_id: userMsg.id,
          message: userMsg.content,
          parentNodeId: currentNode?.parentNodeId || null,
          forkedFromMessageId: currentNode?.forkedFromMessageId || null,
          isPrimary: currentNode?.primary || false,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error (${res.status})`);
      }

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream") && res.body) {
        const botMsgId = `${userMsg.id}_ai`;
        const botTimestamp = new Date();
        let fullContent = "";
        let summary: string | undefined;
        let firstToken = true;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const data = trimmed.slice(5).trim();
              if (!data || data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.error) throw new Error(parsed.error);

                if (parsed.summary && typeof parsed.summary === "string") {
                  summary = parsed.summary;
                }

                const chunk = parsed.message || parsed.delta || "";
                if (chunk) {
                  fullContent += chunk;

                  if (firstToken) {
                    firstToken = false;
                    setIsTyping(false);
                  }

                  setMessages((p) => ({
                    ...p,
                    [nodeId]: dedupeMessages([
                      ...updatedMsgs,
                      {
                        id: botMsgId,
                        role: "assistant" as const,
                        content: fullContent,
                        timestamp: botTimestamp,
                      },
                    ]),
                  }));
                }
              } catch (parseErr) {
                if (
                  parseErr instanceof Error &&
                  parseErr.message !== "Unexpected end of JSON input"
                ) {
                  throw parseErr;
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        if (!fullContent) throw new Error("No response received from model");

        const botMsg: Message = {
          id: botMsgId,
          role: "assistant",
          content: fullContent,
          timestamp: botTimestamp,
        };
        const allMsgs = dedupeMessages([...updatedMsgs, botMsg]);
        setMessages((p) => ({ ...p, [nodeId]: allMsgs }));
        storageService.saveNodeMessages(
          canvasId,
          nodeId,
          allMsgs.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp.toISOString(),
          }))
        );

        if (summary && canvasData) {
          window.dispatchEvent(
            new CustomEvent("canvas-data-updated", {
              detail: {
                ...canvasData,
                nodes: canvasData.nodes.map((n: any) =>
                  n._id === nodeId ? { ...n, runningSummary: summary } : n
                ),
              },
            })
          );
        }

        fetch(`/api/canvases/${canvasId}/nodes/${nodeId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: botMsg.id,
            role: botMsg.role,
            content: botMsg.content,
            timestamp: botMsg.timestamp.toISOString(),
          }),
        }).catch(() => {});

        return;
      }

      const data = await res.json();
      const botMsg: Message = {
        id: `${userMsg.id}_ai`,
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
      };
      const allMsgs = dedupeMessages([...updatedMsgs, botMsg]);
      setMessages((p) => ({ ...p, [nodeId]: allMsgs }));
      storageService.saveNodeMessages(
        canvasId,
        nodeId,
        allMsgs.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString(),
        }))
      );

      if (data.summary && canvasData) {
        window.dispatchEvent(
          new CustomEvent("canvas-data-updated", {
            detail: {
              ...canvasData,
              nodes: canvasData.nodes.map((n: any) =>
                n._id === nodeId ? { ...n, runningSummary: data.summary } : n
              ),
            },
          })
        );
      }

      fetch(`/api/canvases/${canvasId}/nodes/${nodeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: botMsg.id,
          role: botMsg.role,
          content: botMsg.content,
          timestamp: botMsg.timestamp.toISOString(),
        }),
      }).catch(() => {});
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to respond";
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
      const errorMsg: Message = {
        id: genId(),
        role: "assistant",
        content: `Sorry, I couldn't respond. ${msg}`,
        timestamp: new Date(),
      };
      setMessages((p) => ({
        ...p,
        [nodeId]: [...(p[nodeId] || []), errorMsg],
      }));
    } finally {
      setIsTyping(false);
    }
  }, [
    inputValue,
    selectedNode,
    selectedCanvas,
    currentMessages,
    getNodeModel,
    canvasData,
  ]);

  // ─── Fork / branch ─────────────────────────────────────
  const getForkedNodes = useCallback(
    (messageId: string) => {
      if (!canvasData?.nodes) return [];
      const normalized = normalizeForkId(messageId);
      return canvasData.nodes.filter(
        (n: any) =>
          normalizeForkId(n.forkedFromMessageId) === normalized && normalized
      );
    },
    [canvasData]
  );

  const createFork = useCallback(
    async (model: string, overrideId?: string) => {
      const forkId = normalizeForkId(overrideId || pendingForkMsg);
      if (!selectedCanvas || !selectedNode || !forkId) return;

      const nodeId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const sourceName = resolvedName || "Parent";
      const newNode = {
        _id: nodeId,
        name: `Branch from ${sourceName.slice(0, 15)}`,
        primary: false,
        type: "branch",
        chatMessages: [],
        runningSummary: "",
        contextContract: "",
        model,
        parentNodeId: selectedNode,
        forkedFromMessageId: forkId,
        createdAt: new Date().toISOString(),
        position: { x: 300 + Math.random() * 150, y: 200 + Math.random() * 150 },
      };
      const edgeId = `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const edge = {
        _id: edgeId,
        from: selectedNode,
        to: nodeId,
        createdAt: new Date().toISOString(),
        meta: { condition: "Fork" },
      };

      if (canvasData)
        setCanvasData((p: any) => ({ ...p, nodes: [...(p?.nodes || []), newNode] }));
      window.dispatchEvent(
        new CustomEvent("canvas-fork-node", {
          detail: { canvasId: selectedCanvas, node: newNode, edge },
        })
      );

      fetch(`/api/canvases/${selectedCanvas}/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNode),
      }).catch(() => {});
      fetch(`/api/canvases/${selectedCanvas}/edges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edge),
      }).catch(() => {});
      window.dispatchEvent(
        new CustomEvent("canvas-select-node", { detail: { nodeId } })
      );
    },
    [selectedCanvas, selectedNode, pendingForkMsg, resolvedName, canvasData]
  );

  const handleStartFork = useCallback((messageId: string) => {
    setPendingForkMsg(normalizeForkId(messageId));
    setShowForkDialog(true);
  }, []);

  const handleSelectForkedNode = useCallback(
    (nodeId: string, nodeName?: string, nodeType?: string) => {
      onNodeSelect?.(nodeId, nodeName, nodeType);
    },
    [onNodeSelect]
  );

  // ─── Keyboard ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isFullscreen && onToggleFullscreen) onToggleFullscreen();
        else onClose?.();
      }
    };
    if (selectedNode) {
      document.addEventListener("keydown", handler);
      return () => document.removeEventListener("keydown", handler);
    }
  }, [selectedNode, isFullscreen, onToggleFullscreen, onClose]);

  // ─── Render ────────────────────────────────────────────
  return (
    <>
      <ForkDialog
        open={showForkDialog}
        onCancel={() => {
          setShowForkDialog(false);
          setPendingForkMsg(null);
        }}
        onConfirm={(model) => {
          createFork(model);
          setShowForkDialog(false);
          setPendingForkMsg(null);
        }}
      />
      <div
        className="flex flex-col h-full w-full relative"
        style={{
          background: "var(--at-paper-soft)",
          borderLeft: "1px solid var(--at-paper-edge)",
          fontFamily: "var(--at-font-sans)",
        }}
      >
        {/* Header */}
        <div
          className="flex-none z-10"
          style={{ borderBottom: "1px solid var(--at-paper-edge)", background: "var(--at-paper-soft)" }}
        >
          <div className="px-5 py-3 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div
                style={{
                  fontFamily: "var(--at-font-serif)",
                  fontStyle: "italic",
                  fontSize: 11,
                  color: "var(--at-ink-muted)",
                  letterSpacing: "0.02em",
                }}
              >
                Conversing with
              </div>

              {nodeLineage.length > 1 && (
                <div
                  className="mt-0.5 flex flex-wrap items-center gap-0.5"
                  style={{
                    fontFamily: "var(--at-font-mono)",
                    fontSize: 10,
                    color: "var(--at-ink-muted)",
                  }}
                >
                  {nodeLineage.slice(0, -1).map((n) => (
                    <span key={n.id} className="flex items-center gap-0.5">
                      <button
                        onClick={() => onNodeSelect?.(n.id, n.name)}
                        className="hover:text-[var(--at-moss)] truncate max-w-[80px] transition-colors"
                        title={n.name}
                      >
                        {n.name}
                      </button>
                      <ChevronRight size={10} />
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                {isEditingName ? (
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onBlur={saveName}
                    onKeyDown={(e) => e.key === "Enter" && saveName()}
                    style={{
                      fontFamily: "var(--at-font-serif)",
                      fontWeight: 400,
                      fontSize: 17,
                      color: "var(--at-ink)",
                      background: "transparent",
                      border: "none",
                      borderBottom: "1.5px solid var(--at-moss)",
                      outline: "none",
                      padding: 0,
                      minWidth: 180,
                      letterSpacing: "-0.01em",
                    }}
                  />
                ) : (
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="group inline-flex items-center gap-1 truncate"
                    style={{
                      fontFamily: "var(--at-font-serif)",
                      fontWeight: 400,
                      fontSize: 17,
                      color: "var(--at-ink)",
                      letterSpacing: "-0.01em",
                      lineHeight: 1.3,
                    }}
                  >
                    <span className="truncate">{resolvedName || "Untitled"}</span>
                    <Edit2
                      size={11}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: "var(--at-ink-faint)" }}
                    />
                  </button>
                )}
              </div>

              <div
                className="mt-1.5 flex items-center gap-1.5 flex-wrap"
                style={{
                  fontFamily: "var(--at-font-mono)",
                  fontSize: 10.5,
                  color: "var(--at-ink-muted)",
                }}
              >
                <ModelBadge
                  modelId={activeModelId}
                  size="sm"
                  className="max-w-[220px] whitespace-nowrap !shadow-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {onToggleFullscreen && (
                <button
                  onClick={onToggleFullscreen}
                  className="atelier-button"
                  data-variant="ghost"
                  style={{ padding: 0, width: 30, height: 30 }}
                  aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
              )}
              {onClose && (
                <button
                  onClick={onClose}
                  className="atelier-button"
                  data-variant="ghost"
                  style={{ padding: 0, width: 30, height: 30 }}
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 relative">
          <ScrollArea className="h-full" viewportRef={scrollRef}>
            <div className="pb-36">
              {isLoadingMessages && currentMessages.length === 0 ? (
                <div className="px-5 py-20 flex flex-col items-center gap-3">
                  <div
                    className="h-6 w-6 rounded-full border-2 animate-spin"
                    style={{
                      borderColor: "var(--at-paper-edge)",
                      borderTopColor: "var(--at-moss)",
                    }}
                  />
                  <p
                    style={{
                      fontFamily: "var(--at-font-serif)",
                      fontStyle: "italic",
                      fontSize: 12,
                      color: "var(--at-ink-muted)",
                    }}
                  >
                    Opening notes…
                  </p>
                </div>
              ) : currentMessages.length === 0 ? (
                <div className="px-8 py-16 text-center">
                  <div
                    className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{
                      background: "var(--at-paper)",
                      border: "1px solid var(--at-paper-edge)",
                      color: "var(--at-moss)",
                    }}
                  >
                    <MessageSquareDashed size={18} strokeWidth={1.5} />
                  </div>
                  <h3
                    style={{
                      fontFamily: "var(--at-font-serif)",
                      fontWeight: 400,
                      fontSize: 20,
                      color: "var(--at-ink)",
                      lineHeight: 1.3,
                      marginBottom: 8,
                      letterSpacing: "-0.005em",
                    }}
                  >
                    A blank page.
                  </h3>
                  <p
                    style={{
                      fontFamily: "var(--at-font-sans)",
                      fontSize: 13,
                      color: "var(--at-ink-muted)",
                      lineHeight: 1.55,
                      maxWidth: 260,
                      margin: "0 auto",
                    }}
                  >
                    Ask the first question to start this thread.
                  </p>
                </div>
              ) : (
                currentMessages.map((msg) => (
                  <MessageItem
                    key={msg.id}
                    message={msg}
                    isUser={msg.role === "user"}
                    activeModelId={activeModelId}
                    forkedNodes={getForkedNodes(msg.id)}
                    onStartFork={handleStartFork}
                    onSelectForkedNode={handleSelectForkedNode}
                  />
                ))
              )}
              {isTyping && <TypingIndicator activeModelId={activeModelId} />}
              <div ref={endRef} />
            </div>
          </ScrollArea>

          {showScrollBtn && (
            <button
              onClick={() => scrollToBottom("smooth")}
              className="absolute bottom-36 left-1/2 -translate-x-1/2 z-10 h-8 w-8 rounded-full flex items-center justify-center transition-all"
              style={{
                background: "var(--at-paper)",
                border: "1px solid var(--at-paper-edge)",
                color: "var(--at-ink-muted)",
                boxShadow: "var(--at-shadow-md)",
              }}
            >
              <ArrowDown size={14} />
            </button>
          )}
        </div>

        {/* Composer */}
        <div
          className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-8 z-20 pointer-events-none"
          style={{
            background: "linear-gradient(to top, var(--at-paper-soft) 60%, rgba(244,240,230,0.6) 85%, transparent 100%)",
          }}
        >
          <div className="max-w-3xl mx-auto pointer-events-auto">
            <div
              className="flex items-end p-2 transition-all"
              style={{
                background: "var(--at-paper)",
                border: "1px solid var(--at-paper-edge)",
                borderRadius: "var(--at-radius-lg)",
                boxShadow: "var(--at-shadow-sm)",
              }}
            >
              <Textarea
                ref={textareaRef}
                placeholder="Ask anything…"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  autoResize(e.target);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !isTyping) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isTyping || !selectedNode}
                className="min-h-[40px] max-h-[180px] flex-1 resize-none border-0 bg-transparent px-2.5 py-2 focus-visible:ring-0"
                style={{
                  fontFamily: "var(--at-font-sans)",
                  fontSize: 15,
                  lineHeight: 1.55,
                  color: "var(--at-ink)",
                }}
              />
              <div className="pb-0.5 pr-0.5 self-end">
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isTyping}
                  size="icon"
                  className="h-9 w-9 rounded-[10px] transition-all"
                  style={{
                    background: inputValue.trim() && !isTyping ? "var(--at-moss)" : "var(--at-paper-soft)",
                    color: inputValue.trim() && !isTyping ? "var(--at-paper)" : "var(--at-ink-faint)",
                    border: "1px solid",
                    borderColor: inputValue.trim() && !isTyping ? "var(--at-moss)" : "var(--at-paper-edge)",
                    boxShadow: inputValue.trim() && !isTyping ? "var(--at-shadow-sm)" : "none",
                  }}
                  aria-label="Send"
                >
                  <Send size={14} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export const ContextualConsoleComponent = memo(ContextualConsole);
