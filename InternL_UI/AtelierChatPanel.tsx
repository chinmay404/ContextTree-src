"use client";

/**
 * AtelierChatPanel
 * ----------------------------------------------------------------------------
 * ContextTree's redesigned chat panel — "study session" notebook feel.
 *
 * This is a SIMPLIFIED reference implementation showing the visual language.
 * It wraps your existing chat logic (loading messages, sending, streaming)
 * in the Atelier design.
 *
 * To integrate with your existing chat-panel.tsx:
 *  1. Keep all your existing state management, hooks, API calls
 *  2. Replace only the JSX with the structure shown here
 *  3. Apply the CSS classes / inline styles from atelier.css
 */

import React, { useState, useRef, useCallback, type FormEvent, type KeyboardEvent } from "react";
import { Send, GitBranch, X, Maximize2, Minimize2, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/* ═══════════════════════════════════════════════════════════════════════
   Types — adapt these to match your existing storage types
   ═══════════════════════════════════════════════════════════════════════ */

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  model?: string;
  streaming?: boolean;
}

export interface AtelierChatPanelProps {
  nodeName: string;
  nodeType: "entry" | "branch" | "context";
  nodeParentName?: string;
  messages: Message[];
  selectedModel: string;
  availableModels: Array<{ id: string; name: string; provider: string }>;
  onSendMessage: (content: string) => void;
  onForkFromMessage?: (messageId: string, selection?: string) => void;
  onModelChange: (modelId: string) => void;
  onClose?: () => void;
  onToggleFullscreen?: () => void;
  isStreaming?: boolean;
  isFullscreen?: boolean;
}

/* ═══════════════════════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════════════════════ */

