"use client";

import { useState, useEffect, useRef, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "lucide-react";
import { storageService } from "@/lib/storage";
import { toast } from "@/hooks/use-toast";

const LLM_API_URL = process.env.NEXT_PUBLIC_LLM_API_URL || "";

// Available AI models
const AVAILABLE_MODELS = [
  { value: "gpt-4", label: "GPT-4", provider: "OpenAI" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo", provider: "OpenAI" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", provider: "OpenAI" },
  { value: "claude-3-opus", label: "Claude 3 Opus", provider: "Anthropic" },
  { value: "claude-3-sonnet", label: "Claude 3 Sonnet", provider: "Anthropic" },
  { value: "claude-3-haiku", label: "Claude 3 Haiku", provider: "Anthropic" },
  { value: "gemini-pro", label: "Gemini Pro", provider: "Google" },
  {
    value: "gemini-pro-vision",
    label: "Gemini Pro Vision",
    provider: "Google",
  },
] as const;

interface ChatPanelProps {
  selectedNode: string | null;
  selectedNodeName?: string;
  onClose?: () => void;
  selectedCanvas?: string | null;
  isFullscreen?: boolean;
  isCollapsed?: boolean;
  onToggleFullscreen?: () => void;
  onToggleCollapse?: () => void;
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

const mockNodeConversations: Record<string, NodeConversation> = {
  "1": {
    nodeId: "1",
    nodeName: "Entry Point",
    messages: [
      {
        id: "m1",
        role: "assistant",
        content: "Hello! How can I help you today?",
        timestamp: new Date(Date.now() - 3600000),
      },
    ],
  },
  "2": {
    nodeId: "2",
    nodeName: "Branch Point",
    messages: [
      {
        id: "m2",
        role: "user",
        content: "I need help with my order",
        timestamp: new Date(Date.now() - 3000000),
      },
      {
        id: "m3",
        role: "assistant",
        content:
          "I'd be happy to help you with your order! Could you please provide your order number?",
        timestamp: new Date(Date.now() - 2000000),
      },
    ],
  },
};

export function ChatPanel({
  selectedNode,
  selectedNodeName,
  onClose,
  selectedCanvas,
  isFullscreen = false,
  isCollapsed = false,
  onToggleFullscreen,
  onToggleCollapse,
}: ChatPanelProps) {
  const [conversations, setConversations] = useState<
    Record<string, NodeConversation>
  >(mockNodeConversations);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Ensure a conversation object exists for the selected node so the UI can render immediately
  useEffect(() => {
    if (!selectedNode) return;

    setConversations((prev) => {
      if (prev[selectedNode]) return prev;
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
        const res = await fetch(`/api/canvases/${selectedCanvas}`);
        if (res.ok) {
          const data = await res.json();
          const canvas = data.canvas;
          const node = canvas.nodes?.find((n: any) => n._id === selectedNode);
          if (node && node.chatMessages) {
            setConversations((prev) => ({
              ...prev,
              [selectedNode]: {
                nodeId: selectedNode,
                nodeName:
                  selectedNodeName || node.name || `Node ${selectedNode}`,
                messages: node.chatMessages.flatMap((msg: any, idx: number) => {
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
                          : `${Date.now()}-${idx}`),
                      role: msg.role,
                      content: msg.content,
                      timestamp: msg.timestamp
                        ? new Date(msg.timestamp)
                        : new Date(),
                    },
                  ];
                }),
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
              messages: localMessages.map((msg: any, idx: number) => ({
                id:
                  msg.id ||
                  (typeof msg.timestamp === "string"
                    ? `${msg.timestamp}-${idx}`
                    : `${Date.now()}-${idx}`),
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
              })),
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
    // Use the selected model from the dropdown
    return selectedModel;
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

    // Call LLM API
    try {
      const model = getNodeModel(selectedNode);
      const payload = {
        canvasId: selectedCanvas,
        nodeId: selectedNode,
        model,
        message: newMessage.content,
      };

      const res = await fetch(LLM_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        console.log("LLM API response:", data);

        const botResponse: Message = {
          id: genId(),
          role: "assistant",
          content: data.message || data.response,
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
      }
    } catch (err) {
      console.error("LLM API error:", err);

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
        content: "Sorry, the LLM API is not available.",
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

  const MessageComponent = memo(
    ({ message }: { message: Message }) => {
      const isUser = message.role === "user";
      const [hovered, setHovered] = useState(false);

      const handleFork = async () => {
        if (!selectedCanvas || !selectedNode) return;
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
          model: selectedModel,
          parentNodeId: selectedNode,
          forkedFromMessageId: message.id.replace(/-a$/, ""),
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
          window.dispatchEvent(
            new CustomEvent("canvas-select-node", {
              detail: { nodeId: newNodeId },
            })
          );

          // Toast confirmation
          toast({
            title: "Fork created",
            description: `New node ${newNodeId} forked from message`,
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
                  className={`rounded-xl px-4 py-3 ${
                    isUser
                      ? "bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-sm"
                      : "bg-white border border-slate-200/50 text-slate-800 shadow-sm"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                  {!isUser && hovered && (
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handleFork}
                        className="text-xs px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200/70 transition-colors"
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
    <div className="flex justify-start mb-6">
      <div className="max-w-[85%] order-1">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-50 to-indigo-50 text-slate-600 border border-slate-200/50">
            <Sparkles size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="rounded-xl px-4 py-3 bg-white border border-slate-200/50 text-slate-800 shadow-sm">
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

  return (
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
                    className={`font-semibold text-slate-900 truncate ${
                      isFullscreen ? "text-xl" : "text-base"
                    }`}
                  >
                    {selectedNode
                      ? currentConversation?.nodeName || "Node Chat"
                      : "Node Chat"}
                  </h3>
                </div>
                <p className="text-sm text-slate-500">
                  {selectedNode
                    ? `${
                        currentConversation?.messages?.length || 0
                      } messages • ${
                        AVAILABLE_MODELS.find((m) => m.value === selectedModel)
                          ?.label || selectedModel
                      } • Active session`
                    : "Select a node to start chatting"}
                </p>
              </div>

              <div className="flex items-center gap-1 ml-4">
                {onToggleCollapse && !isFullscreen && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleCollapse}
                    className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
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
                    className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                    title={isFullscreen ? "Exit fullscreen" : "Fullscreen chat"}
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
                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    title="Close chat"
                  >
                    <X size={18} />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Chat Content */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {selectedNode ? (
              <>
                {/* Messages */}
                <div className="flex-1 min-h-0 relative">
                  <ScrollArea
                    className={`h-full ${isFullscreen ? "p-6" : "p-4"}`}
                    ref={scrollAreaRef}
                  >
                    <div
                      className={`space-y-1 pb-4 ${
                        isFullscreen ? "max-w-4xl mx-auto" : ""
                      }`}
                    >
                      {(currentConversation?.messages?.length || 0) === 0 ? (
                        <div className="text-center py-16">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-200/50">
                            <MessageSquare className="w-8 h-8 text-slate-400" />
                          </div>
                          <h3 className="text-slate-900 text-xl font-semibold mb-2">
                            Start a conversation
                          </h3>
                          <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
                            Ask questions, share thoughts, or explore ideas with
                            this node
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
                  className={`flex-shrink-0 border-t border-slate-200/80 bg-white/50 backdrop-blur-sm ${
                    isFullscreen ? "p-6" : "p-4"
                  }`}
                >
                  {/* Model Selector */}
                  <div className={`mb-3 ${isFullscreen ? "" : "mb-2"}`}>
                    <div
                      className={`flex items-center gap-3 ${
                        isFullscreen ? "" : "gap-2"
                      }`}
                    >
                      <div
                        className={`flex items-center gap-2 text-slate-500 ${
                          isFullscreen ? "text-xs" : "text-xs"
                        }`}
                      >
                        <Settings size={isFullscreen ? 14 : 12} />
                        <span>Model:</span>
                      </div>
                      <Select
                        value={selectedModel}
                        onValueChange={setSelectedModel}
                      >
                        <SelectTrigger
                          className={`${
                            isFullscreen ? "w-48 h-8" : "w-40 h-7"
                          } text-xs`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_MODELS.map((model) => (
                            <SelectItem key={model.value} value={model.value}>
                              <div className="flex items-center justify-between w-full">
                                <span className="text-xs">{model.label}</span>
                                <span className="text-xs text-slate-400 ml-2">
                                  {model.provider}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Message Input */}
                  <div
                    className={`flex gap-3 ${
                      isFullscreen ? "max-w-4xl mx-auto" : ""
                    }`}
                  >
                    <div className="flex-1 relative">
                      <Input
                        placeholder={
                          isTyping
                            ? "AI is responding..."
                            : "Type your message..."
                        }
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" &&
                          !e.shiftKey &&
                          !isTyping &&
                          handleSendMessage()
                        }
                        disabled={isTyping}
                        className="w-full px-4 py-3 bg-white border-slate-200/80 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isTyping}
                      className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send size={18} />
                    </Button>
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
  );
}
