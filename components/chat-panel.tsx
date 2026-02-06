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
  PanelRightClose,
  GitBranch,
  ArrowDown,
  Copy,
  Check,
  StickyNote,
  Plus,
} from "lucide-react";
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

const ChatPanelInternal = ({
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
        return forkedFromId === normalizedMessageId;
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
    const newNode = {
      _id: newNodeId,
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

      // Update local canvasData so context lookup works immediately for the new node
      setCanvasData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          nodes: [...(prev.nodes || []), newNode],
          edges: [...(prev.edges || []), edgePayload],
        };
      });

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

      // Toast confirmation
      const modelName =
        AVAILABLE_MODELS.find((m) => m.value === selectedForkModel)?.label ||
        selectedForkModel;
      toast({
        title: "Fork created",
        description: `New node created with ${modelName}`,
      });
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
        const node = canvas.nodes?.find((n: any) => n._id === selectedNode);

        const extractRawMessages = (target: any): any[] => {
          if (!target) return [];
          if (Array.isArray(target.chatMessages)) return target.chatMessages;
          if (Array.isArray(target?.data?.chatMessages)) return target.data.chatMessages;
          if (Array.isArray(target?.data?.data?.chatMessages)) return target.data.data.chatMessages;
          return [];
        };

        const normalizeMessages = (raw: any[]) =>
          raw
            .flatMap((msg: any, idx: number) => {
              // New format: turn { id, user?, assistant? }
              if (msg.user || msg.assistant) {
                const parts: any[] = [];
                if (msg.user) {
                  parts.push({
                    id: `${msg.id}-u`,
                    role: "user",
                    content: msg.user.content,
                    timestamp: msg.user.timestamp
                      ? new Date(msg.user.timestamp)
                      : new Date(),
                  });
                }
                if (msg.assistant) {
                  parts.push({
                    id: `${msg.id}-a`,
                    role: "assistant",
                    content: msg.assistant.content,
                    timestamp: msg.assistant.timestamp
                      ? new Date(msg.assistant.timestamp)
                      : new Date(),
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

        const rawMessages = extractRawMessages(node);
        let processedMessages =
          rawMessages.length > 0 ? normalizeMessages(rawMessages) : [];

        if (processedMessages.length === 0) {
          const localMessages = storageService.getNodeMessages(
            selectedCanvas,
            selectedNode
          );
          if (localMessages.length > 0) {
            console.log(
              `Using localStorage fallback for node ${selectedNode} (${localMessages.length} messages)`
            );
            processedMessages = normalizeMessages(localMessages);
          }
        }

        if (processedMessages.length > 0) {
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
    const newHeight = Math.min(textarea.scrollHeight, 120); // Max height of ~5 lines
    textarea.style.height = newHeight + "px";
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
      const model = getNodeModel(selectedNode);
      const currentNode = canvasData?.nodes?.find((n: any) => n._id === selectedNode);
      const payload = {
        canvasId: selectedCanvas,
        nodeId: selectedNode,
        model,
        message_id: newMessage.id,
        message: newMessage.content,
        parentNodeId: currentNode?.parentNodeId || null,
        forkedFromMessageId: currentNode?.forkedFromMessageId || null,
        isPrimary: currentNode?.primary || false,
      };

      // Use internal API proxy instead of direct external call
      const res = await fetch("/api/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Service error (${res.status})`);
      }

      if (!res.body) throw new Error("Response body is not readable");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let botContent = "";
      const botMsgId = genId();
      const timestamp = new Date();

      // Initialize empty assistant message
      setConversations((prev) => {
          const prevMsgs = prev[selectedNode]?.messages || [];
          return {
              ...prev,
              [selectedNode]: {
                  ...(prev[selectedNode] || {
                      nodeId: selectedNode,
                      nodeName: selectedNodeName || `Node ${selectedNode}`,
                  }),
                  messages: [...prevMsgs, {
                      id: botMsgId,
                      role: "assistant",
                      content: "",
                      timestamp: timestamp
                  }]
              }
          };
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        botContent += chunk;

        setConversations((prev) => {
             const prevConv = prev[selectedNode];
             if (!prevConv) return prev;
             
             const messages = [...prevConv.messages];
             const msgIndex = messages.findIndex(m => m.id === botMsgId);
             
             if (msgIndex >= 0) {
                 messages[msgIndex] = { ...messages[msgIndex], content: botContent };
             }
             
             return {
                 ...prev,
                 [selectedNode]: { ...prevConv, messages }
             };
        });
      }

      const botResponse: Message = {
          id: botMsgId,
          role: "assistant",
          content: botContent,
          timestamp: timestamp,
      };

      // Update cache
      setMessageCache((cache) => ({
        ...cache,
        [selectedNode]: [...(cache[selectedNode] || []), botResponse],
      }));

       // Save to localStorage
       setConversations((prev) => {
            const msgs = prev[selectedNode]?.messages || [];
            if (msgs.length > 0) {
                storageService.saveNodeMessages(
                selectedCanvas,
                selectedNode,
                msgs.map((msg) => ({
                  id: msg.id,
                  role: msg.role,
                  content: msg.content,
                  timestamp: msg.timestamp.toISOString(),
                }))
              );
            }
            return prev;
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

      return (
        <div
          className={`flex ${
            isUser ? "justify-end" : "justify-start"
          } mb-8 px-3`}
        >
          <div
            className={`w-full min-w-0 max-w-full ${
              isUser ? "order-2" : "order-1"
            }`}
          >
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
              <div className="flex-1 min-w-0 overflow-hidden">
                <div
                  className={`rounded-2xl px-6 py-5 transition-all duration-300 overflow-hidden ${
                    isUser
                      ? "bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-lg hover:shadow-xl"
                      : "bg-white border border-slate-200/80 text-slate-800 shadow-md hover:shadow-lg hover:border-slate-300/80"
                  }`}
                  data-chat-message-body="true"
                >
                  {isUser ? (
                    <p className="text-[15px] leading-[1.75] whitespace-pre-wrap break-words overflow-wrap-anywhere font-normal">
                      {message.content}
                    </p>
                  ) : (
                    <div className="text-[15px] leading-[1.75] overflow-hidden">
                      {parseThinkingContent(message.content).map(
                        (part, index) => (
                          <div key={index}>
                            {part.type === "thinking" ? (
                              <details className="mb-3 rounded-xl border border-purple-100 bg-purple-50/60 px-4 py-3 text-sm text-purple-800">
                                <summary className="cursor-pointer list-none text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-2">
                                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-purple-500" />
                                  Thinking
                                </summary>
                                <div className="mt-2 border-l-2 border-purple-200 pl-3 italic whitespace-pre-wrap">
                                  {part.content}
                                </div>
                              </details>
                            ) : part.content.trim() ? (
                              <div className="prose prose-base max-w-none break-words overflow-hidden prose-slate prose-headings:font-semibold prose-headings:text-slate-900 prose-headings:break-words prose-p:text-slate-800 prose-p:leading-[1.75] prose-p:break-words prose-p:overflow-wrap-anywhere prose-p:text-[15px] prose-strong:text-slate-900 prose-strong:font-semibold prose-strong:break-words prose-code:text-slate-800 prose-code:bg-slate-100 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:break-words prose-code:text-[14px] prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200 prose-pre:overflow-x-auto prose-pre:text-[14px] prose-img:rounded-lg prose-img:border prose-img:border-slate-200/60 prose-img:bg-white prose-img:max-w-full prose-li:leading-[1.75] prose-li:break-words prose-li:text-[15px] prose-blockquote:border-l-4 prose-blockquote:border-slate-300 prose-blockquote:pl-5 prose-blockquote:py-1 prose-blockquote:italic prose-blockquote:text-slate-700 prose-blockquote:break-words prose-a:break-words prose-a:text-blue-600">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  rehypePlugins={[rehypeHighlight]}
                                  components={{
                                    h1: ({ children }) => (
                                      <h1 className="text-2xl font-semibold text-slate-900 mt-6 mb-4 first:mt-0 leading-tight break-words overflow-wrap-anywhere">
                                        {children}
                                      </h1>
                                    ),
                                    h2: ({ children }) => (
                                      <h2 className="text-xl font-semibold text-slate-900 mt-6 mb-3 first:mt-0 leading-tight break-words overflow-wrap-anywhere">
                                        {children}
                                      </h2>
                                    ),
                                    h3: ({ children }) => (
                                      <h3 className="text-lg font-semibold text-slate-900 mt-5 mb-3 first:mt-0 leading-snug break-words overflow-wrap-anywhere">
                                        {children}
                                      </h3>
                                    ),
                                    p: ({ children }) => (
                                      <p className="text-slate-800 mb-4 last:mb-0 font-normal leading-[1.75] break-words overflow-wrap-anywhere text-[15px]">
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
                                            <code className="bg-slate-100 text-slate-800 px-2 py-1 rounded-md text-[14px] font-mono font-medium">
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
                                        <div className="relative group my-5">
                                          <pre className="bg-slate-50 border border-slate-200/80 rounded-lg p-5 pr-14 overflow-x-auto text-[14px] leading-[1.6] font-mono shadow-sm">
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
                                      <ul className="list-disc list-outside ml-6 space-y-2.5 text-slate-800 mb-5">
                                        {children}
                                      </ul>
                                    ),
                                    ol: ({ children }) => (
                                      <ol className="list-decimal list-outside ml-6 space-y-2.5 text-slate-800 mb-5">
                                        {children}
                                      </ol>
                                    ),
                                    li: ({ children }) => (
                                      <li className="text-slate-800 leading-[1.75] break-words overflow-wrap-anywhere pl-2 text-[15px]">
                                        {children}
                                      </li>
                                    ),
                                    a: ({ children, href }) => (
                                      <a
                                        href={href || "#"}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-600 underline break-all hover:text-blue-700"
                                      >
                                        {children}
                                      </a>
                                    ),
                                    table: ({ children }) => (
                                      <div className="my-6 w-full overflow-x-auto rounded-lg border border-slate-200/80 bg-white shadow-sm">
                                        <table className="w-full text-left text-sm text-slate-700">
                                          {children}
                                        </table>
                                      </div>
                                    ),
                                    thead: ({ children }) => (
                                      <thead className="bg-gradient-to-r from-slate-50 to-slate-100/50 text-slate-800 border-b-2 border-slate-200">
                                        {children}
                                      </thead>
                                    ),
                                    tbody: ({ children }) => (
                                      <tbody className="divide-y divide-slate-100">
                                        {children}
                                      </tbody>
                                    ),
                                    tr: ({ children }) => (
                                      <tr className="hover:bg-slate-50/50 transition-colors duration-150">
                                        {children}
                                      </tr>
                                    ),
                                    th: ({ children }) => (
                                      <th className="px-5 py-3.5 font-semibold text-slate-800 text-sm uppercase tracking-wider break-words">
                                        {children}
                                      </th>
                                    ),
                                    td: ({ children }) => (
                                      <td className="px-5 py-3.5 text-slate-800 leading-[1.7] align-top text-[15px]">
                                        <div className="break-words overflow-wrap-anywhere">
                                          {children}
                                        </div>
                                      </td>
                                    ),
                                    img: ({ alt, src }) => (
                                      <img
                                        src={src || ""}
                                        alt={alt || "Markdown image"}
                                        className="my-3 w-full max-h-[30rem] rounded-lg object-contain"
                                      />
                                    ),
                                    hr: () => (
                                      <hr className="my-6 border-t-2 border-slate-200" />
                                    ),
                                    blockquote: ({ children }) => (
                                      <blockquote className="border-l-4 border-slate-400 pl-6 pr-5 py-3 bg-slate-50/50 rounded-r-md my-5 italic text-slate-700 leading-[1.75] text-[15px]">
                                        {children}
                                      </blockquote>
                                    ),
                                    strong: ({ children }) => (
                                      <strong className="font-semibold text-slate-900">
                                        {children}
                                      </strong>
                                    ),
                                    em: ({ children }) => (
                                      <em className="italic text-slate-700 font-normal">
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

                </div>
                {(() => {
                  if (!message.timestamp) return null;
                  const dateObj =
                    typeof message.timestamp === "string"
                      ? new Date(message.timestamp)
                      : message.timestamp;
                  if (isNaN(dateObj.getTime())) return null;

                  const timeLabel = dateObj.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      className={`mt-2 flex items-center px-1 text-xs ${
                        isUser
                          ? "justify-end text-slate-300"
                          : "justify-between text-slate-400"
                      }`}
                    >
                      <span>{timeLabel}</span>
                    </div>
                  );
                })()}
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
            <img src="/tree-icon.svg" alt="ContextTree" className="w-6 h-6" />
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
                    className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors mt-0.5 ${
                      selectedModelForFork === model.value
                        ? "border-indigo-600 bg-indigo-600"
                        : "border-slate-300 bg-white group-hover:border-slate-400"
                    }`}
                  >
                    {selectedModelForFork === model.value && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
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
      {selectionPrompt && (
        <div
          className="fixed z-50"
          style={{
            top: `${selectionPrompt.position.top}px`,
            left: `${selectionPrompt.position.left}px`,
          }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={handleAskSelectedSnippet}
              className="hidden sm:inline-flex items-center gap-2 rounded-full bg-black text-white px-3 py-1 text-xs font-medium shadow-lg hover:opacity-95 transition-opacity"
              aria-label="Ask ChatGPT about selection"
            >
              Ask ChatGPT
            </button>
            <button
              onClick={handleAcceptSelectedSnippet}
              className="group flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg transition-all duration-150 hover:scale-105 hover:border-slate-300 hover:bg-slate-50"
              aria-label="Add selection to note"
            >
              <Plus className="h-4 w-4 transition-colors duration-150 group-hover:text-slate-900" />
            </button>
          </div>
        </div>
      )}
      <div
        className={`h-full flex flex-col transition-all duration-300 ease-in-out ${
          isFullscreen
            ? "bg-slate-50"
            : "bg-white border-l border-slate-200/80 shadow-sm"
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
              className={`flex-shrink-0 border-b border-slate-200/80 bg-white ${
                isFullscreen
                  ? "p-6 shadow-sm"
                  : "p-5"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3
                      className={`font-medium text-slate-900 truncate cursor-pointer hover:text-blue-600 transition-colors duration-200 ${
                        isFullscreen ? "text-xl" : "text-lg"
                      }`}
                      onClick={() => {
                        if (selectedNode) {
                          const newName = prompt(
                            "Enter new node name:",
                            currentConversation?.nodeName || "Node"
                          );
                          if (newName && newName.trim()) {
                            // Update node name in canvas
                            fetch(
                              `/api/canvases/${selectedCanvas}/nodes/${selectedNode}`,
                              {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ name: newName.trim() }),
                              }
                            ).then(() => {
                              // Update local conversation
                              setConversations((prev) => ({
                                ...prev,
                                [selectedNode]: {
                                  ...prev[selectedNode],
                                  nodeName: newName.trim(),
                                },
                              }));
                              // Trigger canvas refresh
                              window.dispatchEvent(
                                new CustomEvent("node-updated", {
                                  detail: {
                                    nodeId: selectedNode,
                                    name: newName.trim(),
                                  },
                                })
                              );
                            });
                          }
                        }
                      }}
                      title="Click to rename node"
                    >
                      {selectedNode
                        ? currentConversation?.nodeName || "Node Chat"
                        : "Node Chat"}
                    </h3>
                  </div>

                  {/* Node Lineage Breadcrumb */}
                  {nodeLineage.length > 1 && (
                    <div className="flex items-center gap-2 mb-2 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent pb-1">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        {nodeLineage.map((node, index) => (
                          <div key={node.id} className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (node.id !== selectedNode && onNodeSelect) {
                                  onNodeSelect(node.id, node.name);
                                  toast({
                                    title: "Navigated to node",
                                    description: `Switched to ${node.name}`,
                                  });
                                }
                              }}
                              className={`text-xs px-2.5 py-1 rounded-full transition-all duration-200 ${
                                node.id === selectedNode
                                  ? "bg-blue-100 text-blue-700 font-medium"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
                              }`}
                              title={`Navigate to ${node.name}`}
                            >
                              {node.name}
                            </button>
                            {index < nodeLineage.length - 1 && (
                              <svg
                                className="w-3 h-3 text-slate-400 flex-shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-slate-500 font-light">
                    {selectedNode
                      ? AVAILABLE_MODELS.find(
                          (m) => m.value === getNodeModel(selectedNode)
                        )?.label || getNodeModel(selectedNode)
                      : "Select a node to start chatting"}
                  </p>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {selectedNode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsNotesOpen((prev) => !prev)}
                      className={`relative rounded-lg transition-all duration-200 ${
                        isNotesOpen
                          ? "bg-slate-900 text-white hover:bg-slate-800"
                          : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/80"
                      }`}
                      title={
                        isNotesOpen ? "Hide canvas notes" : "Show canvas notes"
                      }
                    >
                      <StickyNote size={16} />
                      {canvasNote?.content?.trim() && (
                        <span
                          className={`absolute -top-1 -right-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${
                            isNotesOpen
                              ? "bg-white text-slate-900"
                              : "bg-slate-900 text-white"
                          }`}
                        >
                          ●
                        </span>
                      )}
                    </Button>
                  )}

                  {/* Refresh conversation button removed per user request */}
                  {/* {selectedNode && (
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
                      className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-2 rounded-md transition-colors duration-200"
                      title="Refresh conversation"
                    >
                      <Settings size={14} />
                    </Button>
                  )} */}

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
                      className="h-full"
                      viewportRef={scrollViewportRef}
                      viewportClassName={`h-full ${
                        isFullscreen ? "px-8 py-6" : "px-6 py-5"
                      }`}
                    >
                      <div
                        className={`space-y-2 pb-32 ${
                          isFullscreen && !isNotesOpen ? "max-w-4xl mx-auto" : ""
                        } ${
                          isFullscreen && isNotesOpen
                            ? "mr-[420px]"
                            : ""
                        }`}
                        onMouseUp={handleTextSelection}
                      >
                        {isNotesOpen && !isFullscreen && (
                          <div className="sticky top-0 z-20 mb-3 flex justify-end">
                            <Card className="w-full max-w-sm border border-slate-200/80 bg-white/95 p-4 shadow-sm backdrop-blur-sm">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                  <StickyNote size={16} className="text-slate-500" />
                                  <span>Canvas Note</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setIsNotesOpen(false)}
                                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100/80"
                                  title="Hide note"
                                >
                                  <X size={14} />
                                </Button>
                              </div>
                              <Textarea
                                value={canvasNote?.content ?? ""}
                                onChange={(e) => handleNoteChange(e.target.value)}
                                placeholder="Add quick context for this canvas..."
                                className="mt-3 min-h-[100px] resize-y border-0 bg-transparent p-0 text-sm text-slate-700 focus-visible:ring-0"
                              />
                              <div className="mt-2 text-right text-[11px] text-slate-400">
                                {formatNoteTimestamp(canvasNote?.updatedAt)
                                  ? `Updated ${formatNoteTimestamp(canvasNote?.updatedAt)}`
                                  : ""}
                              </div>
                            </Card>
                          </div>
                        )}

                        {loadingNodes.has(selectedNode) ? (
                          <div className="text-center py-16">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-200/50">
                              <div className="animate-spin">
                                <Sparkles className="w-8 h-8 text-blue-500" />
                              </div>
                            </div>
                            <h3 className="text-slate-900 text-xl font-semibold mb-2">
                              Loading messages...
                            </h3>
                            <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
                              Retrieving conversation history for this node
                            </p>
                          </div>
                        ) : (currentConversation?.messages?.length || 0) ===
                          0 ? (
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
                            <div
                              ref={messagesEndRef}
                              aria-hidden="true"
                              className="h-px w-full"
                            />
                          </>
                        )}
                      </div>
                    </ScrollArea>
                    {isNotesOpen && isFullscreen && (
                      <div className="pointer-events-auto absolute inset-y-0 right-0 z-30 flex w-[400px] border-l border-slate-200/80 bg-white shadow-xl">
                        <div className="flex h-full w-full flex-col gap-4 p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                              <StickyNote size={18} className="text-slate-500" />
                              <span>Canvas Note</span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setIsNotesOpen(false)}
                              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100/80"
                              title="Hide note"
                            >
                              <X size={16} />
                            </Button>
                          </div>
                          <Textarea
                            value={canvasNote?.content ?? ""}
                            onChange={(e) => handleNoteChange(e.target.value)}
                            placeholder="Add quick context for this canvas..."
                            className="flex-1 resize-none rounded-lg border border-slate-200/80 bg-white/70 p-3 text-sm text-slate-700 shadow-inner focus-visible:border-slate-300 focus-visible:ring-0"
                          />
                          <div className="text-right text-[11px] text-slate-400">
                            {formatNoteTimestamp(canvasNote?.updatedAt)
                              ? `Updated ${formatNoteTimestamp(canvasNote?.updatedAt)}`
                              : ""}
                          </div>
                        </div>
                      </div>
                    )}
                    {showScrollToLatest && (
                      <div className={`pointer-events-none absolute bottom-[120px] z-20 ${
                        isFullscreen && isNotesOpen ? "right-[440px]" : "right-4"
                      }`}>
                        <Button
                          onClick={() => {
                            scrollToBottom("smooth");
                            isUserNearBottomRef.current = true;
                            setShowScrollToLatest(false);
                          }}
                          size="sm"
                          variant="secondary"
                          className="pointer-events-auto gap-2 rounded-full bg-white/90 text-slate-700 shadow-lg shadow-slate-900/10 hover:bg-white"
                        >
                          <ArrowDown size={16} />
                          <span className="text-xs font-medium">
                            Jump to latest
                          </span>
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Model Selection & Input Area */}
                  <div
                    className={`absolute bottom-0 left-0 bg-transparent ${
                      isFullscreen ? "p-6" : "p-4"
                    } z-10 ${
                      isFullscreen && isNotesOpen ? "right-[420px]" : "right-0"
                    }`}
                  >
                    {/* Floating Glass Message Input */}
                    <div
                      className={`relative ${
                        isFullscreen && !isNotesOpen ? "max-w-4xl mx-auto" : ""
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
};

// Memoized export to prevent unnecessary re-renders
export const ChatPanel = memo(ChatPanelInternal);
ChatPanel.displayName = "ChatPanel";
