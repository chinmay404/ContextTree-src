"use client";

import { memo, useEffect, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  X,
  GitBranch,
  ArrowDown,
  ChevronRight,
  Copy,
  Check,
  ArrowRight,
  MessageSquareDashed,
  Globe,
  Paperclip,
  FileText,
  Plus,
} from "lucide-react";
import { CONTEXT_FILE_ACCEPT } from "@/lib/file-types";
import { BrandLoader } from "@/components/brand-loader";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ModelBadge, ModelProviderIcon } from "@/components/model-badge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import type { Message, ForkedNodeRef, ContextFileChip } from "./shared";

// ─── Thinking block parser ──────────────────────────────────
// Splits assistant content into text and <think>…</think> segments. A
// trailing UNCLOSED <think> (i.e. the model is mid-thought while the stream
// is still arriving) becomes a "thinking-live" part so the UI can render an
// expanded, streaming Thinking section; the moment </think> lands the same
// span parses as a regular "thinking" part, which renders collapsed — that
// transition is the auto-collapse.
type ThinkingPart = {
  type: "text" | "thinking" | "thinking-live";
  content: string;
};

const OPEN_TAG = "<think>";

const parseThinking = (content: string): ThinkingPart[] => {
  const regex = /<think>([\s\S]*?)<\/think>/g;
  const parts: ThinkingPart[] = [];
  let last = 0;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > last)
      parts.push({ type: "text", content: content.slice(last, match.index) });
    parts.push({ type: "thinking", content: match[1].trim() });
    last = match.index + match[0].length;
  }
  if (last < content.length) {
    const rest = content.slice(last);
    const openIdx = rest.indexOf(OPEN_TAG);
    if (openIdx === -1) {
      parts.push({ type: "text", content: rest });
    } else {
      if (openIdx > 0)
        parts.push({ type: "text", content: rest.slice(0, openIdx) });
      parts.push({
        type: "thinking-live",
        content: rest.slice(openIdx + OPEN_TAG.length).replace(/^\s+/, ""),
      });
    }
  }
  return parts.length ? parts : [{ type: "text" as const, content }];
};

