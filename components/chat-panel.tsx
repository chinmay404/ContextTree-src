"use client";

import { useState, useEffect, useRef, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  Send,
  Bot,
  User,
  MessageSquare,
  X,
  Maximize2,
  Minimize2,
  Sparkles,
  PanelRightClose,
  PanelRightOpen,
  Settings,
  GitBranch,
  ArrowRight,
  Copy,
  Check,
} from "lucide-react";
import { storageService } from "@/lib/storage";
import { toast } from "@/hooks/use-toast";
import { ALL_MODELS, MODEL_PROVIDERS, getDefaultModel } from "@/lib/models";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";

// Available AI models (excluding TTS and Speech-to-text models)
const AVAILABLE_MODELS = ALL_MODELS.map((model) => ({
  value: model.id,
  label: model.name,
  description: model.description,
  provider: model.provider,
}));

// Debug log to verify models are loaded
console.log(
  "Available models:",
  AVAILABLE_MODELS.length,
  AVAILABLE_MODELS.slice(0, 3)
);

interface ChatPanelProps {
  selectedNode: string | null;
  selectedNodeName?: string;
  onClose?: () => void;
  selectedCanvas?: string | null;
  isFullscreen?: boolean;
  isCollapsed?: boolean;
  onToggleFullscreen?: () => void;
  onToggleCollapse?: () => void;
  onNodeSelect?: (nodeId: string, nodeName?: string) => void;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface NodeConversation {
  nodeId: string;
  nodeName: string;
  messages: Message[];
}

export function ChatPanel({
  selectedNode,
  selectedNodeName,
  onClose,
  selectedCanvas,
  isFullscreen = false,
  isCollapsed = false,
  onToggleFullscreen,
  onToggleCollapse,
  onNodeSelect,
}: ChatPanelProps) {
  const [conversations, setConversations] = useState<
    Record<string, NodeConversation>
  >({});
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(getDefaultModel());
  const [canvasData, setCanvasData] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [showForkModelDialog, setShowForkModelDialog] = useState(false);
  const [pendingForkMessage, setPendingForkMessage] = useState<string | null>(
    null
  );
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Ensure client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load canvas data to detect forked nodes (client-side only)
  useEffect(() => {
    if (!selectedCanvas || typeof window === "undefined") return;

    const loadCanvas = async () => {
      try {
        const response = await fetch(`/api/canvases/${selectedCanvas}`);
        if (response.ok) {
          const data = await response.json();
          setCanvasData(data.canvas);
        }
      } catch (error) {
        console.error("Failed to load canvas data:", error);
      }
    };

    loadCanvas();
  }, [selectedCanvas]);

  // Function to get nodes forked from a specific message
  const getForkedNodes = (messageId: string) => {
    if (!canvasData?.nodes) return [];

    return canvasData.nodes.filter((node: any) => {
      const forkedFromId = node.forkedFromMessageId;
      return forkedFromId === messageId || forkedFromId === messageId + "-a";
    });
  };

  // Ensure a conversation object exists for the selected node so the UI can render immediately
  useEffect(() => {
    if (!selectedNode) return;

    setConversations((prev) => {
      // Don't overwrite existing conversation data, especially if it has messages
      if (prev[selectedNode] && prev[selectedNode].messages.length > 0) {
        console.log(
          `Preserving existing conversation for node ${selectedNode} with ${prev[selectedNode].messages.length} messages`
        );
        return prev;
      }

      // Only create empty conversation if none exists
      if (prev[selectedNode]) return prev;

      console.log(`Creating new empty conversation for node ${selectedNode}`);
      return {
        ...prev,
        [selectedNode]: {
          nodeId: selectedNode,
          nodeName: selectedNodeName || `Node ${selectedNode}`,
          messages: [],
        },
      };
    });
  }, [selectedNode, selectedNodeName]);

  useEffect(() => {
    if (!selectedNode || !selectedCanvas) return;

    // Load canvas data and extract messages for this node
    (async () => {
      try {
        console.log(
          `Loading messages for node ${selectedNode} from canvas ${selectedCanvas}`
        );
        const res = await fetch(`/api/canvases/${selectedCanvas}`);
        if (res.ok) {
          const data = await res.json();
          const canvas = data.canvas;
          const node = canvas.nodes?.find((n: any) => n._id === selectedNode);
          console.log(
            `Found node:`,
            node ? `yes (${node.chatMessages?.length || 0} messages)` : "no"
          );
          if (node && node.chatMessages) {
            console.log(
              `Setting ${node.chatMessages.length} messages for node ${selectedNode}`
            );
            setConversations((prev) => ({
              ...prev,
              [selectedNode]: {
                nodeId: selectedNode,
                nodeName:
                  selectedNodeName || node.name || `Node ${selectedNode}`,
                messages: node.chatMessages
                  .flatMap((msg: any, idx: number) => {
                    // New format: turn { id, user?, assistant? }
                    if (msg.user || msg.assistant) {
                      const parts: any[] = [];
                      if (msg.user) {
                        parts.push({
                          id: `${msg.id}-u`,
                          role: "user",
                          content: msg.user.content,
                          timestamp: new Date(msg.user.timestamp),
                        });
                      }
                      if (msg.assistant) {
                        parts.push({
                          id: `${msg.id}-a`,
                          role: "assistant",
                          content: msg.assistant.content,
                          timestamp: new Date(msg.assistant.timestamp),
                        });
                      }
                      return parts;
                    }
                    // Legacy single message object fallback
                    return [
                      {
                        id:
                          msg.id ||
                          (msg.timestamp
                            ? `${msg.timestamp}-${idx}`
                            : `msg-${idx}-${selectedNode}`),
                        role: msg.role,
                        content: msg.content,
                        timestamp: msg.timestamp
                          ? new Date(msg.timestamp)
                          : new Date(),
                      },
                    ];
                  })
                  .sort(
                    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
                  ),
              },
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
        // fallback: use localStorage if available
        const localMessages = storageService.getNodeMessages(
          selectedCanvas,
          selectedNode
        );
        if (localMessages.length > 0) {
          setConversations((prev) => ({
            ...prev,
            [selectedNode]: {
              nodeId: selectedNode,
              nodeName: selectedNodeName || `Node ${selectedNode}`,
              messages: localMessages
                .map((msg: any, idx: number) => ({
                  id:
                    msg.id ||
                    (typeof msg.timestamp === "string"
                      ? `${msg.timestamp}-${idx}`
                      : `msg-${idx}-${selectedNode || "unknown"}`),
                  role: msg.role,
                  content: msg.content,
                  timestamp: msg.timestamp
                    ? new Date(msg.timestamp)
                    : new Date(),
                }))
                .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
            },
          }));
        }
      }
    })();
  }, [selectedNode, selectedCanvas, selectedNodeName]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC to close fullscreen or panel
      if (e.key === "Escape") {
        if (isFullscreen && onToggleFullscreen) {
          onToggleFullscreen();
        } else if (onClose) {
          onClose();
        }
      }
      // Ctrl/Cmd + Shift + C to toggle collapse
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key === "C" &&
        onToggleCollapse
      ) {
        e.preventDefault();
        onToggleCollapse();
      }
      // F11 or Ctrl/Cmd + Shift + F to toggle fullscreen
      if (
        (e.key === "F11" ||
          ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "F")) &&
        onToggleFullscreen
      ) {
        e.preventDefault();
        onToggleFullscreen();
      }
    };

    if (selectedNode) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [
    selectedNode,
    isFullscreen,
    onToggleFullscreen,
    onToggleCollapse,
    onClose,
  ]);

  const currentConversation = selectedNode
    ? conversations[selectedNode] ?? {
        nodeId: selectedNode,
        nodeName: selectedNodeName ?? `Node ${selectedNode}`,
        messages: [],
      }
    : null;

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [currentConversation?.messages]);

  const getNodeModel = (nodeId: string): string => {
    // Get the model from the node's stored data, fallback to default
    if (canvasData?.nodes) {
      const node = canvasData.nodes.find((n: any) => n._id === nodeId);
      if (node?.model) {
        return node.model;
      }
    }
    // Fallback to default model if node model not found
    return getDefaultModel();
  };

  // Auto-resize textarea function
  const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    const newHeight = Math.min(textarea.scrollHeight, 120); // Max height of ~5 lines
    textarea.style.height = newHeight + "px";
  };

  // Handle input change with auto-resize
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    autoResizeTextarea(e.target);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedNode || !selectedCanvas) return;

