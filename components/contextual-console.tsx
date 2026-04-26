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
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { storageService } from "@/lib/storage";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

interface ForkedNodeRef {
  _id: string;
  name?: string;
  type?: string;
  forkedFromMessageId?: string;
  forkedFromMessageRawId?: string;
  forkedFromMessageTimestamp?: string;
  forkedFromMessagePreview?: string;
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

const toTimestampMs = (value?: string | number | Date | null) => {
  if (!value) return Number.NaN;
  const timestamp =
    value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NaN;
};

const truncatePreview = (content: string, maxLength = 120) => {
  const singleLine = content.replace(/\s+/g, " ").trim();
  if (singleLine.length <= maxLength) return singleLine;
  return `${singleLine.slice(0, maxLength - 1).trimEnd()}…`;
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
  canFork: boolean;
  forkedNodes: ForkedNodeRef[];
  onStartFork: (messageId: string) => void;
  onSelectForkedNode: (nodeId: string, nodeName?: string, nodeType?: string) => void;
};

const MessageItem = memo(function MessageItem({
  message,
  isUser,
  activeModelId,
  canFork,
  forkedNodes,
  onStartFork,
  onSelectForkedNode,
}: MessageItemProps) {
  const [copied, setCopied] = useState(false);

  return (
    <div
      className={`group px-5 py-5 ${isUser ? "" : "bg-slate-50/50"} border-b border-slate-100/60 last:border-0`}
    >
      <div className="flex gap-3 max-w-3xl mx-auto">
        <div className="flex-shrink-0 pt-0.5">
          {isUser ? (
            <div className="h-7 w-7 rounded-full flex items-center justify-center bg-slate-200">
              <User size={14} className="text-slate-600" />
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
            <span className="text-sm font-semibold text-slate-800">
              {isUser ? "You" : "Assistant"}
            </span>
            <span className="text-[10px] text-slate-400">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!isUser && canFork && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onStartFork(message.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-500 hover:border-slate-300 hover:text-slate-700"
                    >
                      <GitBranch size={10} /> Branch
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-center">
                    Start a new branch from this reply. The child will inherit this
                    point and everything before it, but nothing after it.
                  </TooltipContent>
                </Tooltip>
              )}
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(message.content);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 hover:text-slate-600"
              >
                {copied ? <Check size={10} /> : <Copy size={10} />}
              </button>
            </div>
          </div>

          <div className="text-[15px] leading-relaxed text-slate-800">
            {isUser ? (
              <div className="whitespace-pre-wrap">{message.content}</div>
            ) : (
              <div className="prose prose-slate prose-sm max-w-none prose-p:leading-relaxed prose-pre:rounded-lg prose-pre:border prose-pre:border-slate-200 prose-code:before:content-none prose-code:after:content-none">
                {parseThinking(message.content).map((part, i) => (
                  <div key={i}>
                    {part.type === "thinking" ? (
                      <details className="mb-3 rounded-lg border border-purple-100 bg-purple-50/30 px-3 py-2 text-sm">
                        <summary className="cursor-pointer text-xs font-medium text-purple-600">
                          Thinking
                        </summary>
                        <div className="mt-2 border-l-2 border-purple-200 pl-3 italic text-purple-700 whitespace-pre-wrap text-xs">
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
                            <ul className="list-disc pl-5 mb-3 space-y-1">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal pl-5 mb-3 space-y-1">
                              {children}
                            </ol>
                          ),
                          h1: ({ children }) => (
                            <h1 className="text-xl font-bold mb-3 mt-5 first:mt-0">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-lg font-bold mb-2 mt-5">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-base font-semibold mb-2 mt-4">
                              {children}
                            </h3>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-3 border-slate-200 pl-3 italic text-slate-600 my-3">
                              {children}
                            </blockquote>
                          ),
                          code: ({ children, className }) => {
                            if (!className)
                              return (
                                <code className="bg-slate-100 px-1 py-0.5 rounded text-[13px] font-mono text-pink-600">
                                  {children}
                                </code>
                              );
                            return (
                              <code className={`${className} text-sm font-mono`}>
                                {children}
                              </code>
                            );
                          },
                          pre: ({ children }) => (
                            <div className="relative my-4">
                              <pre className="bg-[#1e1e1e] !text-[#d4d4d4] p-4 rounded-lg overflow-x-auto text-sm leading-relaxed">
                                {children}
                              </pre>
                            </div>
                          ),
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-4 border border-slate-200 rounded-lg">
                              <table className="w-full divide-y divide-slate-200 text-sm">
                                {children}
                              </table>
                            </div>
                          ),
                          th: ({ children }) => (
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 bg-slate-50">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="px-3 py-2 text-slate-600 border-b border-slate-100">
                              {children}
                            </td>
                          ),
                          a: ({ children, href }) => (
                            <a
                              href={href}
                              className="text-blue-600 hover:underline"
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
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
              <GitBranch size={10} />
              {forkedNodes.map((n) => (
                <button
                  key={n._id}
                  onClick={() => onSelectForkedNode(n._id, n.name, n.type)}
                  className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200 transition-colors"
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
  prev.canFork === next.canFork &&
  prev.forkedNodes.length === next.forkedNodes.length &&
  prev.forkedNodes.every((n, i) => n._id === next.forkedNodes[i]?._id)
);

const TypingIndicator = memo(function TypingIndicator({
  activeModelId,
}: {
  activeModelId: string;
}) {
  return (
    <div className="px-5 py-5 bg-slate-50/50">
      <div className="flex gap-3 max-w-3xl mx-auto">
        <ModelProviderIcon
          modelId={activeModelId}
          size={28}
          className="rounded-full flex-shrink-0"
        />
        <div className="pt-2 flex items-center gap-1">
          <div
            className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse"
            style={{ animationDelay: "0ms" }}
          />
          <div
            className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse"
            style={{ animationDelay: "200ms" }}
          />
          <div
            className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse"
            style={{ animationDelay: "400ms" }}
          />
        </div>
      </div>
    </div>
  );
});

type ForkDialogProps = {
  open: boolean;
  forkPreview: string;
  sourceName: string;
  onCancel: () => void;
  onConfirm: (model: string, name: string) => void;
};

const ForkDialog = memo(function ForkDialog({
  open,
  forkPreview,
  sourceName,
  onCancel,
  onConfirm,
}: ForkDialogProps) {
  const [model, setModel] = useState(getDefaultModel());
  const [name, setName] = useState("");
  useEffect(() => {
    if (!open) return;
    setModel(getDefaultModel());
    setName(`Branch from ${sourceName.slice(0, 24)}`.trim());
  }, [open, sourceName]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]">
      <div className="flex max-h-[88vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-950">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600">
                  <GitBranch size={15} />
                </span>
                Branch conversation
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Name the branch and choose the model it should use.
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close branch dialog"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Snapshot
            </div>
            <div className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-700">
              {forkPreview || "This branch will inherit the selected reply."}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Your new branch will start from <span className="font-semibold">{sourceName}</span>.
              It will keep this message and everything before it. Anything after
              this point stays out of the new branch.
            </p>
          </div>
          <div className="mb-5 space-y-2">
            <label
              htmlFor="fork-branch-name"
              className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400"
            >
              Node Name
            </label>
            <Input
              autoFocus
              id="fork-branch-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Branch from current reply"
              className="h-11 rounded-lg border-slate-300 bg-white text-sm font-medium text-slate-900 shadow-none focus-visible:ring-2 focus-visible:ring-slate-900/10"
              data-slot="fork-branch-name-input"
            />
            <p className="text-xs text-slate-500">
              This is the label you will see on the canvas. You can rename it later.
            </p>
          </div>
          <ModelSelectionPanel
            selectedModel={model}
            onSelect={setModel}
            compact
          />
        </div>

        <div className="flex gap-3 border-t border-slate-200 bg-white px-5 py-4">
          <Button
            variant="outline"
            onClick={onCancel}
            className="h-10 flex-1 rounded-lg border-slate-200 text-sm font-medium"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(model, name)}
            className="h-10 flex-1 rounded-lg bg-slate-950 text-sm font-medium text-white hover:bg-slate-800"
          >
            Create Branch
          </Button>
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
  const [showBranchHint, setShowBranchHint] = useState(false);

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

  const currentNode = useMemo(() => {
    if (!selectedNode || !canvasData?.nodes) return null;
    return canvasData.nodes.find((node: any) => node._id === selectedNode) || null;
  }, [selectedNode, canvasData]);

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

  // ─── Branch hint ───────────────────────────────────────
  const BRANCH_HINT_KEY = "context-tree-branch-hint-seen";
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(BRANCH_HINT_KEY)) return;
    const hasAssistantMsg = currentMessages.some((m) => m.role === "assistant");
    if (hasAssistantMsg) setShowBranchHint(true);
  }, [currentMessages]);

  const dismissBranchHint = useCallback(() => {
    setShowBranchHint(false);
    localStorage.setItem(BRANCH_HINT_KEY, "true");
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

  const isMessageNativeToSelectedNode = useCallback(
    (message: Message) => {
      if (!currentNode?.parentNodeId) return true;
      const nodeCreatedAt = toTimestampMs(currentNode.createdAt);
      const messageTimestamp = toTimestampMs(message.timestamp);
      if (!Number.isFinite(nodeCreatedAt) || !Number.isFinite(messageTimestamp)) {
        return true;
      }
      return messageTimestamp >= nodeCreatedAt;
    },
    [currentNode]
  );

  const pendingForkMessage = useMemo(
    () =>
      currentMessages.find(
        (message) => normalizeForkId(message.id) === normalizeForkId(pendingForkMsg)
      ) || null,
    [currentMessages, pendingForkMsg]
  );

  const pendingForkPreview = useMemo(() => {
    if (!pendingForkMessage) return "This branch will inherit the selected reply.";
    return truncatePreview(pendingForkMessage.content, 180);
  }, [pendingForkMessage]);

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

      // Derive the active set of external-context nodes from the canvas
      // edges. This is the runtime truth — when the user disconnects an
      // externalContext node in the UI, the corresponding edge is removed and
      // it disappears from this set on the next message.
      const allEdges: any[] = canvasData?.edges || [];
      const allNodes: any[] = canvasData?.nodes || [];
      const externalContextIds = new Set(
        allNodes.filter((n) => n?.type === "externalContext").map((n) => n._id)
      );
      const contextNodeIds = allEdges
        .filter(
          (e) =>
            (e.from === nodeId && externalContextIds.has(e.to)) ||
            (e.to === nodeId && externalContextIds.has(e.from))
        )
        .map((e) => (e.from === nodeId ? e.to : e.from));

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
          contextNodeIds,
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
    (message: Message) => {
      if (!canvasData?.nodes) return [];
      const normalized = normalizeForkId(message.id);
      const rawId = (message.id || "").trim();
      const timestamp = toTimestampMs(message.timestamp);
      const preview = truncatePreview(message.content, 160);

      return canvasData.nodes.filter((node: any) => {
        const storedForkId = normalizeForkId(node.forkedFromMessageId);
        const storedRawId = (node.forkedFromMessageRawId || "").trim();
        if (normalized && storedForkId === normalized) return true;
        if (rawId && storedRawId === rawId) return true;

        const storedTimestamp = toTimestampMs(node.forkedFromMessageTimestamp);
        if (
          Number.isFinite(timestamp) &&
          Number.isFinite(storedTimestamp) &&
          Math.abs(storedTimestamp - timestamp) <= 1000
        ) {
          const storedPreview = (node.forkedFromMessagePreview || "").trim();
          if (!storedPreview || storedPreview === preview) return true;
        }

        return false;
      });
    },
    [canvasData]
  );

  const createFork = useCallback(
    async (model: string, overrideId?: string, overrideName?: string) => {
      const forkId = normalizeForkId(overrideId || pendingForkMsg);
      if (!selectedCanvas || !selectedNode || !forkId) return;
      const sourceMessage =
        currentMessages.find(
          (message) => normalizeForkId(message.id) === forkId
        ) || null;

      const nodeId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const sourceName = resolvedName || "Parent";
      const fallbackName = `Branch from ${sourceName.slice(0, 15)}`;
      const branchName = overrideName?.trim() || fallbackName;
      const newNode = {
        _id: nodeId,
        name: branchName,
        primary: false,
        type: "branch",
        chatMessages: [],
        runningSummary: "",
        contextContract: "",
        model,
        parentNodeId: selectedNode,
        forkedFromMessageId: forkId,
        forkedFromMessageRawId: sourceMessage?.id || forkId,
        forkedFromMessageTimestamp: sourceMessage?.timestamp
          ? sourceMessage.timestamp.toISOString()
          : null,
        forkedFromMessagePreview: sourceMessage
          ? truncatePreview(sourceMessage.content, 160)
          : "",
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
        new CustomEvent("canvas-select-node", {
          detail: { nodeId, nodeName: branchName, nodeType: "branch" },
        })
      );
      onNodeSelect?.(nodeId, branchName, "branch");
    },
    [selectedCanvas, selectedNode, pendingForkMsg, resolvedName, canvasData, currentMessages, onNodeSelect]
  );

  const handleStartFork = useCallback((messageId: string) => {
    const hasMessages = currentMessages.some((m) => m.role === "assistant");
    if (!hasMessages) {
      toast({
        title: "Branch unavailable",
        description: "Start a conversation first before branching",
        variant: "destructive",
      });
      return;
    }
    const selectedMessage = currentMessages.find((message) => message.id === messageId);
    if (selectedMessage && !isMessageNativeToSelectedNode(selectedMessage)) {
      toast({
        title: "Branch unavailable",
        description: "You can only branch from replies created in this node",
        variant: "destructive",
      });
      return;
    }
    setPendingForkMsg(normalizeForkId(messageId));
    setShowForkDialog(true);
  }, [currentMessages, isMessageNativeToSelectedNode]);

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
        forkPreview={pendingForkPreview}
        sourceName={resolvedName || "this branch"}
        onCancel={() => {
          setShowForkDialog(false);
          setPendingForkMsg(null);
        }}
        onConfirm={(model, name) => {
          createFork(model, undefined, name);
          setShowForkDialog(false);
          setPendingForkMsg(null);
        }}
      />
      <div className="flex flex-col h-full bg-white w-full relative">
        {/* Header */}
        <div className="flex-none border-b border-slate-100 bg-white z-10">
          <div className="px-4 py-2.5 flex items-center justify-between">
            <div className="flex-1 min-w-0 flex items-center gap-2">
              {nodeLineage.length > 1 && (
                <div className="flex items-center gap-0.5 text-[11px] text-slate-400 mr-2">
                  {nodeLineage.slice(0, -1).map((n) => (
                    <span key={n.id} className="flex items-center gap-0.5">
                      <button
                        onClick={() => onNodeSelect?.(n.id, n.name)}
                        className="hover:text-slate-600 truncate max-w-[60px]"
                        title={n.name}
                      >
                        {n.name}
                      </button>
                      <ChevronRight size={10} />
                    </span>
                  ))}
                </div>
              )}

              {isEditingName ? (
                <input
                  autoFocus
                  className="text-sm font-semibold text-slate-900 bg-transparent border-b-2 border-indigo-500 px-0 py-0 focus:outline-none flex-1"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={(e) => e.key === "Enter" && saveName()}
                />
              ) : (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="text-sm font-semibold text-slate-900 truncate hover:text-indigo-700 transition-colors flex items-center gap-1 group"
                >
                  {resolvedName || "Untitled"}
                  <Edit2
                    size={10}
                    className="text-slate-300 group-hover:text-slate-500"
                  />
                </button>
              )}

              <ModelBadge
                modelId={activeModelId}
                size="sm"
                className="max-w-[220px] whitespace-nowrap"
              />
            </div>

            <div className="flex items-center gap-0.5 ml-2">
              {onToggleFullscreen && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-slate-600"
                  onClick={onToggleFullscreen}
                >
                  {isFullscreen ? (
                    <Minimize2 size={14} />
                  ) : (
                    <Maximize2 size={14} />
                  )}
                </Button>
              )}
              {onClose && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-slate-600"
                  onClick={onClose}
                >
                  <X size={14} />
                </Button>
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
                  <div className="h-6 w-6 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" />
                  <p className="text-xs font-medium text-slate-400">
                    Loading conversation…
                  </p>
                </div>
              ) : currentMessages.length === 0 ? (
                <div className="px-5 py-20 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-300">
                    <MessageSquareDashed size={18} strokeWidth={1.5} />
                  </div>
                  <p className="text-sm text-slate-400">
                    Start a conversation
                  </p>
                </div>
              ) : (
                currentMessages.map((msg) => (
                  <MessageItem
                    key={msg.id}
                    message={msg}
                    isUser={msg.role === "user"}
                    activeModelId={activeModelId}
                    canFork={msg.role === "assistant" && isMessageNativeToSelectedNode(msg)}
                    forkedNodes={getForkedNodes(msg)}
                    onStartFork={handleStartFork}
                    onSelectForkedNode={handleSelectForkedNode}
                  />
                ))
              )}
              {showBranchHint && !isTyping && (
                <div className="mx-5 mt-2 mb-1 flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2.5">
                  <GitBranch size={13} className="mt-0.5 shrink-0 text-indigo-500" />
                  <p className="flex-1 text-xs leading-relaxed text-indigo-700">
                    <span className="font-semibold">Tip:</span> Hover a reply created in this
                    branch to reveal the <span className="font-semibold">Branch</span> button.
                    New branches inherit that snapshot and everything before it.
                  </p>
                  <button
                    onClick={dismissBranchHint}
                    className="shrink-0 rounded p-0.5 text-indigo-400 hover:bg-indigo-100 hover:text-indigo-600"
                    aria-label="Dismiss tip"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              {isTyping && <TypingIndicator activeModelId={activeModelId} />}
              <div ref={endRef} />
            </div>
          </ScrollArea>

          {showScrollBtn && (
            <button
              onClick={() => scrollToBottom("smooth")}
              className="absolute bottom-36 left-1/2 -translate-x-1/2 z-10 h-8 w-8 rounded-full border border-slate-200 bg-white shadow-md flex items-center justify-center text-slate-500 hover:text-slate-700 hover:shadow-lg transition-all"
            >
              <ArrowDown size={14} />
            </button>
          )}
        </div>

        {/* Composer */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-8 z-20 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none">
          <div className="max-w-3xl mx-auto pointer-events-auto">
            <div className="rounded-2xl bg-slate-100 focus-within:bg-white focus-within:ring-1 focus-within:ring-slate-300 focus-within:shadow-md transition-all flex items-end p-1.5">
              <Textarea
                ref={textareaRef}
                placeholder="Message..."
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
                className="min-h-[40px] max-h-[180px] flex-1 resize-none border-0 bg-transparent px-3 py-2.5 text-[15px] focus-visible:ring-0 placeholder:text-slate-400 text-slate-900"
              />
              <div className="pb-1 pr-1 self-end">
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isTyping}
                  size="icon"
                  className={`h-8 w-8 rounded-full transition-all ${
                    inputValue.trim()
                      ? "bg-slate-900 text-white hover:bg-black"
                      : "bg-slate-200 text-slate-400"
                  }`}
                >
                  <ArrowRight size={15} strokeWidth={2.5} />
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