export default function AtelierChatPanel({
  nodeName,
  nodeType,
  nodeParentName,
  messages,
  selectedModel,
  availableModels,
  onSendMessage,
  onForkFromMessage,
  onModelChange,
  onClose,
  onToggleFullscreen,
  isStreaming = false,
  isFullscreen = false,
}: AtelierChatPanelProps) {
  const [input, setInput] = useState("");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* Auto-resize textarea */
  const autoResize = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    onSendMessage(trimmed);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [input, isStreaming, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  /* Accent for the node type indicator */
  const accent =
    nodeType === "entry" ? "moss" : nodeType === "branch" ? "amber" : "indigo";
  const accentColor =
    accent === "moss"
      ? "var(--at-moss)"
      : accent === "amber"
      ? "var(--at-amber)"
      : "var(--at-indigo)";
  const typeLabel =
    nodeType === "entry"
      ? "Main thread"
      : nodeType === "branch"
      ? "Branch"
      : "Reference";

  const currentModel = availableModels.find((m) => m.id === selectedModel);

  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: "var(--at-paper-soft)",
        borderLeft: "1px solid var(--at-paper-edge)",
        fontFamily: "var(--at-font-sans)",
      }}
    >
      {/* ─── HEADER ──────────────────────────────────────────────── */}
      <div
        className="flex items-start justify-between gap-3 px-5 py-4"
        style={{
          borderBottom: "1px solid var(--at-paper-edge)",
        }}
      >
        <div className="min-w-0 flex-1">
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
          <h2
            className="truncate mt-0.5"
            style={{
              fontFamily: "var(--at-font-serif)",
              fontWeight: 400,
              fontSize: 17,
              color: "var(--at-ink)",
              lineHeight: 1.3,
              letterSpacing: "-0.01em",
            }}
            title={nodeName}
          >
            {nodeName}
          </h2>
          <div
            className="mt-1.5 flex items-center gap-1.5"
            style={{
              fontFamily: "var(--at-font-mono)",
              fontSize: 10.5,
              color: "var(--at-ink-muted)",
            }}
          >
            <span style={{ color: accentColor }}>{currentModel?.name || selectedModel}</span>
            <span style={{ color: "var(--at-paper-edge)" }}>·</span>
            <span style={{ color: accentColor, fontStyle: "italic", fontFamily: "var(--at-font-serif)" }}>
              {typeLabel}
            </span>
            {nodeParentName && nodeType === "branch" && (
              <>
                <span style={{ color: "var(--at-paper-edge)" }}>·</span>
                <span>↳ from {nodeParentName.length > 20 ? nodeParentName.slice(0, 18) + "…" : nodeParentName}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="atelier-button"
              data-variant="ghost"
              style={{ padding: 8, width: 32, height: 32 }}
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
              style={{ padding: 8, width: 32, height: 32 }}
              aria-label="Close chat"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ─── MESSAGES ────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-5 py-4"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "var(--at-paper-edge) transparent",
        }}
      >
        {messages.length === 0 ? (
          <EmptyState typeLabel={typeLabel} accentColor={accentColor} />
        ) : (
          <div className="space-y-0">
            {messages.map((msg, i) => (
              <React.Fragment key={msg.id}>
                {i > 0 && <MessageDivider />}
                <MessageBubble
                  message={msg}
                  onFork={() => onForkFromMessage?.(msg.id)}
                  isLastStreaming={msg.streaming && i === messages.length - 1}
                />
              </React.Fragment>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ─── INPUT ───────────────────────────────────────────────── */}
      <div
        className="px-5 py-4"
        style={{ borderTop: "1px solid var(--at-paper-edge)" }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            autoResize(e.target);
          }}
          onKeyDown={handleKeyDown}
          placeholder={isStreaming ? "The model is responding…" : "Ask anything…"}
          disabled={isStreaming}
          rows={1}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            fontFamily: "var(--at-font-sans)",
            fontSize: 15,
            lineHeight: 1.55,
            color: "var(--at-ink)",
            minHeight: 36,
            maxHeight: 180,
            padding: "4px 0",
          }}
        />

        {/* Hairline divider above controls */}
        <div
          style={{
            height: 1,
            background: "var(--at-paper-edge)",
            margin: "10px 0 10px",
          }}
        />

        {/* Controls row */}
        <div className="flex items-center justify-between gap-2">
          {/* Model picker */}
          <div className="relative">
            <button
              onClick={() => setShowModelPicker((v) => !v)}
              className="atelier-chip"
              style={{
                cursor: "pointer",
                padding: "4px 8px",
                fontSize: 10.5,
                fontFamily: "var(--at-font-mono)",
              }}
            >
              {currentModel?.name || selectedModel}
              <ChevronDown size={10} />
            </button>
            {showModelPicker && (
              <ModelPicker
                models={availableModels}
                selected={selectedModel}
                onSelect={(id) => {
                  onModelChange(id);
                  setShowModelPicker(false);
                }}
                onClose={() => setShowModelPicker(false)}
              />
            )}
          </div>

          {/* Right-side actions */}
          <div className="flex items-center gap-2">
            <div
              style={{
                fontFamily: "var(--at-font-mono)",
                fontSize: 10,
                color: "var(--at-ink-faint)",
              }}
            >
              ⌘↵
            </div>

            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isStreaming}
              className="atelier-button"
              data-variant="primary"
              style={{
                padding: 0,
                width: 36,
                height: 36,
                opacity: !input.trim() || isStreaming ? 0.4 : 1,
                cursor: !input.trim() || isStreaming ? "not-allowed" : "pointer",
              }}
              aria-label="Send"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MessageBubble
   ═══════════════════════════════════════════════════════════════════════ */