    const genId = () =>
      Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    const newMessage: Message = {
      id: genId(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    // Add user message to local state
    setConversations((prev) => {
      const prevMessages = prev[selectedNode]?.messages || [];
      return {
        ...prev,
        [selectedNode]: {
          ...(prev[selectedNode] || {
            nodeId: selectedNode,
            nodeName: selectedNodeName || `Node ${selectedNode}`,
          }),
          messages: [...prevMessages, newMessage],
        },
      };
    });

    setInputValue("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsTyping(true);

    // Save user message to database first
    try {
      console.log(
        `Saving user message to: /api/canvases/${selectedCanvas}/nodes/${selectedNode}/messages`
      );
      const saveResponse = await fetch(
        `/api/canvases/${selectedCanvas}/nodes/${selectedNode}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: newMessage.id,
            role: newMessage.role,
            content: newMessage.content,
            timestamp: newMessage.timestamp.toISOString(),
          }),
        }
      );

      if (!saveResponse.ok) {
        console.error(
          `Failed to save user message: ${saveResponse.status} ${saveResponse.statusText}`
        );
        const errorText = await saveResponse.text();
        console.error("Error details:", errorText);
      } else {
        console.log("User message saved successfully");
      }
    } catch (err) {
      console.error("Failed to save user message:", err);
    }

    // Call LLM API through internal proxy
    try {
      const model = getNodeModel(selectedNode);
      const payload = {
        canvasId: selectedCanvas,
        nodeId: selectedNode,
        model,
        message: newMessage.content,
      };

      // Use internal API proxy instead of direct external call
      const res = await fetch("/api/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();

        const botResponse: Message = {
          id: genId(),
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
        };

        // Add assistant message to local state
        setConversations((prev) => {
          const prevMessages = prev[selectedNode]?.messages || [];
          return {
            ...prev,
            [selectedNode]: {
              ...(prev[selectedNode] || {
                nodeId: selectedNode,
                nodeName: selectedNodeName || `Node ${selectedNode}`,
              }),
              messages: [...prevMessages, botResponse],
            },
          };
        });

        // Save assistant message to database
        try {
          await fetch(
            `/api/canvases/${selectedCanvas}/nodes/${selectedNode}/messages`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: botResponse.id,
                role: botResponse.role,
                content: botResponse.content,
                timestamp: botResponse.timestamp.toISOString(),
              }),
            }
          );
        } catch (err) {
          console.error("Failed to save assistant message:", err);
        }
      } else {
        // Handle HTTP error responses
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Service error (${res.status})`);
      }
    } catch (err) {
      console.error("Chat service error:", err);

      // Show user-friendly error message
      const errorMessage =
        err instanceof Error ? err.message : "Unable to get AI response";
      toast({
        title: "Chat Error",
        description: errorMessage,
        variant: "destructive",
      });

      // Save user message to localStorage as fallback
      storageService.saveNodeMessages(selectedCanvas, selectedNode, [
        ...storageService.getNodeMessages(selectedCanvas, selectedNode),
        {
          id: newMessage.id,
          role: newMessage.role,
          content: newMessage.content,
          timestamp: new Date().toISOString(),
        },
      ]);

      // Add fallback bot response
      const botResponse: Message = {
        id: genId(),
        role: "assistant",
        content: `Sorry, I'm unable to respond right now. ${
          errorMessage.includes("not configured")
            ? "The LLM service needs to be configured."
            : "Please try again later."
        }`,
        timestamp: new Date(),
      };

      setConversations((prev) => {
        const prevMessages = prev[selectedNode]?.messages || [];
        return {
          ...prev,
          [selectedNode]: {
            ...(prev[selectedNode] || {
              nodeId: selectedNode,
              nodeName: selectedNodeName || `Node ${selectedNode}`,
            }),
            messages: [...prevMessages, botResponse],
          },
        };
      });
    } finally {
      setIsTyping(false);
    }
  };

  // Fork Indicator Component
  const ForkIndicator = memo(({ messageId }: { messageId: string }) => {
    // Only render on client-side to avoid hydration issues
    if (!isClient) return null;

    const forkedNodes = getForkedNodes(messageId);

    if (forkedNodes.length === 0) return null;

    return (
      <div className="mt-2 pt-2 border-t border-slate-100/40">
        <div className="flex items-center gap-1.5 mb-1.5">
          <GitBranch size={10} className="text-slate-400" />
          <span className="text-xs text-slate-500">
            Forked {forkedNodes.length}x
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {forkedNodes.map((node: any) => {
            const nodeTypeIcon =
              node.type === "branch"
                ? "🔀"
                : node.type === "context"
                ? "📁"
                : "▶️";
            const nodeTypeName =
              node.type.charAt(0).toUpperCase() + node.type.slice(1);

            // Display short node ID for identification
            const shortNodeId = node._id.slice(-8);

            return (
              <button
                key={node._id}
                onClick={() => {
                  // Navigate to the forked node
                  props.onNodeSelect?.(
                    node._id,
                    node.name || `${nodeTypeName} Node`
                  );
                  toast({
                    title: "Navigated to branch",
                    description: `Switched to ${
                      node.name || nodeTypeName
                    } node (${shortNodeId})`,
                  });
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title={`Navigate to ${node.name || nodeTypeName} node (ID: ${
                  node._id
                }) - ${node.chatMessages?.length || 0} messages`}
              >
                <span className="text-xs">{nodeTypeIcon}</span>
                <span className="font-mono text-xs">{shortNodeId}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  });

  ForkIndicator.displayName = "ForkIndicator";

  // Function to parse and render thinking content
  const parseThinkingContent = (content: string) => {
    const thinkingRegex = /<think>([\s\S]*?)<\/think>/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = thinkingRegex.exec(content)) !== null) {
      // Add content before thinking block
      if (match.index > lastIndex) {
        parts.push({
          type: "regular",
          content: content.slice(lastIndex, match.index),
        });
      }

      // Add thinking block
      parts.push({
        type: "thinking",
        content: match[1].trim(),
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining content after last thinking block
    if (lastIndex < content.length) {
      parts.push({
        type: "regular",
        content: content.slice(lastIndex),
      });
    }

    return parts.length > 0 ? parts : [{ type: "regular", content }];
  };

  const MessageComponent = memo(
    ({ message }: { message: Message }) => {
      const isUser = message.role === "user";
      const [hovered, setHovered] = useState(false);
      const [showThinking, setShowThinking] = useState<{
        [key: string]: boolean;
      }>({});
      const [copiedCode, setCopiedCode] = useState<{ [key: string]: boolean }>(
        {}
      );

      const copyToClipboard = async (text: string, codeId: string) => {
        try {
          await navigator.clipboard.writeText(text);
          setCopiedCode((prev) => ({ ...prev, [codeId]: true }));

          // Show success toast
          toast({
            title: "Code copied!",
            description: "Code has been copied to clipboard",
          });

          // Reset copy status after 2 seconds
          setTimeout(() => {
            setCopiedCode((prev) => ({ ...prev, [codeId]: false }));
          }, 2000);
        } catch (err) {
          console.error("Failed to copy text: ", err);
          toast({
            title: "Copy failed",
            description: "Failed to copy code to clipboard",
          });
        }
      };

      const handleFork = async () => {
        if (!selectedCanvas || !selectedNode) return;

        // Show model selection dialog instead of immediately creating node
        setPendingForkMessage(message.id.replace(/-a$/, ""));
        setShowForkModelDialog(true);
      };

      const createForkWithModel = async (selectedForkModel: string) => {
        if (!selectedCanvas || !selectedNode || !pendingForkMessage) return;

        // Create a new branch/context node (default to branch) with lineage metadata
        const newNodeId = `node_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`;
        const newNode = {
          _id: newNodeId,
          primary: false,
          type: "branch",
          chatMessages: [],
          runningSummary: "",
          contextContract: "",
          model: selectedForkModel,
          parentNodeId: selectedNode,
          forkedFromMessageId: pendingForkMessage,
          createdAt: new Date().toISOString(),
          position: {
            x: 300 + Math.random() * 150,
            y: 200 + Math.random() * 150,
          },
        } as any;

        try {
          // Optimistic: dispatch events before network to feel instant
          const edgeId = `edge_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 8)}`;

          const edgePayload = {
            _id: edgeId,
            from: selectedNode,
            to: newNodeId,
            createdAt: new Date().toISOString(),
            meta: { condition: "Fork" },
          };

          window.dispatchEvent(
            new CustomEvent("canvas-fork-node", {
              detail: {
                canvasId: selectedCanvas,
                node: newNode,
                edge: edgePayload,
              },
            })
          );

          // Fire & forget persistence
          fetch(`/api/canvases/${selectedCanvas}/nodes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newNode),
          }).then(async (r) => {
            if (!r.ok)
              console.error("Failed to persist fork node", await r.text());
          });
          fetch(`/api/canvases/${selectedCanvas}/edges`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(edgePayload),
          }).then(async (r) => {
            if (!r.ok)
              console.error("Failed to persist fork edge", await r.text());
          });

          // Dispatch custom event so canvas updates immediately
          // Ask canvas to select the new node
          console.log(
            `Fork created: switching from node ${selectedNode} to new node ${newNodeId}`
          );
          window.dispatchEvent(
            new CustomEvent("canvas-select-node", {
              detail: { nodeId: newNodeId },
            })
          );

          // Toast confirmation
          const modelName =
            AVAILABLE_MODELS.find((m) => m.value === selectedForkModel)
              ?.label || selectedForkModel;
          toast({
            title: "Fork created",
            description: `New node created with ${modelName}`,
          });
        } catch (e) {
          console.error("Error forking node", e);
        }
      };

      return (
        <div
          className={`flex ${isUser ? "justify-end" : "justify-start"} mb-6`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div className={`max-w-[85%] ${isUser ? "order-2" : "order-1"}`}>
            <div
              className={`flex items-start gap-3 ${
                isUser ? "flex-row-reverse" : ""
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isUser
                    ? "bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-sm"
                    : "bg-gradient-to-br from-blue-50 to-indigo-50 text-slate-600 border border-slate-200/50"
                }`}
              >
                {isUser ? <User size={16} /> : <Sparkles size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={`rounded-xl px-4 py-3 transition-all duration-300 ${
                    isUser
                      ? "bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-lg hover:shadow-xl"
                      : "bg-white/90 backdrop-blur-sm border border-slate-200/50 text-slate-800 shadow-lg hover:shadow-xl hover:bg-white"
                  }`}
                >
                  {isUser ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap font-light">
                      {message.content}
                    </p>
                  ) : (
                    <div className="text-sm leading-relaxed font-light">
                      {parseThinkingContent(message.content).map(
                        (part, index) => (
                          <div key={index}>
                            {part.type === "thinking" ? (
                              <div className="mb-3">
                                <button
                                  onClick={() =>
                                    setShowThinking((prev) => ({
                                      ...prev,
                                      [`${message.id}-${index}`]:
                                        !prev[`${message.id}-${index}`],
                                    }))
                                  }
                                  className="flex items-center gap-2 text-xs text-purple-600 hover:text-purple-700 font-medium mb-2 transition-colors"
                                >
                                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
                                  {showThinking[`${message.id}-${index}`]
                                    ? "Hide thinking"
                                    : "Show thinking"}
                                  <div
                                    className={`transform transition-transform duration-200 ${
                                      showThinking[`${message.id}-${index}`]
                                        ? "rotate-90"
                                        : ""
                                    }`}
                                  >
                                    ▶
                                  </div>
                                </button>
                                {showThinking[`${message.id}-${index}`] && (
                                  <div className="bg-gradient-to-r from-purple-50/80 to-indigo-50/80 border-l-4 border-purple-300 rounded-r-lg p-3 animate-in slide-in-from-top-2 duration-300 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="w-4 h-4 rounded-full bg-purple-100 flex items-center justify-center">
                                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                      </div>
                                      <span className="text-xs font-medium text-purple-700 uppercase tracking-wide">
                                        AI Thinking Process
                                      </span>
                                    </div>
                                    <div className="text-sm text-purple-800 leading-relaxed whitespace-pre-wrap italic">
                                      {part.content}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : part.content.trim() ? (
                              <div className="prose prose-sm max-w-none prose-slate prose-headings:font-light prose-headings:text-slate-900 prose-p:text-slate-700 prose-strong:text-slate-900 prose-strong:font-medium prose-code:text-slate-800 prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  rehypePlugins={[rehypeHighlight]}
                                  components={{
                                    h1: ({ children }) => (
                                      <h1 className="text-lg font-light text-slate-900 mt-4 mb-2 first:mt-0">
                                        {children}
                                      </h1>
                                    ),
                                    h2: ({ children }) => (
                                      <h2 className="text-base font-light text-slate-900 mt-3 mb-2 first:mt-0">
                                        {children}
                                      </h2>
                                    ),
                                    h3: ({ children }) => (
                                      <h3 className="text-sm font-medium text-slate-900 mt-3 mb-1 first:mt-0">
                                        {children}
                                      </h3>
                                    ),
                                    p: ({ children }) => (
                                      <p className="text-slate-700 mb-2 last:mb-0 font-light leading-relaxed">
                                        {children}
                                      </p>
                                    ),
                                    code: ({ children, className }) => {
                                      const isInlineCode = !className;
                                      if (isInlineCode) {
                                        const codeText = String(
                                          children
                                        ).replace(/\n$/, "");
                                        const codeId = `inline-${
                                          message.id
                                        }-${codeText.substring(0, 10)}`;

                                        return (
                                          <span className="relative inline-block group">
                                            <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-xs font-mono">
                                              {children}
                                            </code>
                                            <button
                                              onClick={() =>
                                                copyToClipboard(
                                                  codeText,
                                                  codeId
                                                )
                                              }
                                              className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-slate-200 hover:bg-slate-300 rounded-full p-1 transition-all duration-200 transform scale-75 hover:scale-100 shadow-sm hover:shadow-md"
                                              title={
                                                copiedCode[codeId]
                                                  ? "Copied!"
                                                  : "Copy code"
                                              }
                                            >
                                              {copiedCode[codeId] ? (
                                                <Check
                                                  size={8}
                                                  className="text-green-600"
                                                />
                                              ) : (
                                                <Copy
                                                  size={8}
                                                  className="text-slate-600"
                                                />
                                              )}
                                            </button>
                                          </span>
                                        );
                                      }
                                      return (
                                        <code className={className}>
                                          {children}
                                        </code>
                                      );
                                    },
                                    pre: ({ children }) => {
                                      // Extract text content from nested React elements
                                      const extractTextContent = (
                                        element: any
                                      ): string => {
                                        if (typeof element === "string")
                                          return element;
                                        if (typeof element === "number")
                                          return String(element);
                                        if (Array.isArray(element))
                                          return element
                                            .map(extractTextContent)
                                            .join("");
                                        if (element?.props?.children)
                                          return extractTextContent(
                                            element.props.children
                                          );
                                        return "";
                                      };

                                      const codeText = extractTextContent(
                                        children
                                      ).replace(/\n$/, "");
                                      const codeId = `block-${
                                        message.id
                                      }-${Math.random()
                                        .toString(36)
                                        .substr(2, 9)}`;

                                      return (
                                        <div className="relative group">
                                          <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 pr-12 overflow-x-auto text-xs font-mono">
                                            {children}
                                          </pre>
                                          <button
                                            onClick={() =>
                                              copyToClipboard(codeText, codeId)
                                            }
                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-white/80 hover:bg-white border border-slate-200 rounded-md p-1.5 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105"
                                            title={
                                              copiedCode[codeId]
                                                ? "Copied!"
                                                : "Copy code"
                                            }
                                          >
                                            {copiedCode[codeId] ? (
                                              <Check
                                                size={14}
                                                className="text-green-600"
                                              />
                                            ) : (
                                              <Copy
                                                size={14}
                                                className="text-slate-600"
                                              />
                                            )}
                                          </button>
                                        </div>
                                      );
                                    },
                                    ul: ({ children }) => (
                                      <ul className="list-disc list-inside space-y-1 text-slate-700 font-light">
                                        {children}
                                      </ul>
                                    ),
                                    ol: ({ children }) => (
                                      <ol className="list-decimal list-inside space-y-1 text-slate-700 font-light">
                                        {children}
                                      </ol>
                                    ),
                                    li: ({ children }) => (
                                      <li className="text-slate-700 font-light">
                                        {children}
                                      </li>
                                    ),
                                    blockquote: ({ children }) => (
                                      <blockquote className="border-l-4 border-slate-300 pl-4 py-2 bg-slate-50 rounded-r-lg my-2">
                                        {children}
                                      </blockquote>
                                    ),
                                    strong: ({ children }) => (
                                      <strong className="font-medium text-slate-900">
                                        {children}
                                      </strong>
                                    ),
                                    em: ({ children }) => (
                                      <em className="italic text-slate-700">
                                        {children}
                                      </em>
                                    ),
                                  }}
                                >
                                  {part.content}
                                </ReactMarkdown>
                              </div>
                            ) : null}
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* Fork Indicator - Show forked nodes for both user and assistant messages */}
                  <ForkIndicator messageId={message.id.replace(/-a$/, "")} />

                  {!isUser && hovered && (
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handleFork}
                        className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-150 text-slate-600 border border-slate-200/70 hover:border-slate-300/70 transition-all duration-200 font-medium shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95"
                        title="Fork new node from this AI response"
                      >
                        Fork Node
                      </button>
                    </div>
                  )}
                </div>
                <p
                  className={`text-xs mt-2 px-1 ${
                    isUser ? "text-slate-400" : "text-slate-400"
                  }`}
                >
                  {(() => {
                    if (!message.timestamp) return "";
                    const dateObj =
                      typeof message.timestamp === "string"
                        ? new Date(message.timestamp)
                        : message.timestamp;
                    return isNaN(dateObj.getTime())
                      ? ""
                      : dateObj.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                  })()}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    },
    (prev, next) =>
      prev.message?.id === next.message?.id &&
      prev.message?.content === next.message?.content
  );

  const TypingIndicator = () => (
    <div className="flex justify-start mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="max-w-[85%] order-1">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-50 to-indigo-50 text-slate-600 border border-slate-200/50">
            <img
              src="/contexttree-symbol.svg"
              alt="ContextTree"
              className="w-4 h-4"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="rounded-xl px-4 py-3 bg-white/90 backdrop-blur-sm border border-slate-200/50 text-slate-800 shadow-lg transition-all duration-300">
              <div className="flex items-center gap-1">
                <div className="flex gap-1">
                  <div
                    className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
                <span className="text-xs text-slate-500 ml-2">
                  AI is thinking...
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Model Selection Dialog for Fork
  const ModelSelectionDialog = () => {
    const [selectedModelForFork, setSelectedModelForFork] = useState<string>(
      getDefaultModel()
    );

    if (!showForkModelDialog) return null;

    const handleSubmit = () => {
      createForkWithModel(selectedModelForFork);
      setShowForkModelDialog(false);
      setPendingForkMessage(null);
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              Select Model for New Node
            </h3>
            <p className="text-sm text-slate-600">
              Choose which AI model this forked node should use for
              conversations.
            </p>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto mb-6">
            {AVAILABLE_MODELS.map((model) => (
              <button
                key={model.value}
                onClick={() => setSelectedModelForFork(model.value)}
                className={`w-full text-left p-3 rounded-xl border transition-all duration-200 group ${
                  selectedModelForFork === model.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      selectedModelForFork === model.value
                        ? "bg-blue-600"
                        : "bg-blue-500 group-hover:bg-blue-600"
                    }`}
                  ></div>
                  <div>
                    <div
                      className={`font-medium ${
                        selectedModelForFork === model.value
                          ? "text-blue-800"
                          : "text-slate-800 group-hover:text-blue-800"
                      }`}
                    >
                      {model.label}
                    </div>
                    <div
                      className={`text-xs mt-1 ${
                        selectedModelForFork === model.value
                          ? "text-blue-600"
                          : "text-slate-500 group-hover:text-blue-600"
                      }`}
                    >
                      {model.description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowForkModelDialog(false);
                setPendingForkMessage(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Create Node
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <ModelSelectionDialog />
      <div
        className={`h-full flex flex-col ${
          isFullscreen
            ? "bg-slate-50"
            : "bg-white/95 backdrop-blur-sm border-l border-slate-200/80 shadow-sm"
        }`}
      >
        {/* Collapsed State */}
        {isCollapsed && !isFullscreen ? (
          <div className="h-full flex flex-col items-center py-4">
            {/* Collapsed Header */}
            <div className="flex flex-col items-center gap-3 mb-6">
              <button
                onClick={onToggleCollapse}
                className="w-8 h-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center border border-slate-200/50 hover:bg-gradient-to-br hover:from-blue-100 hover:to-indigo-100 transition-colors cursor-pointer"
                title="Expand chat panel"
              >
                <MessageSquare className="w-4 h-4 text-slate-600" />
              </button>
              {selectedNode && (
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              )}
            </div>

            {/* Collapsed Controls */}
            <div className="flex flex-col gap-2">
              {selectedNode && onToggleFullscreen && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleFullscreen}
                  className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 p-2 h-auto"
                  title="Fullscreen chat"
                >
                  <Maximize2 size={16} />
                </Button>
              )}

              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 h-auto"
                  title="Close chat"
                >
                  <X size={16} />
                </Button>
              )}
            </div>

            {/* Message indicator for collapsed state */}
            {selectedNode && (
              <div className="mt-auto mb-4 text-center">
                <div className="text-xs text-slate-400 font-medium mb-1">
                  {currentConversation?.messages?.length || 0}
                </div>
                <div className="text-xs text-slate-500">msgs</div>
              </div>
            )}

            {/* Quick compose in collapsed state */}
            {selectedNode && (
              <div className="mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleCollapse}
                  className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 p-2 h-auto"
                  title="Quick compose"
                >
                  <Send size={14} />
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Expanded State */
          <>
            {/* Header */}
            <div
              className={`flex-shrink-0 border-b border-slate-200/80 ${
                isFullscreen
                  ? "p-6 bg-white/95 backdrop-blur-sm shadow-sm"
                  : "p-4"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                    <h3
                      className={`font-light text-slate-900 truncate ${
                        isFullscreen ? "text-xl" : "text-lg"
                      }`}
                    >
                      {selectedNode
                        ? currentConversation?.nodeName || "Node Chat"
                        : "Node Chat"}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-500 font-light">
                    {selectedNode
                      ? `${
                          currentConversation?.messages?.length || 0
                        } messages • ${
                          AVAILABLE_MODELS.find(
                            (m) => m.value === getNodeModel(selectedNode)
                          )?.label || getNodeModel(selectedNode)
                        } • Active session`
                      : "Select a node to start chatting"}
                  </p>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {selectedNode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        console.log(
                          "Manual refresh requested for node:",
                          selectedNode
                        );
                        if (selectedNode && selectedCanvas) {
                          // Force reload conversation by clearing it first
                          setConversations((prev) => {
                            const newConv = { ...prev };
                            delete newConv[selectedNode];
                            return newConv;
                          });
                          // The useEffect will reload it automatically
                        }
                      }}
                      className="text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 rounded-lg transition-all duration-200"
                      title="Refresh conversation"
                    >
                      <Settings size={16} />
                    </Button>
                  )}

                  {onToggleCollapse && !isFullscreen && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onToggleCollapse}
                      className="text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 rounded-lg transition-all duration-200"
                      title="Collapse chat panel"
                    >
                      <PanelRightClose size={18} />
                    </Button>
                  )}

                  {selectedNode && onToggleFullscreen && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onToggleFullscreen}
                      className="text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 rounded-lg transition-all duration-200"
                      title={
                        isFullscreen ? "Exit fullscreen" : "Fullscreen chat"
                      }
                    >
                      {isFullscreen ? (
                        <Minimize2 size={18} />
                      ) : (
                        <Maximize2 size={18} />
                      )}
                    </Button>
                  )}

                  {onClose && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                      className="text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 rounded-lg transition-all duration-200"
                      title="Close chat"
                    >
                      <X size={18} />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Chat Content */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
              {selectedNode ? (
                <>
                  {/* Messages */}
                  <div className="flex-1 min-h-0 relative">
                    <ScrollArea
                      className={`h-full ${isFullscreen ? "p-6" : "p-4"}`}
                      ref={scrollAreaRef}
                    >
                      <div
                        className={`space-y-1 pb-32 ${
                          isFullscreen ? "max-w-4xl mx-auto" : ""
                        }`}
                      >
                        {/* Show fork origin info if this node was forked */}
                        {canvasData?.nodes &&
                          selectedNode &&
                          (() => {
                            const currentNode = canvasData.nodes.find(
                              (n: any) => n._id === selectedNode
                            );
                            if (
                              currentNode?.parentNodeId &&
                              currentNode?.forkedFromMessageId
                            ) {
                              const parentNode = canvasData.nodes.find(
                                (n: any) => n._id === currentNode.parentNodeId
                              );
                              const shortCurrentId = selectedNode.slice(-8);
                              const shortParentId =
                                currentNode.parentNodeId.slice(-8);
                              const shortMessageId =
                                currentNode.forkedFromMessageId.slice(-8);

                              return (
                                <div className="mb-2 p-2 bg-slate-50/60 border border-slate-100 rounded-md">
                                  <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <GitBranch
                                      size={10}
                                      className="text-slate-500"
                                    />
                                    <span>Forked from</span>
                                    <button
                                      onClick={() => {
                                        props.onNodeSelect?.(
                                          currentNode.parentNodeId,
                                          parentNode?.name || "Parent Node"
                                        );
                                        toast({
                                          title: "Navigated to parent",
                                          description: `Switched to parent node (${shortParentId})`,
                                        });
                                      }}
                                      className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs hover:bg-slate-200 transition-colors"
                                      title={`Navigate to parent node: ${currentNode.parentNodeId}`}
                                    >
                                      {parentNode?.name || "Parent"} (
                                      {shortParentId})
                                    </button>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}

                        {(currentConversation?.messages?.length || 0) === 0 ? (
                          <div className="text-center py-16">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-200/50">
                              <MessageSquare className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-slate-900 text-xl font-semibold mb-2">
                              Start a conversation
                            </h3>
                            <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
                              Ask questions, share thoughts, or explore ideas
                              with this node
                            </p>
                          </div>
                        ) : (
                          <>
                            {(currentConversation?.messages || []).map(
                              (message: any) => (
                                <MessageComponent
                                  key={
                                    message.id || message.timestamp?.toString()
                                  }
                                  message={message}
                                />
                              )
                            )}
                            {isTyping && <TypingIndicator />}
                          </>
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Model Selection & Input Area */}
                  <div
                    className={`absolute bottom-0 left-0 right-0 bg-transparent ${
                      isFullscreen ? "p-6" : "p-4"
                    } z-10`}
                  >
                    {/* Floating Glass Message Input */}
                    <div
                      className={`relative ${
                        isFullscreen ? "max-w-4xl mx-auto" : ""
                      }`}
                    >
                      {/* Floating glass input container */}
                      <div className="relative backdrop-blur-xl bg-white/20 border border-slate-300/40 rounded-full shadow-2xl shadow-slate-900/10 ring-1 ring-slate-200/50 hover:bg-white/25 hover:border-slate-400/60 transition-all duration-300">
                        <div className="flex items-center gap-2 p-2">
                          <div className="flex-1 relative">
                            <Textarea
                              ref={textareaRef}
                              placeholder={
                                isTyping
                                  ? "AI is responding..."
                                  : "Ask anything..."
                              }
                              value={inputValue}
                              onChange={handleInputChange}
                              onKeyPress={(e) => {
                                if (
                                  e.key === "Enter" &&
                                  !e.shiftKey &&
                                  !isTyping
                                ) {
                                  e.preventDefault();
                                  handleSendMessage();
                                }
                              }}
                              disabled={isTyping}
                              className="min-h-[40px] max-h-[120px] w-full px-4 py-3 bg-transparent border-0 resize-none focus:ring-0 focus:outline-none text-slate-900 placeholder:text-slate-500 text-sm leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed rounded-full"
                              style={{ height: "auto" }}
                            />
                          </div>

                          {/* Send Button */}
                          <Button
                            onClick={handleSendMessage}
                            disabled={!inputValue.trim() || isTyping}
                            className="w-10 h-10 p-0 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white rounded-full shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 border-2 border-white/20"
                          >
                            <Send size={16} />
                          </Button>
                        </div>
                      </div>

                      {/* Subtle ambient glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-indigo-500/5 rounded-full pointer-events-none blur-xl"></div>
                    </div>
                  </div>
                </>
              ) : (
                /* No Node Selected State */
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center space-y-6 max-w-sm">
                    <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl flex items-center justify-center mx-auto border border-slate-200/50">
                      <MessageSquare className="h-10 w-10 text-slate-400" />
                    </div>
                    <div>
                      <h3 className="text-slate-900 font-semibold text-xl mb-3">
                        No Node Selected
                      </h3>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        Click on a node in the canvas to start a focused
                        conversation and explore your ideas
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
