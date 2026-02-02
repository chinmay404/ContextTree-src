"use client";

import { useState, useEffect, useRef, memo, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  Send,
  User,
  MessageSquare,
  X,
  Maximize2,
  Minimize2,
  Sparkles,
  Zap, 
  Brain,
  Cpu,
  Fan,
  PanelRightClose,
  GitBranch,
  ArrowDown,
  Copy,
  Check,
  StickyNote,
  Plus,
  Bot,
  Play,
  Clock,
  Database,
  CornerDownLeft,
  ArrowRight,
  Edit2,
  Circle,
  GitCommitHorizontal,
  Info,
  MoreHorizontal,
} from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { storageService, CanvasNote } from "@/lib/storage";
import { toast } from "@/hooks/use-toast";
import { ALL_MODELS, getDefaultModel } from "@/lib/models";
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

const getModelIcon = (modelId: string) => {
  if (modelId.includes("gpt")) return Sparkles;
  if (modelId.includes("claude")) return Brain;
  if (modelId.includes("gemini")) return Zap;
  if (modelId.includes("llama")) return Cpu;
  if (modelId.includes("mistral")) return Fan;
  return Bot;
};

// Models loaded successfully

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

const ContextualConsole = ({
  selectedNode,
  selectedNodeName,
  onClose,
  selectedCanvas,
  isFullscreen = false,
  isCollapsed = false,
  onToggleFullscreen,
  onToggleCollapse,
  onNodeSelect,
}: ChatPanelProps) => {
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
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  const [messageCache, setMessageCache] = useState<Record<string, Message[]>>(
    {}
  );
  const [canvasNote, setCanvasNote] = useState<CanvasNote | null>(null);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [selectionPrompt, setSelectionPrompt] = useState<{
    text: string;
    position: { top: number; left: number };
  } | null>(null);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isUserNearBottomRef = useRef(true);
  const hasInitializedScrollRef = useRef(false);
  const previousMessageCountRef = useRef(0);
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSelectedNodeRef = useRef<string | null>(null);
  const [nodeLineage, setNodeLineage] = useState<Array<{id: string, name: string}>>([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInputValue, setNameInputValue] = useState("");

  // Sync name input when node changes
  useEffect(() => {
    setNameInputValue(selectedNodeName || "");
  }, [selectedNodeName]);

  const handleNameSave = async () => {
      if (!selectedNode || !selectedCanvas) return;
      
      const newName = nameInputValue.trim();
      if (!newName || newName === selectedNodeName) {
          setIsEditingName(false);
          return;
      }

      setIsEditingName(false);
      
      // Update local state
      setConversations(prev => {
          const current = prev[selectedNode];
          if (!current) return prev;
          return {
              ...prev,
              [selectedNode]: {
                  ...current,
                  nodeName: newName
              }
          };
      });

      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent("canvas-update-node", {
          detail: { 
              nodeId: selectedNode, 
              updates: { name: newName } 
          }
      }));

      // Persist
      try {
          await fetch(`/api/canvases/${selectedCanvas}/nodes/${selectedNode}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: newName })
          });
      } catch (e) {
          console.error("Failed to update node name", e);
          toast({ title: "Error", description: "Failed to save node name", variant: "destructive" });
      }
  };

  // Ensure client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  const persistNote = useCallback(
    (updater: (prev: CanvasNote | null) => CanvasNote) => {
      if (!selectedCanvas) return;

      setCanvasNote((prev) => {
        const next = updater(prev);
        try {
          storageService.saveCanvasNote(selectedCanvas, next);
        } catch (err) {
          console.error("Failed to save canvas note:", err);
        }
        return next;
      });
    },
    [selectedCanvas]
  );

  useEffect(() => {
    if (!selectedCanvas) {
      setCanvasNote(null);
      setIsNotesOpen(false);
      setSelectionPrompt(null);
      return;
    }

    try {
      const storedNote = storageService.getCanvasNote(selectedCanvas);

      if (storedNote) {
        setCanvasNote(storedNote);
        setIsNotesOpen(false);
      } else {
        const now = new Date().toISOString();
        const initialNote: CanvasNote = {
          content: "",
          createdAt: now,
          updatedAt: now,
        };
        setCanvasNote(initialNote);
        storageService.saveCanvasNote(selectedCanvas, initialNote);
        setIsNotesOpen(false);
      }
    } catch (error) {
      console.error("Failed to load canvas note:", error);
      setCanvasNote(null);
      setIsNotesOpen(false);
    }

    setSelectionPrompt(null);
  }, [selectedCanvas]);

  const formatNoteTimestamp = useCallback((value?: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);
  const appendToNote = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const now = new Date().toISOString();

      persistNote((prev) => {
        const base = prev?.content?.trim();
        const createdAt = prev?.createdAt ?? now;
        const nextContent = base ? `${base}\n\n${trimmed}` : trimmed;
        return {
          content: nextContent,
          createdAt,
          updatedAt: now,
        };
      });

      setIsNotesOpen(true);
    },
    [persistNote]
  );

  const handleNoteChange = useCallback(
    (value: string) => {
      const now = new Date().toISOString();

      persistNote((prev) => ({
        content: value,
        createdAt: prev?.createdAt ?? now,
        updatedAt: now,
      }));
    },
    [persistNote]
  );

  const handleAcceptSelectedSnippet = useCallback(() => {
    if (!selectionPrompt?.text.trim()) return;
    appendToNote(selectionPrompt.text);
    setSelectionPrompt(null);
    if (typeof window !== "undefined") {
      const selection = window.getSelection();
      selection?.removeAllRanges();
    }
  }, [appendToNote, selectionPrompt]);

  const handleAskSelectedSnippet = useCallback(() => {
    if (!selectionPrompt?.text.trim()) return;
    // Put selection into the input area for the user to edit/submit
    setInputValue(selectionPrompt.text);
    // Close selection prompt and focus textarea
    setSelectionPrompt(null);
    setTimeout(() => {
      try {
        textareaRef.current?.focus();
        // Auto-resize after setting value
        if (textareaRef.current) autoResizeTextarea(textareaRef.current);
      } catch (e) {
        // noop
      }
    }, 50);
  }, [selectionPrompt]);

  // Load canvas data to detect forked nodes and build lineage (client-side only)
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

  // Build node lineage (A => B => C => D) when node or canvas data changes
  useEffect(() => {
    if (!selectedNode || !canvasData?.nodes) {
      setNodeLineage([]);
      return;
    }

    const buildLineage = (nodeId: string): Array<{id: string, name: string}> => {
      const lineage: Array<{id: string, name: string}> = [];
      let currentId: string | undefined = nodeId;
      const visited = new Set<string>(); // Prevent infinite loops

      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        const node = canvasData.nodes.find((n: any) => n._id === currentId);
        
        if (node) {
          lineage.unshift({
            id: node._id,
            name: node.name || `Node ${node._id.slice(-6)}`,
          });
          currentId = node.parentNodeId;
        } else {
          break;
        }
      }

      return lineage;
    };

    setNodeLineage(buildLineage(selectedNode));
  }, [selectedNode, canvasData]);

  const normalizeForkMessageId = (id?: string | null) => {
    if (!id) return id || "";
    return id.replace(/(-assistant|-user|-a|-u|_a|_u)$/i, "");
  };

  // Function to get nodes forked from a specific message
  const getForkedNodes = useCallback(
    (messageId: string) => {
      if (!canvasData?.nodes) return [];

      const normalizedMessageId = normalizeForkMessageId(messageId);

      return canvasData.nodes.filter((node: any) => {
        const forkedFromId = normalizeForkMessageId(node.forkedFromMessageId);
        return !!forkedFromId && forkedFromId === normalizedMessageId;
      });
    },
    [canvasData]
  );

  // Function to create a fork with the selected model
  const createForkWithModel = async (
    selectedForkModel: string,
    overrideMessageId?: string
  ) => {
    const forkMessageId = normalizeForkMessageId(
      overrideMessageId || pendingForkMessage
    );
    if (!selectedCanvas || !selectedNode || !forkMessageId) return;

    // Create a new branch/context node (default to branch) with lineage metadata
    const newNodeId = `node_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
      
    // Use the model name as the default node name if possible
    const modelName = AVAILABLE_MODELS.find(m => m.value === selectedForkModel)?.label || selectedForkModel;
    
    const newNode = {
      _id: newNodeId,
      name: `Branch from ${selectedNodeName ? selectedNodeName.slice(0, 15) + (selectedNodeName.length > 15 ? "..." : "") : "Parent"}`,
      primary: false,
      type: "branch",
      chatMessages: [],
      runningSummary: "",
      contextContract: "",
      model: selectedForkModel,
      parentNodeId: selectedNode,
      forkedFromMessageId: forkMessageId,
      createdAt: new Date().toISOString(),
      position: {
        x: 300 + Math.random() * 150,
        y: 200 + Math.random() * 150,
      },
    } as any;

    // Optimistically update local canvas data to ensure ForkIndicator shows up immediately if we switch back
    if (canvasData) {
        setCanvasData((prev: any) => ({
            ...prev,
            nodes: [...(prev?.nodes || []), newNode]
        }));
    }

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
        if (!r.ok) console.error("Failed to persist fork node", await r.text());
      });
      fetch(`/api/canvases/${selectedCanvas}/edges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edgePayload),
      }).then(async (r) => {
        if (!r.ok) console.error("Failed to persist fork edge", await r.text());
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

      // Toast confirmation removed as per request
    } catch (e) {
      console.error("Error forking node", e);
    }
  };

  // Ensure a conversation object exists for the selected node so the UI can render immediately
  useEffect(() => {
    if (!selectedNode) return;

    // Don't recreate conversation if we're just switching back to the same node
    if (lastSelectedNodeRef.current === selectedNode) return;
    lastSelectedNodeRef.current = selectedNode;

    setConversations((prev) => {
      // Don't overwrite existing conversation data, especially if it has messages
      if (prev[selectedNode] && prev[selectedNode].messages.length > 0) {
        console.log(
          `Preserving existing conversation for node ${selectedNode} with ${prev[selectedNode].messages.length} messages`
        );
        return prev;
      }

      // Only create empty conversation if none exists - the message loading useEffect will populate it
      console.log(`Creating empty conversation for node ${selectedNode}`);
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

  // Robust message loading with caching and error handling
  useEffect(() => {
    if (!selectedNode || !selectedCanvas) return;

    // Skip if already loading this node
    if (loadingNodes.has(selectedNode)) return;

    // Skip if we already have messages cached and loaded for this node
    if (conversations[selectedNode]?.messages?.length > 0) return;

    const loadMessages = async () => {
      setLoadingNodes((prev) => new Set(prev).add(selectedNode));

      try {
        console.log(
          `Loading messages for node ${selectedNode} from canvas ${selectedCanvas}`
        );

        const res = await fetch(`/api/canvases/${selectedCanvas}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

        const data = await res.json();
        const canvas = data.canvas;
        setCanvasData(canvas); // Update canvas data for lineage info
        const node = canvas.nodes?.find((n: any) => n._id === selectedNode);

        if (node && node.chatMessages) {
          const processedMessages = node.chatMessages
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
                  id: msg.id || `msg-${idx}-${selectedNode}`,
                  role: msg.role,
                  content: msg.content,
                  timestamp: msg.timestamp
                    ? new Date(msg.timestamp)
                    : new Date(),
                },
              ];
            })
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

          console.log(
            `Loaded ${processedMessages.length} messages for node ${selectedNode}`
          );

          // Update cache
          setMessageCache((prev) => ({
            ...prev,
            [selectedNode]: processedMessages,
          }));

          // Update conversations only if this node is still selected
          if (lastSelectedNodeRef.current === selectedNode) {
            setConversations((prev) => ({
              ...prev,
              [selectedNode]: {
                nodeId: selectedNode,
                nodeName:
                  selectedNodeName || node.name || `Node ${selectedNode}`,
                messages: processedMessages,
              },
            }));
          }
        } else {
          console.log(`No messages found for node ${selectedNode}`);
          // Ensure empty conversation exists
          setConversations((prev) => ({
            ...prev,
            [selectedNode]: {
              nodeId: selectedNode,
              nodeName: selectedNodeName || `Node ${selectedNode}`,
              messages: [],
            },
          }));
        }
      } catch (err) {
        console.error("Failed to load messages:", err);

        // Fallback: use localStorage if available
        try {
          const localMessages = storageService.getNodeMessages(
            selectedCanvas,
            selectedNode
          );
          if (localMessages.length > 0) {
            const processedMessages = localMessages
              .map((msg: any, idx: number) => ({
                id: msg.id || `local-msg-${idx}-${selectedNode}`,
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
              }))
              .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

            setMessageCache((prev) => ({
              ...prev,
              [selectedNode]: processedMessages,
            }));

            if (lastSelectedNodeRef.current === selectedNode) {
              setConversations((prev) => ({
                ...prev,
                [selectedNode]: {
                  nodeId: selectedNode,
                  nodeName: selectedNodeName || `Node ${selectedNode}`,
                  messages: processedMessages,
                },
              }));
            }
          }
        } catch (localErr) {
          console.error("Local storage fallback failed:", localErr);
        }
      } finally {
        setLoadingNodes((prev) => {
          const next = new Set(prev);
          next.delete(selectedNode);
          return next;
        });
      }
    };

    loadMessages();
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

  const currentConversation = useMemo(
    () =>
      selectedNode
        ? conversations[selectedNode] ?? {
            nodeId: selectedNode,
            nodeName: selectedNodeName ?? `Node ${selectedNode}`,
            messages: [],
          }
        : null,
    [selectedNode, selectedNodeName, conversations]
  );

  const messageCount = currentConversation?.messages?.length ?? 0;

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;

    if (behavior === "smooth" && typeof viewport.scrollTo === "function") {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior,
      });
    } else {
      viewport.scrollTop = viewport.scrollHeight;
    }

    if (behavior === "smooth") {
      messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    }
  }, []);

  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;

    const hasNewMessage = messageCount > previousMessageCountRef.current;
    const hadMessages = previousMessageCountRef.current > 0;

    if (!hasInitializedScrollRef.current) {
      scrollToBottom("auto");
      hasInitializedScrollRef.current = true;
    } else if (hasNewMessage) {
      if (isUserNearBottomRef.current) {
        scrollToBottom(hadMessages ? "smooth" : "auto");
      } else {
        setShowScrollToLatest(true);
      }
    }

    previousMessageCountRef.current = messageCount;
  }, [messageCount, scrollToBottom]);

  useEffect(() => {
    hasInitializedScrollRef.current = false;
    previousMessageCountRef.current = 0;
    isUserNearBottomRef.current = true;
    setShowScrollToLatest(false);
  }, [selectedNode]);

  useEffect(() => {
    if (isTyping && isUserNearBottomRef.current) {
      scrollToBottom("smooth");
    }
  }, [isTyping, scrollToBottom]);

  useEffect(() => {
    if (isUserNearBottomRef.current) {
      scrollToBottom("auto");
    }
  }, [isFullscreen, isCollapsed, scrollToBottom]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const viewport = scrollViewportRef.current;
    if (!viewport) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      const isAtBottom = scrollHeight - (scrollTop + clientHeight) <= 80;
      isUserNearBottomRef.current = isAtBottom;
      const shouldShow = !isAtBottom && previousMessageCountRef.current > 0;
      setShowScrollToLatest((prev) =>
        prev === shouldShow ? prev : shouldShow
      );
    };

    handleScroll();
    viewport.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      viewport.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof ResizeObserver === "undefined")
      return;
    const viewport = scrollViewportRef.current;
    if (!viewport) return;

    const observer = new ResizeObserver(() => {
      if (isUserNearBottomRef.current) {
        scrollToBottom("auto");
      }
    });

    observer.observe(viewport);
    return () => observer.disconnect();
  }, [scrollToBottom]);

  const getNodeModel = useCallback(
    (nodeId: string): string => {
      // Get the model from the node's stored data, fallback to default
      if (canvasData?.nodes) {
        const node = canvasData.nodes.find((n: any) => n._id === nodeId);
        if (node?.model) {
          return node.model;
        }
      }
      // Fallback to default model if node model not found
      return getDefaultModel();
    },
    [canvasData]
  );

  // Auto-resize textarea function
  const autoResizeTextarea = useCallback((textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  }, []);

  // Handle input change with auto-resize
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputValue(e.target.value);
      autoResizeTextarea(e.target);
    },
    []
  );

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || !selectedNode || !selectedCanvas) return;

    const genId = () =>
      Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    const newMessage: Message = {
      id: genId(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    // Add user message to local state and cache immediately
    setConversations((prev) => {
      const updatedMessages = [
        ...(prev[selectedNode]?.messages || []),
        newMessage,
      ];

      // Update cache immediately
      setMessageCache((cache) => ({
        ...cache,
        [selectedNode]: updatedMessages,
      }));

      // Save to localStorage as backup
      storageService.saveNodeMessages(
        selectedCanvas,
        selectedNode,
        updatedMessages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp.toISOString(),
        }))
      );

      return {
        ...prev,
        [selectedNode]: {
          ...(prev[selectedNode] || {
            nodeId: selectedNode,
            nodeName: selectedNodeName || `Node ${selectedNode}`,
          }),
          messages: updatedMessages,
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

        if (saveResponse.status === 404) {
          try {
            const canvasRes = await fetch(`/api/canvases/${selectedCanvas}`);
            if (canvasRes.ok) {
              const data = await canvasRes.json();
              setCanvasData(data.canvas);
            }
          } catch (refreshErr) {
            console.error("Failed to refresh canvas after 404:", refreshErr);
          }

          const retryResponse = await fetch(
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

          if (retryResponse.ok) {
            console.log("User message saved successfully after refresh");
          } else {
            const retryText = await retryResponse.text();
            console.error("Retry failed:", retryText);
          }
        }
      } else {
        console.log("User message saved successfully");
      }

      // Save to localStorage as backup (will be updated in the state setter)
    } catch (err) {
      console.error("Failed to save user message:", err);
    }

    // Call LLM API through internal proxy
    try {
      let model = getNodeModel(selectedNode);
      
      // Safety check: ensure model is valid
      if (!model || model === "None" || model === "null") {
          console.warn(`[HandleSendMessage] Model for node ${selectedNode} returned invalid value: ${model}. Falling back to default.`);
          model = getDefaultModel();
      }
      
      console.log(`[HandleSendMessage] Sending message with model: ${model}`);
      
      // Get additional node context
      const currentNode = canvasData?.nodes?.find((n: any) => n._id === selectedNode);

      const payload = {
        canvasId: selectedCanvas,
        nodeId: selectedNode,
        model,
        message_id: newMessage.id,
        message: newMessage.content,
        parentNodeId: currentNode?.parentNodeId || null,
        forkedFromMessageId: currentNode?.forkedFromMessageId || null,
        isPrimary: currentNode?.primary || false
      };

      console.log("[HandleSendMessage] API Payload:", JSON.stringify(payload, null, 2));

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

        // Add assistant message to local state and cache
        setConversations((prev) => {
          const updatedMessagesWithBot = [
            ...(prev[selectedNode]?.messages || []),
            botResponse,
          ];

          // Update cache immediately
          setMessageCache((cache) => ({
            ...cache,
            [selectedNode]: updatedMessagesWithBot,
          }));

          // Save to localStorage as backup
          storageService.saveNodeMessages(
            selectedCanvas,
            selectedNode,
            updatedMessagesWithBot.map((msg) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp.toISOString(),
            }))
          );

          return {
            ...prev,
            [selectedNode]: {
              ...(prev[selectedNode] || {
                nodeId: selectedNode,
                nodeName: selectedNodeName || `Node ${selectedNode}`,
              }),
              messages: updatedMessagesWithBot,
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

          // Save to localStorage as backup (will be updated in the state setter)
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

      // Save messages to localStorage as fallback (will be updated in the state setter)

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
  }, [
    selectedNode,
    selectedCanvas,
    selectedNodeName,
    inputValue,
    getNodeModel,
    canvasData
  ]);

  const handleTextSelection = useCallback(() => {
    if (typeof window === "undefined") return;

    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (!text) {
      setSelectionPrompt(null);
      return;
    }

    const resolveElement = (node: Node | null): HTMLElement | null => {
      if (!node) return null;
      if (node instanceof HTMLElement) return node;
      if ((node as any).parentElement)
        return (node as any).parentElement as HTMLElement;
      if (node.parentNode instanceof HTMLElement) return node.parentNode;
      return null;
    };

    const anchorElement = resolveElement(selection?.anchorNode || null);
    const focusElement = resolveElement(selection?.focusNode || null);

    const isWithinMessage =
      anchorElement?.closest("[data-chat-message-body]") ||
      focusElement?.closest("[data-chat-message-body]");

    if (!isWithinMessage || !selection || selection.rangeCount === 0) {
      setSelectionPrompt(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (!rect || (rect.width === 0 && rect.height === 0)) {
      setSelectionPrompt(null);
      return;
    }

    const clampedLeft = Math.max(
      Math.min(rect.right + 8, window.innerWidth - 120),
      16
    );
    const clampedTop = Math.min(
      Math.max(rect.top - 36, 64),
      window.innerHeight - 48
    );

    setSelectionPrompt({
      text,
      position: {
        top: clampedTop,
        left: clampedLeft,
      },
    });
  }, []);

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
            {forkedNodes.length > 1 
                ? `New nodes created from here (${forkedNodes.length}):` 
                : "New node created from here:"}
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

            // Display node name or short ID
            const displayName = node.name || `${nodeTypeName}`;
            const shortNodeId = node._id.slice(-8);

            return (
              <button
                key={node._id}
                onClick={() => {
                  // Navigate to the forked node
                  onNodeSelect?.(
                    node._id,
                    node.name || `${nodeTypeName} Node`
                  );
                  toast({
                    title: "Navigated to branch",
                    description: `Switched to ${displayName}`,
                  });
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title={`Navigate to ${displayName} - ${node.chatMessages?.length || 0} messages`}
              >
                <span className="text-xs">{nodeTypeIcon}</span>
                <span className="font-medium">{displayName}</span>
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

        let forkMessageId = normalizeForkMessageId(message.id);

        if (message.role === "assistant") {
          const messages = currentConversation?.messages || [];
          const index = messages.findIndex((m) => m.id === message.id);
          if (index > 0) {
            for (let i = index - 1; i >= 0; i -= 1) {
              if (messages[i].role === "user") {
                forkMessageId = normalizeForkMessageId(messages[i].id);
                break;
              }
            }
          }
        }

        // Show model selection dialog instead of immediately creating node
        setPendingForkMessage(forkMessageId);
        setShowForkModelDialog(true);
      };

      return (
        <div className="group w-full text-slate-800 px-4 py-8 border-b border-black/5 last:border-0 hover:bg-slate-50/50 transition-colors">
            <div className="flex gap-4">
                <div className="flex-shrink-0 flex flex-col pt-1">
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-sm ${
                         isUser ? "bg-white border-slate-200" : "bg-white border-slate-100 p-1"
                     }`}>
                        {isUser ? (
                            <User size={16} className="text-slate-600" />
                        ) : (
                            <img src="/tree-icon.svg" alt="Model" className="w-5 h-5" />
                        )}
                     </div>
                </div>
                
                <div className="relative flex-1 min-w-0 overflow-hidden">
                    <div className="font-semibold text-sm text-slate-700 mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {isUser ? "You" : "Language Model"}
                            <span className="text-[10px] font-normal text-slate-400">
                                {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>

                        {!isUser && (
                           <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                             <DropdownMenu>
                               <DropdownMenuTrigger asChild>
                                 <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-600">
                                   <MoreHorizontal size={14} />
                                 </Button>
                               </DropdownMenuTrigger>
                               <DropdownMenuContent align="end">
                                 <DropdownMenuItem onClick={handleFork}>
                                   <GitBranch className="mr-2 h-4 w-4" />
                                   Fork from here
                                 </DropdownMenuItem>
                               </DropdownMenuContent>
                             </DropdownMenu>
                           </div>
                        )}
                    </div>
                    
                    <div className="text-[15px] leading-relaxed break-words text-slate-800">
                        {isUser ? (
                             <div className="whitespace-pre-wrap">{message.content}</div>
                        ) : (
                            <div className="prose prose-slate prose-sm max-w-none break-words prose-p:leading-relaxed prose-pre:bg-slate-100 prose-pre:rounded-lg prose-pre:border prose-pre:border-slate-200 prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                                {parseThinkingContent(message.content).map(
                                    (part, index) => (
                                    <div key={index}>
                                        {part.type === "thinking" ? (
                                        <details className="mb-3 rounded-lg border border-purple-100 bg-purple-50/30 px-3 py-2 text-sm text-purple-800">
                                          <summary className="cursor-pointer list-none text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-2">
                                            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-purple-500" />
                                            Thinking
                                          </summary>
                                          <div className="mt-2 border-l-2 border-purple-200 pl-3 italic whitespace-pre-wrap">
                                            {part.content}
                                          </div>
                                        </details>
                                        ) : (
                                            <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            rehypePlugins={[rehypeHighlight]}
                                            components={{
                                                p: ({ children }) => <p className="mb-4 last:mb-0 leading-[1.625]">{children}</p>,
                                                ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-2">{children}</ul>,
                                                ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-2">{children}</ol>,
                                                li: ({ children }) => <li className="pl-1">{children}</li>,
                                                h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0 text-slate-900">{children}</h1>,
                                                h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-6 text-slate-900 border-b border-slate-100 pb-2">{children}</h2>,
                                                h3: ({ children }) => <h3 className="text-lg font-semibold mb-3 mt-4 text-slate-900">{children}</h3>,
                                                blockquote: ({ children }) => <blockquote className="border-l-4 border-slate-200 pl-4 italic text-slate-600 my-4 bg-slate-50 py-2 pr-2 rounded-r">{children}</blockquote>,
                                                table: ({ children }) => (
                                                    <div className="overflow-x-auto my-6 w-full border border-slate-200 rounded-lg shadow-sm">
                                                        <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">{children}</table>
                                                    </div>
                                                ),
                                                thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
                                                th: ({ children }) => <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">{children}</th>,
                                                td: ({ children }) => <td className="px-4 py-3 text-slate-600 border-b border-slate-100">{children}</td>,
                                                a: ({ children, href }) => <a href={href} className="text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors" target="_blank" rel="noopener noreferrer">{children}</a>,
                                                hr: () => <hr className="my-8 border-slate-200" />,
                                                code: ({ children, className }) => {
                                                    const isInline = !className;
                                                    if (isInline) return <code className="bg-slate-100/80 px-1.5 py-0.5 rounded text-[13px] font-mono text-pink-600 border border-slate-200/50">{children}</code>;
                                                    return <code className={`${className} text-sm font-mono`}>{children}</code>;
                                                },
                                                pre: ({ children }) => (
                                                    <div className="relative group my-6">
                                                        <pre className="bg-[#1e1e1e] !text-[#d4d4d4] p-4 rounded-lg overflow-x-auto border border-slate-200/10 shadow-sm text-sm leading-relaxed scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                                                            {children}
                                                        </pre>
                                                    </div>
                                                )
                                            }}
                                            >
                                                {part.content}
                                            </ReactMarkdown>
                                        )}
                                    </div>
                                    )
                                )}
                            </div>
                        )}
                    </div>
                    {!isUser && <ForkIndicator messageId={message.id} />}
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
    <div className="group w-full text-slate-800 px-4 py-8 border-b border-black/5 last:border-0 hover:bg-slate-50/50 transition-colors">
            <div className="flex gap-4">
                <div className="flex-shrink-0 flex flex-col pt-1">
                     <div className="w-8 h-8 rounded-full flex items-center justify-center border shadow-sm bg-white border-slate-100 p-1">
                        <img src="/tree-icon.svg" alt="Model" className="w-5 h-5 animate-pulse" />
                     </div>
                </div>
                
                <div className="relative flex-1 min-w-0 overflow-hidden">
                    <div className="font-semibold text-sm text-slate-700 mb-1.5 flex items-center gap-2">
                        Language Model
                        <span className="text-[10px] font-normal text-slate-400">
                             Thinking...
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 h-6">
                        <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] animate-in fade-in duration-200">
        <div className="bg-white rounded-[24px] p-6 max-w-lg w-full mx-4 shadow-2xl border border-slate-100 transform scale-100 animate-in zoom-in-95 duration-200">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-1.5 flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-indigo-500" />
                Branch Conversation
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Create a new divergent path. This model will be locked for the entire branch.
              </p>
            </div>
            <button 
              onClick={() => setShowForkModelDialog(false)}
              className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors"
            >
              <span className="sr-only">Close</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto mb-8 pr-1 custom-scrollbar">
            {AVAILABLE_MODELS.map((model) => (
              <button
                key={model.value}
                onClick={() => setSelectedModelForFork(model.value)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 group relative overflow-hidden ${
                  selectedModelForFork === model.value
                    ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                    : "border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-4 relative z-10">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 shrink-0 ${
                      selectedModelForFork === model.value
                        ? "bg-indigo-600 text-white shadow-md scale-110"
                        : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700"
                    }`}
                  >
                   {(() => {
                      const Icon = getModelIcon(model.value);
                      return <Icon className="w-6 h-6" />;
                   })()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        className={`font-semibold text-base ${
                          selectedModelForFork === model.value
                            ? "text-indigo-900"
                            : "text-slate-900"
                        }`}
                      >
                        {model.label}
                      </span>
                      {selectedModelForFork === model.value && (
                        <span className="text-xs font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-full shadow-sm border border-indigo-100">
                          Selected
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-sm leading-snug ${
                        selectedModelForFork === model.value
                          ? "text-indigo-700"
                          : "text-slate-500 group-hover:text-slate-700"
                      }`}
                    >
                      {model.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex gap-3 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => {
                setShowForkModelDialog(false);
                setPendingForkMessage(null);
              }}
              className="flex-1 h-11 text-base font-medium border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-xl"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              className="flex-1 h-11 text-base font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              Create Branch
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <ModelSelectionDialog />
      
      <div className="flex flex-col h-full bg-white border-l border-slate-200 shadow-xl w-full font-sans relative">
        
        {/* ZONE 1: Node Anchor (Fixed) */}
        {selectedNode ? (
          <div className="flex-none px-4 py-2 border-b border-slate-100 bg-white z-10 transition-colors duration-200 relative">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-4 flex items-center gap-3">
                 <div className="flex items-center gap-2 mb-0 min-w-0">
                    {/* Editable Name */}
                    {isEditingName ? (
                        <div className="flex items-center gap-1 flex-1">
                            <input
                                autoFocus
                                className="text-base font-bold text-slate-900 bg-white border-b-2 border-indigo-500 px-0 py-0 w-full focus:outline-none placeholder:text-slate-300"
                                placeholder="Name this node..."
                                value={nameInputValue}
                                onChange={(e) => setNameInputValue(e.target.value)}
                                onBlur={handleNameSave}
                                onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
                            />
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group flex-1 min-w-0 cursor-text" onClick={() => setIsEditingName(true)}>
                             <span className="text-base font-bold text-slate-900 truncate tracking-tight hover:text-indigo-900 transition-colors" title={selectedNodeName}>
                                {selectedNodeName || "Untitled Node"}
                            </span>
                            <Edit2 size={10} className="opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity" />
                        </div>
                    )}
                 </div>
                 
                 <div className="h-4 w-px bg-slate-200 flex-shrink-0" />
                 
                 {/* Metadata Line */}
                 <div className="flex-1 min-w-0 flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5 bg-slate-50 px-1.5 py-0.5 rounded text-slate-600 font-medium truncate" title="Model">
                        <Bot size={10} className="text-indigo-500" />
                        {ALL_MODELS.find(m => m.id === selectedModel)?.name || selectedModel}
                    </span>
                    
                    {/* Branch Source Info */}
                    {(() => {
                        const currentNode = canvasData?.nodes?.find((n: any) => n._id === selectedNode);
                        if (currentNode?.parentNodeId) {
                            return (
                                <div className="flex items-center gap-1 text-slate-400 truncate hidden sm:flex">
                                    <GitBranch size={10} className="text-indigo-400" />
                                    <span>from</span>
                                    <span className="font-medium text-slate-600 truncate max-w-[80px]">
                                        {canvasData?.nodes?.find((n:any) => n._id === currentNode.parentNodeId)?.name || "Parent"}
                                    </span>
                                </div>
                            );
                        }
                        return null;
                    })()}
                    
                    {/* Node Details Hover */}
                    <div className="ml-1">
                        <HoverCard>
                            <HoverCardTrigger asChild>
                                <div className="p-1 hover:bg-slate-100 rounded-full cursor-pointer transition-colors text-slate-400 hover:text-slate-600">
                                    <Info size={12} />
                                </div>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80 p-0 overflow-hidden" align="start">
                                {(() => {
                                    const node = canvasData?.nodes?.find((n: any) => n._id === selectedNode);
                                    if (!node) return <div className="p-4 text-xs text-slate-500">Node not found</div>;
                                    return (
                                        <div className="bg-white">
                                            <div className="bg-slate-50 px-4 py-2 border-b flex items-center gap-2">
                                                <Database size={14} className="text-slate-500" />
                                                <span className="font-semibold text-sm text-slate-800">Node Properties</span>
                                            </div>
                                            <div className="p-4 grid gap-3 text-xs">
                                                <div className="grid grid-cols-3 gap-2">
                                                    <span className="text-slate-500 font-medium">Node ID</span>
                                                    <div className="col-span-2 font-mono text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 select-all truncate">
                                                        {node._id}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <span className="text-slate-500 font-medium">Type</span>
                                                    <div className="col-span-2">
                                                        <span className="capitalize bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 font-medium">
                                                            {node.type}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <span className="text-slate-500 font-medium">Created</span>
                                                    <span className="col-span-2 text-slate-700 font-medium">
                                                        {new Date(node.createdAt).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <span className="text-slate-500 font-medium">Model</span>
                                                    <span className="col-span-2 text-slate-700 font-medium">{node.model}</span>
                                                </div>
                                                {node.parentNodeId && (
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <span className="text-slate-500 font-medium">Parent ID</span>
                                                        <div className="col-span-2 font-mono text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 select-all truncate">
                                                            {node.parentNodeId}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </HoverCardContent>
                        </HoverCard>
                    </div>
                 </div>
              </div>
              
              <div className="flex items-center gap-1 self-center">
                {onToggleFullscreen && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-700 hover:bg-slate-50" onClick={onToggleFullscreen}>
                        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </Button>
                )}
                {onClose && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-700 hover:bg-slate-50" onClick={onClose}>
                        <PanelRightClose size={14} />
                    </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
            <div className="flex-none px-5 py-3 border-b border-slate-100 bg-white">
                <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2 text-slate-400">
                        <Circle size={8} className="fill-slate-200 text-slate-200" />
                        <span className="text-sm font-medium">Select a node</span>
                     </div>
                     {onClose && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                            <PanelRightClose size={14} />
                        </Button>
                    )}
                </div>
            </div>
        )}

        {/* ZONE 2: Context Scope (Read-Only) - REMOVED AS REQUESTED */}
        
        {/* ZONE 3: Conversation Inspector (Scrollable) */}
        <div className="flex-1 min-h-0 relative bg-white">
          {!selectedNode ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50/30">
                <MessageSquare size={32} className="mb-3 opacity-20" />
                <p className="text-sm">Select a node across the canvas<br/>to inspect its conversation.</p>
             </div>
          ) : (
            <ScrollArea 
                className="h-full" 
                viewportRef={scrollViewportRef}
            >
              <div className="min-h-[500px]">
                 
                 {(currentConversation?.messages || []).length === 0 ? (
                     <div className="px-5 text-center text-slate-400 py-10 italic text-sm">
                         (No messages at this node yet)
                     </div>
                 ) : (
                    (currentConversation?.messages || []).map((message: any) => (
                      <MessageComponent
                        key={message.id || message.timestamp?.toString()}
                        message={message}
                      />
                    ))
                 )}
                 
                 {isTyping && <div className="px-5 py-4"><TypingIndicator /></div>}
                 <div ref={messagesEndRef} className="h-px w-full" />
                 <div className="h-32 w-full" /> {/* Spacer for floating composer */} 
              </div>
            </ScrollArea>
           )}
        </div>

        {/* ZONE 4: Composer (Anchored Bottom) */}
        <div className="absolute bottom-0 left-0 w-full px-4 pb-6 pt-10 z-20 pointer-events-none bg-gradient-to-t from-white via-white/80 to-transparent">
             <div className="relative max-w-3xl mx-auto w-full pointer-events-auto">
                {selectedNode ? (
                   <div className="relative rounded-[26px] bg-[#f4f4f4] focus-within:bg-white focus-within:ring-1 focus-within:ring-black/10 transition-all duration-200 flex items-end shadow-sm p-1.5">
                        
                        <Textarea
                          ref={textareaRef}
                          placeholder="Reply..."
                          value={inputValue}
                          onChange={handleInputChange}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey && !isTyping) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          disabled={isTyping}
                          className="min-h-[44px] max-h-[200px] flex-1 w-full resize-none border-0 bg-transparent px-3 py-3 text-[15px] focus-visible:ring-0 placeholder:text-slate-500 text-slate-900"
                          style={{ borderRadius: '26px' }}
                        />
                        
                        <div className="pb-1.5 pr-1.5 self-end">
                            <Button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isTyping}
                                size="icon"
                                className={`h-8 w-8 rounded-full transition-all duration-200 flex items-center justify-center ${
                                    inputValue.trim() 
                                    ? "bg-black text-white shadow-sm" 
                                    : "bg-slate-200/50 text-slate-300 pointer-events-none"
                                }`}
                                title="Send Message"
                            >
                                <ArrowRight size={16} strokeWidth={2.5} />
                            </Button>
                        </div>
                   </div>
                ) : (
                    <div className="text-center text-xs text-slate-400 py-3 border-2 border-dashed border-slate-100 rounded-[20px] bg-slate-50/50">
                        Select a node to chat
                    </div>
                )}
             </div>
        </div>

      </div>
    </>
  );
};

// Memoized export to prevent unnecessary re-renders
export const ContextualConsoleComponent = memo(ContextualConsole);
ContextualConsoleComponent.displayName = "ContextualConsole";