function MessageBubble({
  message,
  onFork,
  isLastStreaming,
}: {
  message: Message;
  onFork?: () => void;
  isLastStreaming?: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={`group flex ${isUser ? "justify-end" : "justify-start"} py-2`}
    >
      <div
        className="relative"
        style={{ maxWidth: isUser ? "80%" : "90%" }}
      >
        <div
          className="px-3.5 py-3"
          style={{
            background: isUser ? "var(--at-paper)" : "var(--at-paper-soft)",
            border: isUser
              ? "1px solid var(--at-paper-edge)"
              : "1px solid rgba(232, 226, 209, 0.6)",
            borderRadius: isUser
              ? "10px 2px 10px 10px"
              : "2px 10px 10px 10px",
            boxShadow: isUser ? "var(--at-shadow-sm)" : "none",
            fontFamily: "var(--at-font-sans)",
            fontSize: 14,
            lineHeight: 1.55,
            color: "var(--at-ink)",
          }}
          data-chat-message-body
        >
          {isUser ? (
            <div style={{ whiteSpace: "pre-wrap" }}>{message.content}</div>
          ) : (
            <MarkdownContent content={message.content} />
          )}

          {isLastStreaming && (
            <div className="mt-2">
              <div className="atelier-streaming">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
        </div>

        {/* Meta row below bubble */}
        <div
          className={`mt-1.5 flex items-center gap-2 ${isUser ? "justify-end" : "justify-start"}`}
        >
          {!isUser && message.model && (
            <span
              style={{
                fontFamily: "var(--at-font-serif)",
                fontStyle: "italic",
                fontSize: 10.5,
                color: "var(--at-amber)",
              }}
            >
              — {message.model}
            </span>
          )}

          <span
            style={{
              fontFamily: "var(--at-font-mono)",
              fontSize: 10,
              color: "var(--at-ink-faint)",
            }}
          >
            {formatTime(message.timestamp)}
          </span>

          {!isUser && onFork && (
            <button
              onClick={onFork}
              className="atelier-button opacity-0 group-hover:opacity-100"
              data-variant="ghost"
              style={{
                padding: "3px 8px",
                fontSize: 10.5,
                height: 22,
                transition: "opacity 150ms ease",
              }}
            >
              <GitBranch size={10} />
              Fork
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageDivider() {
  return (
    <div
      aria-hidden
      style={{
        height: 1,
        background: "var(--at-paper-edge)",
        opacity: 0.6,
        margin: "6px 0",
      }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Markdown rendering with atelier styling
   ═══════════════════════════════════════════════════════════════════════ */
function MarkdownContent({ content }: { content: string }) {
  return (
    <div
      style={{
        fontFamily: "var(--at-font-sans)",
        fontSize: 14,
        lineHeight: 1.6,
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => (
            <h1
              style={{
                fontFamily: "var(--at-font-serif)",
                fontSize: 18,
                fontWeight: 500,
                marginTop: 12,
                marginBottom: 8,
              }}
              {...props}
            />
          ),
          h2: (props) => (
            <h2
              style={{
                fontFamily: "var(--at-font-serif)",
                fontSize: 16,
                fontWeight: 500,
                marginTop: 10,
                marginBottom: 6,
              }}
              {...props}
            />
          ),
          h3: (props) => (
            <h3
              style={{
                fontFamily: "var(--at-font-serif)",
                fontSize: 14,
                fontWeight: 500,
                marginTop: 8,
                marginBottom: 4,
              }}
              {...props}
            />
          ),
          p: (props) => <p style={{ margin: "6px 0" }} {...props} />,
          ul: (props) => (
            <ul style={{ paddingLeft: 20, margin: "6px 0" }} {...props} />
          ),
          ol: (props) => (
            <ol style={{ paddingLeft: 20, margin: "6px 0" }} {...props} />
          ),
          li: (props) => (
            <li style={{ margin: "2px 0" }} {...props} />
          ),
          a: (props) => (
            <a
              style={{
                color: "var(--at-moss)",
                textDecoration: "underline",
                textDecorationColor: "var(--at-moss-soft)",
                textUnderlineOffset: 2,
              }}
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          code: ({ className, children, ...props }: any) => {
            const isInline = !className;
            if (isInline) {
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
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                style={{
                  fontFamily: "var(--at-font-mono)",
                  fontSize: 12,
                  color: "var(--at-paper)",
                }}
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: (props) => (
            <pre
              style={{
                background: "var(--at-ink)",
                color: "var(--at-paper)",
                padding: "12px 14px",
                borderRadius: 8,
                overflowX: "auto",
                fontSize: 12,
                fontFamily: "var(--at-font-mono)",
                margin: "10px 0",
                lineHeight: 1.5,
              }}
              {...props}
            />
          ),
          blockquote: (props) => (
            <blockquote
              style={{
                borderLeft: "2px solid var(--at-amber)",
                paddingLeft: 12,
                margin: "8px 0",
                color: "var(--at-ink-soft)",
                fontStyle: "italic",
              }}
              {...props}
            />
          ),
          hr: () => (
            <hr
              style={{
                border: "none",
                height: 1,
                background: "var(--at-paper-edge)",
                margin: "12px 0",
              }}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Empty state
   ═══════════════════════════════════════════════════════════════════════ */
function EmptyState({
  typeLabel,
  accentColor,
}: {
  typeLabel: string;
  accentColor: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
      <div
        style={{
          fontFamily: "var(--at-font-serif)",
          fontStyle: "italic",
          fontSize: 13,
          color: accentColor,
          letterSpacing: "0.02em",
          marginBottom: 12,
        }}
      >
        {typeLabel}
      </div>
      <h3
        style={{
          fontFamily: "var(--at-font-serif)",
          fontWeight: 400,
          fontSize: 22,
          color: "var(--at-ink)",
          lineHeight: 1.3,
          marginBottom: 10,
        }}
      >
        A blank page.
      </h3>
      <p
        style={{
          fontFamily: "var(--at-font-sans)",
          fontSize: 13.5,
          color: "var(--at-ink-muted)",
          lineHeight: 1.55,
          maxWidth: 300,
        }}
      >
        Ask the first question to start this thread. You can branch off at any point by selecting text in a response.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Model picker dropdown
   ═══════════════════════════════════════════════════════════════════════ */
function ModelPicker({
  models,
  selected,
  onSelect,
  onClose,
}: {
  models: Array<{ id: string; name: string; provider: string }>;
  selected: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  /* Close on outside click */
  const ref = useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Group by provider
  const byProvider = models.reduce<Record<string, typeof models>>((acc, m) => {
    acc[m.provider] = acc[m.provider] || [];
    acc[m.provider].push(m);
    return acc;
  }, {});

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-2 left-0 z-50 min-w-[260px]"
      style={{
        background: "var(--at-paper)",
        border: "1px solid var(--at-paper-edge)",
        borderRadius: "var(--at-radius-md)",
        boxShadow: "var(--at-shadow-lg)",
        maxHeight: 360,
        overflowY: "auto",
      }}
    >
      {Object.entries(byProvider).map(([provider, items]) => (
        <div key={provider} className="py-1.5">
          <div
            className="px-3 py-1.5"
            style={{
              fontFamily: "var(--at-font-serif)",
              fontStyle: "italic",
              fontSize: 10.5,
              color: "var(--at-ink-muted)",
              letterSpacing: "0.04em",
            }}
          >
            {provider}
          </div>
          {items.map((m) => (
            <button
              key={m.id}
              onClick={() => onSelect(m.id)}
              className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[var(--at-paper-soft)] transition-colors"
              style={{
                fontFamily: "var(--at-font-mono)",
                fontSize: 11.5,
                color: m.id === selected ? "var(--at-moss)" : "var(--at-ink-soft)",
                fontWeight: m.id === selected ? 600 : 400,
              }}
            >
              <span>{m.name}</span>
              {m.id === selected && <span style={{ fontSize: 10 }}>✓</span>}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Utilities
   ═══════════════════════════════════════════════════════════════════════ */

function formatTime(date: Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