// ─── Thinking block (Claude/GPT-style) ──────────────────────
// Live: shimmering "Thinking…" label over a height-clamped window that
// follows the newest reasoning lines (older lines fade out above). Done:
// collapses to a quiet "Thought for Ns" row, expandable. The component
// stays mounted across the live→done flip (keyed by position, not type)
// so the duration is real, not re-measured.
function ThinkingBlock({
  content,
  live = false,
}: {
  content: string;
  live?: boolean;
}) {
  const startRef = useRef<number>(Date.now());
  const doneAtRef = useRef<number | null>(null);
  const sawLiveRef = useRef<boolean>(live);
  const [, tick] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (live) {
      sawLiveRef.current = true;
      const t = setInterval(() => tick((v) => v + 1), 1000);
      return () => clearInterval(t);
    }
    if (sawLiveRef.current && doneAtRef.current === null)
      doneAtRef.current = Date.now();
  }, [live]);

  const seconds = Math.max(
    1,
    Math.round(((doneAtRef.current ?? Date.now()) - startRef.current) / 1000)
  );

  if (live) {
    return (
      <div className="mb-3" data-slot="thinking-live">
        <span className="shimmer-text type-meta font-medium">Thinking…</span>
        {content && (
          <div
            className="mt-1.5 flex max-h-24 flex-col justify-end overflow-hidden"
            style={{
              maskImage: "linear-gradient(to bottom, transparent, black 45%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent, black 45%)",
            }}
          >
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground/80">
              {content}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-3" data-slot="thinking-done">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex select-none items-center gap-1.5 type-meta text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronRight
          size={12}
          strokeWidth={1.75}
          className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
        />
        {sawLiveRef.current ? `Thought for ${seconds}s` : "Thinking"}
      </button>
      {open && (
        <div className="mt-1.5 whitespace-pre-wrap border-l-2 border-border pl-3 text-xs leading-relaxed text-muted-foreground">
          {content}
        </div>
      )}
    </div>
  );
}

// ─── Web-search sources (Claude/GPT-style chips) ────────────
function WebSearchSources({
  results,
}: {
  results: { title?: string; url?: string }[];
}) {
  const [open, setOpen] = useState(false);
  const domain = (url?: string) => {
    try {
      return new URL(url || "").hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  };
  return (
    <div className="mb-2" data-slot="web-sources">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex select-none items-center gap-1.5 type-meta text-muted-foreground transition-colors hover:text-foreground"
      >
        <Globe size={12} strokeWidth={1.75} className="shrink-0 text-primary/70" />
        Searched the web
        <span aria-hidden>·</span>
        <span>{results.length} sources</span>
        <ChevronRight
          size={12}
          strokeWidth={1.75}
          className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {results.map((r, i) => (
            <a
              key={`${r.url}-${i}`}
              href={r.url}
              target="_blank"
              rel="noreferrer"
              title={r.title}
              className="inline-flex max-w-[260px] items-center gap-1.5 truncate rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <Globe size={10} strokeWidth={1.75} className="shrink-0 opacity-60" />
              <span className="truncate">
                {r.title?.trim() || domain(r.url) || "source"}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

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
      className={`group px-5 py-5 ${isUser ? "" : "bg-muted/50"} border-b border-border last:border-0`}
    >
      <div className="flex gap-3 max-w-3xl mx-auto">
        <div className="flex-shrink-0 pt-0.5">
          {isUser ? (
            <div className="h-7 w-7 rounded-full flex items-center justify-center bg-accent">
              <User size={14} strokeWidth={1.75} className="text-muted-foreground" />
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
            <span className="type-ui font-semibold">
              {isUser ? "You" : "Assistant"}
            </span>
            {/* Messages don't persist a per-message model yet, so this shows
                the node's current model (activeModelId). */}
            {!isUser && (
              <ModelBadge
                modelId={activeModelId}
                size="sm"
                className="max-w-[140px] shrink-0 !shadow-none"
              />
            )}
            <span className="type-meta">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {canFork && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onStartFork(message.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 type-meta hover:text-foreground"
                    >
                      <GitBranch size={12} strokeWidth={1.75} /> Branch
                      <kbd className="rounded border border-border bg-muted px-1 type-mono">
                        ⌘B
                      </kbd>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px] text-center">
                    {isUser
                      ? "Branch from this question. The new node will start by re-asking it and getting a fresh answer."
                      : "Start a new branch from this reply. The child will inherit this point and everything before it, but nothing after it."}
                  </TooltipContent>
                </Tooltip>
              )}
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(message.content);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground"
              >
                {copied ? (
                  <Check size={12} strokeWidth={1.75} />
                ) : (
                  <Copy size={12} strokeWidth={1.75} />
                )}
              </button>
            </div>
          </div>

          {!isUser && message.webSearch?.results?.length ? (
            <WebSearchSources results={message.webSearch.results} />
          ) : null}

          <div className="type-body">
            {isUser ? (
              <div className="whitespace-pre-wrap">{message.content}</div>
            ) : (
              <div className="prose prose-slate dark:prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:rounded-lg prose-pre:border prose-pre:border-border prose-code:before:content-none prose-code:after:content-none">
                {parseThinking(message.content).map((part, i) => (
                  // Thinking parts keep a type-STABLE key: when </think>
                  // lands the part flips live→done but the component stays
                  // mounted, so the measured duration ("Thought for Ns")
                  // and the collapse animation are real.
                  <div key={part.type === "text" ? `text-${i}` : `think-${i}`}>
                    {part.type === "thinking" || part.type === "thinking-live" ? (
                      <ThinkingBlock
                        content={part.content}
                        live={part.type === "thinking-live"}
                      />
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
                            <blockquote className="border-l-3 border-border pl-3 italic text-muted-foreground my-3">
                              {children}
                            </blockquote>
                          ),
                          code: ({ children, className }) => {
                            if (!className)
                              return (
                                <code className="bg-accent px-1 py-0.5 rounded text-[13px] font-mono text-pink-600 dark:text-pink-400">
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
                            <div className="overflow-x-auto my-4 border border-border rounded-lg">
                              <table className="w-full divide-y divide-border text-sm">
                                {children}
                              </table>
                            </div>
                          ),
                          th: ({ children }) => (
                            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground bg-muted">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="px-3 py-2 text-foreground border-b border-border">
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
            <div className="mt-2 flex items-center gap-1.5 type-meta">
              <GitBranch size={12} strokeWidth={1.75} />
              {forkedNodes.map((n) => (
                <button
                  key={n._id}
                  onClick={() => onSelectForkedNode(n._id, n.name, n.type)}
                  className="rounded bg-accent px-1.5 py-0.5 type-meta text-foreground hover:bg-accent/70 transition-colors"
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
    <div className="px-5 py-5 bg-muted/50">
      <div className="flex gap-3 max-w-3xl mx-auto">
        <ModelProviderIcon
          modelId={activeModelId}
          size={28}
          className="rounded-full flex-shrink-0"
        />
        {/* Same "Thinking" presentation as the streaming ThinkingBlock —
            this shows pre-first-token, the block takes over once <think>
            content starts streaming. */}
        <div className="flex items-center gap-2 pt-1 type-meta">
          <BrandLoader variant="dots" size={20} label="Thinking" />
          Thinking
        </div>
      </div>
    </div>
  );
});

// ─── Chat tab (messages + composer) ─────────────────────────
type ChatTabProps = {
  selectedNode: string | null;
  currentMessages: Message[];
  isLoadingMessages: boolean;
  isTyping: boolean;
  activeModelId: string;
  showBranchHint: boolean;
  onDismissBranchHint: () => void;
  showScrollBtn: boolean;
  onScrollToBottom: (behavior?: ScrollBehavior) => void;
  isMessageNativeToSelectedNode: (message: Message) => boolean;
  getForkedNodes: (message: Message) => ForkedNodeRef[];
  onStartFork: (messageId: string) => void;
  onSelectForkedNode: (nodeId: string, nodeName?: string, nodeType?: string) => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  autoResize: (el: HTMLTextAreaElement) => void;
  onSend: () => void;
  webSearch: boolean;
  onToggleWebSearch: () => void;
  contextFiles: ContextFileChip[];
  onToggleContext: (fileNodeId: string) => void;
  onAttachFile: (file: File) => void;
  scrollRef: RefObject<HTMLDivElement | null>;
  endRef: RefObject<HTMLDivElement | null>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
};

export function ChatTab({
  selectedNode,
  currentMessages,
  isLoadingMessages,
  isTyping,
  activeModelId,
  showBranchHint,
  onDismissBranchHint,
  showScrollBtn,
  onScrollToBottom,
  isMessageNativeToSelectedNode,
  getForkedNodes,
  onStartFork,
  onSelectForkedNode,
  inputValue,
  onInputChange,
  autoResize,
  onSend,
  webSearch,
  onToggleWebSearch,
  contextFiles,
  onToggleContext,
  onAttachFile,
  scrollRef,
  endRef,
  textareaRef,
}: ChatTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAvailableContext, setShowAvailableContext] = useState(false);
  const connectedFiles = contextFiles.filter((f) => f.connected);
  const availableFiles = contextFiles.filter((f) => !f.connected);
  return (
    <>
      {/* Messages */}
      <div className="flex-1 min-h-0 relative">
        <ScrollArea className="h-full" viewportRef={scrollRef}>
          <div className="pb-36">
            {isLoadingMessages && currentMessages.length === 0 ? (
              <div className="px-5 py-20 flex flex-col items-center gap-3">
                <div className="h-6 w-6 rounded-full border-2 border-border border-t-primary animate-spin" />
                <p className="type-meta">
                  Loading conversation…
                </p>
              </div>
            ) : currentMessages.length === 0 ? (
              <div className="px-5 py-20 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-muted-foreground">
                  <MessageSquareDashed size={18} strokeWidth={1.75} />
                </div>
                <p className="type-ui text-muted-foreground">
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
                  canFork={isMessageNativeToSelectedNode(msg)}
                  forkedNodes={getForkedNodes(msg)}
                  onStartFork={onStartFork}
                  onSelectForkedNode={onSelectForkedNode}
                />
              ))
            )}
            {showBranchHint && !isTyping && (
              <div className="mx-5 mt-2 mb-1 flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2.5">
                <GitBranch size={14} strokeWidth={1.75} className="mt-0.5 shrink-0 text-primary" />
                <p className="flex-1 text-xs leading-relaxed text-foreground">
                  <span className="font-semibold">Tip:</span> Hover a reply created in this
                  branch to reveal the <span className="font-semibold">Branch</span> button.
                  New branches inherit that snapshot and everything before it.
                </p>
                <button
                  onClick={onDismissBranchHint}
                  className="shrink-0 rounded p-0.5 text-primary/70 hover:bg-primary/15 hover:text-primary"
                  aria-label="Dismiss tip"
                >
                  <X size={12} strokeWidth={1.75} />
                </button>
              </div>
            )}
            {isTyping && <TypingIndicator activeModelId={activeModelId} />}
            <div ref={endRef} />
          </div>
        </ScrollArea>

        {showScrollBtn && (
          <button
            onClick={() => onScrollToBottom("smooth")}
            className="absolute bottom-36 left-1/2 -translate-x-1/2 z-10 h-8 w-8 rounded-full border border-border bg-card shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:shadow-lg transition-all"
          >
            <ArrowDown size={16} strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Composer */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-8 z-20 bg-gradient-to-t from-card via-card/95 to-transparent pointer-events-none">
        <div className="max-w-3xl mx-auto pointer-events-auto">
          {/* Context chips: live controls over chat↔file edges. */}
          {Boolean(selectedNode) && contextFiles.length > 0 && (
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              {connectedFiles.map((f) => (
                <span
                  key={f.id}
                  className={`inline-flex max-w-[220px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                    f.error
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : "border-primary/30 bg-primary/10 text-foreground"
                  }`}
                  title={
                    f.error
                      ? `${f.name} — processing failed`
                      : f.processing
                        ? `${f.name} — processing…`
                        : `${f.name} — informing replies in this node`
                  }
                >
                  <FileText size={11} strokeWidth={1.75} className="shrink-0 opacity-70" />
                  <span className="truncate">{f.name}</span>
                  {f.processing && !f.error && (
                    <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-primary" />
                  )}
                  <button
                    type="button"
                    onClick={() => onToggleContext(f.id)}
                    className="shrink-0 rounded-full p-0.5 transition-colors hover:bg-foreground/10"
                    aria-label={`Disconnect ${f.name}`}
                  >
                    <X size={10} strokeWidth={2} />
                  </button>
                </span>
              ))}
              {availableFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAvailableContext((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  <Plus size={11} strokeWidth={2} /> Context
                  {!showAvailableContext && ` (${availableFiles.length})`}
                </button>
              )}
              {showAvailableContext &&
                availableFiles.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      onToggleContext(f.id);
                      setShowAvailableContext(false);
                    }}
                    className="inline-flex max-w-[220px] items-center gap-1.5 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    title={`Connect ${f.name} to this node`}
                  >
                    <FileText size={11} strokeWidth={1.75} className="shrink-0 opacity-60" />
                    <span className="truncate">{f.name}</span>
                  </button>
                ))}
            </div>
          )}
          <div className="rounded-2xl bg-muted focus-within:bg-card focus-within:ring-1 focus-within:ring-ring focus-within:shadow-md transition-all flex items-end p-1.5">
            <div className="pb-1 pl-1 self-end">
              <input
                ref={fileInputRef}
                type="file"
                accept={CONTEXT_FILE_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onAttachFile(f);
                  e.currentTarget.value = "";
                }}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isTyping || !selectedNode}
                size="icon"
                variant="ghost"
                title="Attach a document as context (PDF, TXT, MD, DOC, DOCX)"
                className="h-8 w-8 rounded-full text-muted-foreground transition-all hover:text-foreground"
              >
                <Paperclip size={16} strokeWidth={1.75} />
              </Button>
              <Button
                onClick={onToggleWebSearch}
                disabled={isTyping || !selectedNode}
                size="icon"
                variant="ghost"
                aria-pressed={webSearch}
                title={
                  webSearch
                    ? "Web search on — DuckDuckGo results will inform this reply"
                    : "Search the web (free, DuckDuckGo) for this message"
                }
                className={`h-8 w-8 rounded-full transition-all ${
                  webSearch
                    ? "bg-primary/15 text-primary hover:bg-primary/25"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Globe size={16} strokeWidth={1.75} />
              </Button>
            </div>
            <Textarea
              ref={textareaRef}
              placeholder="Message..."
              value={inputValue}
              onChange={(e) => {
                onInputChange(e.target.value);
                autoResize(e.target);
              }}
              onKeyDown={(e) => {
                // Send on plain Enter (existing behavior) or Cmd/Ctrl+Enter.
                if (
                  e.key === "Enter" &&
                  (e.metaKey || e.ctrlKey || !e.shiftKey) &&
                  !isTyping
                ) {
                  e.preventDefault();
                  onSend();
                }
              }}
              disabled={isTyping || !selectedNode}
              className="min-h-[40px] max-h-[180px] flex-1 resize-none border-0 bg-transparent px-3 py-2.5 text-sm leading-relaxed focus-visible:ring-0 placeholder:text-muted-foreground text-foreground"
            />
            <div className="pb-1 pr-1 self-end">
              <Button
                onClick={onSend}
                disabled={!inputValue.trim() || isTyping}
                size="icon"
                className={`h-8 w-8 rounded-full transition-all ${
                  inputValue.trim()
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <ArrowRight size={16} strokeWidth={1.75} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
