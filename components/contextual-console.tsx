"use client";

import {
  useState,
  useEffect,
  useRef,
  memo,
  useCallback,
  useMemo,
} from "react";
import { storageService } from "@/lib/storage";
import { toast } from "@/hooks/use-toast";
import { getDefaultModel } from "@/lib/models";
import { deriveNodeNameFromPrompt } from "@/lib/utils";
import {
  buildAdvancedRequestPayload,
  normalizeAdvancedSettings,
  type AdvancedSettings,
} from "@/lib/advanced-settings";
import { ConsoleHeader } from "@/components/console/header";
import { ChatTab } from "@/components/console/chat-tab";
import { ForkDialog } from "@/components/console/fork-dialog";
import type { Message, ContextFileChip } from "@/components/console/shared";
import { MAX_NODES_PER_CANVAS } from "@/lib/limits";
import {
  isAllowedContextFile,
  MAX_CONTEXT_FILE_MB,
} from "@/lib/file-types";

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

// Sticky web-search preference: real users expect the toggle to stay on
// once enabled, across node switches and reloads (per-browser).
const WEB_SEARCH_STICKY_KEY = "context-tree-web-search";

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
  const [webSearch, setWebSearch] = useState(false);
  // Hydrate after mount (not in the initializer) so SSR markup matches.
  useEffect(() => {
    try {
      if (localStorage.getItem(WEB_SEARCH_STICKY_KEY) === "on") setWebSearch(true);
    } catch {}
  }, []);
  // Per-node in-flight set: one node generating must not show "Thinking" or
  // lock the composer in any other node's panel.
  const [typingNodeIds, setTypingNodeIds] = useState<Set<string>>(new Set());
  const setNodeTyping = useCallback((id: string, typing: boolean) => {
    setTypingNodeIds((prev) => {
      const next = new Set(prev);
      if (typing) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);
  const isTyping = selectedNode ? typingNodeIds.has(selectedNode) : false;
  // Declared HERE (not lower with the other state) because the context-file
  // block below reads it in dependency arrays, which evaluate at render —
  // declaring it later is a temporal-dead-zone crash on mount.
  const [canvasData, setCanvasData] = useState<any>(null);

  // ─── External context (file RAG) attachments ────────────────
  // Edges between the current chat node and externalContext nodes are the
  // single source of truth (contextNodeIds derives from them per send).
  // The chips are live controls over those edges.
  const contextFiles = useMemo(() => {
    if (!selectedNode || !canvasData?.nodes) return [] as ContextFileChip[];
    const edges = canvasData.edges || [];
    return canvasData.nodes
      .filter((n: any) => n?.type === "externalContext")
      .map((n: any) => {
        const edge = edges.find(
          (e: any) =>
            (e.from === selectedNode && e.to === n._id) ||
            (e.to === selectedNode && e.from === n._id)
        );
        return {
          id: n._id as string,
          name: (n.name || n.data?.label || "File") as string,
          connected: Boolean(edge),
          edgeId: edge?._id as string | undefined,
          processing:
            Boolean(n.data?.loading) || n.contextContract === "Processing...",
          error: typeof n.data?.error === "string" && n.data.error.length > 0,
        };
      });
  }, [canvasData, selectedNode]);

  const publishCanvas = useCallback((next: any) => {
    setCanvasData(next);
    window.dispatchEvent(new CustomEvent("canvas-data-updated", { detail: next }));
  }, []);

  const refreshCanvasSoon = useCallback(() => {
    // Ingestion is a backend background task; refetch a few times so the
    // chip flips from "Processing…" without a manual reload.
    [5000, 15000, 30000].forEach((ms) =>
      setTimeout(async () => {
        if (!selectedCanvas) return;
        try {
          const res = await fetch(`/api/canvases/${selectedCanvas}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.canvas) setCanvasData(data.canvas);
          }
        } catch {}
      }, ms)
    );
  }, [selectedCanvas]);

  const toggleContextFile = useCallback(
    (fileNodeId: string) => {
      if (!selectedCanvas || !selectedNode || !canvasData) return;
      const entry = contextFiles.find((f) => f.id === fileNodeId);
      if (!entry) return;
      if (entry.connected && entry.edgeId) {
        const next = {
          ...canvasData,
          edges: (canvasData.edges || []).filter(
            (e: any) => e._id !== entry.edgeId
          ),
        };
        publishCanvas(next);
        fetch(`/api/canvases/${selectedCanvas}/edges/${entry.edgeId}`, {
          method: "DELETE",
        }).catch(() => {});
      } else {
        const edge = {
          _id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          from: selectedNode,
          to: fileNodeId,
          createdAt: new Date().toISOString(),
          meta: { condition: "Context" },
        };
        const next = {
          ...canvasData,
          edges: [...(canvasData.edges || []), edge],
        };
        publishCanvas(next);
        fetch(`/api/canvases/${selectedCanvas}/edges`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(edge),
        }).catch(() => {});
      }
    },
    [selectedCanvas, selectedNode, canvasData, contextFiles, publishCanvas]
  );

  const uploadContextFile = useCallback(
    async (file: File) => {
      if (!selectedCanvas || !selectedNode || !canvasData) return;
      if (!isAllowedContextFile(file.name)) {
        toast({
          title: "Unsupported file type",
          description: "Use PDF, TXT, MD, DOC or DOCX.",
          variant: "destructive",
        });
        return;
      }
      if (file.size > MAX_CONTEXT_FILE_MB * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `Maximum size is ${MAX_CONTEXT_FILE_MB}MB.`,
          variant: "destructive",
        });
        return;
      }
      if ((canvasData?.nodes?.length || 0) >= MAX_NODES_PER_CANVAS) {
        toast({
          title: "Canvas is full",
          description: `Max ${MAX_NODES_PER_CANVAS} nodes per canvas. Delete unused branches or start a new canvas.`,
          variant: "destructive",
        });
        return;
      }
      const ctxId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date().toISOString();
      const ctxNode: any = {
        _id: ctxId,
        name: file.name,
        primary: false,
        type: "externalContext",
        chatMessages: [],
        runningSummary: "",
        contextContract: "Processing...",
        model: "",
        createdAt: now,
        data: { label: file.name, fileType: file.type, size: file.size, loading: true },
      };
      const edge = {
        _id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        from: selectedNode,
        to: ctxId,
        createdAt: now,
        meta: { condition: "Context" },
      };
      const next = {
        ...canvasData,
        nodes: [...(canvasData.nodes || []), ctxNode],
        edges: [...(canvasData.edges || []), edge],
      };
      publishCanvas(next);

      const fd = new FormData();
      fd.append("file", file);
      fd.append("canvasId", selectedCanvas);
      fd.append("nodeId", ctxId);
      const res = await fetch("/api/upload", { method: "POST", body: fd }).catch(
        () => null
      );
      if (!res || !res.ok) {
        const err = res ? await res.json().catch(() => ({} as any)) : ({} as any);
        publishCanvas({
          ...next,
          nodes: next.nodes.filter((n: any) => n._id !== ctxId),
          edges: next.edges.filter((e: any) => e._id !== edge._id),
        });
        toast({
          title: "Upload failed",
          description: err.error || "Could not upload the file.",
          variant: "destructive",
        });
        return;
      }
      fetch(`/api/canvases/${selectedCanvas}/edges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edge),
      }).catch(() => {});
      toast({
        title: "Context attached",
        description: `${file.name} is processing — it will inform replies here once ready.`,
      });
      refreshCanvasSoon();
    },
    [selectedCanvas, selectedNode, canvasData, publishCanvas, refreshCanvasSoon, toast]
  );
  // nodeId -> lineage captured at fork time; canvasData refetches can't erase it.
  const forkLineage = useRef<
    Record<string, { parentNodeId: string; forkedFromMessageId: string | null }>
  >({});
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

  const startRename = useCallback(() => {
    setIsEditingName(true);
  }, []);

  const cancelRename = useCallback(() => {
    // The sync effect above restores nameInput from resolvedName once
    // editing stops, so simply exiting edit mode discards the draft.
    setIsEditingName(false);
  }, []);

  // ─── Model switcher ────────────────────────────────────
  // Reuses the same update channel as rename: optimistic local update +
  // canvas-update-node event for the canvas + PATCH for persistence.
  const handleModelChange = useCallback(
    (modelId: string) => {
      if (!selectedNode || !selectedCanvas || !modelId) return;
      setCanvasData((p: any) =>
        p
          ? {
              ...p,
              nodes: p.nodes.map((n: any) =>
                n._id === selectedNode ? { ...n, model: modelId } : n
              ),
            }
          : p
      );
      window.dispatchEvent(
        new CustomEvent("canvas-update-node", {
          detail: { nodeId: selectedNode, updates: { model: modelId } },
        })
      );
      fetch(`/api/canvases/${selectedCanvas}/nodes/${selectedNode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelId }),
      }).catch(() => {
        toast({
          title: "Error",
          description: "Failed to update model",
          variant: "destructive",
        });
      });
    },
    [selectedNode, selectedCanvas]
  );

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
      // 1. Trust the network snapshot's node model when present.
      const netNode = canvasData?.nodes?.find((n: any) => n._id === nodeId);
      if (netNode?.model) return netNode.model;
      // 2. Fall back to the localStorage-merged copy, which is populated
      //    immediately on fork/create before the server round-trips (this is
      //    the case where the header used to flash the global "GLM 5.2").
      const localCanvas = selectedCanvas ? storageService.getCanvas(selectedCanvas) : null;
      const localNode = localCanvas?.nodes?.find((n: any) => n._id === nodeId);
      if (localNode?.model) return localNode.model;
      // 3. Use the canvas's own default model, never the app-wide catalog
      //    default, so a missing field can't masquerade as "GLM 5.2".
      return (
        canvasData?.settings?.defaultModel ||
        localCanvas?.settings?.defaultModel ||
        getDefaultModel()
      );
    },
    [canvasData, selectedCanvas]
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
    setNodeTyping(nodeId, true);

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
          parentNodeId:
            currentNode?.parentNodeId ||
            forkLineage.current[nodeId]?.parentNodeId ||
            null,
          forkedFromMessageId:
            currentNode?.forkedFromMessageId ||
            forkLineage.current[nodeId]?.forkedFromMessageId ||
            null,
          isPrimary: currentNode?.primary || false,
          systemPrompt: currentNode?.systemPrompt || "",
          ...buildAdvancedRequestPayload(currentNode?.advancedSettings, model),
          contextNodeIds,
          webSearch,
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
        let webSearchMeta: Message["webSearch"] | null = null;

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

                // Web-search preamble arrives before any tokens: materialize
                // the assistant bubble immediately so the source chips show
                // while the model is still thinking (Claude/GPT-style).
                if (parsed.web_search?.results) {
                  webSearchMeta = parsed.web_search;
                }

                const chunk = parsed.message || parsed.delta || "";
                if (chunk || parsed.web_search) {
                  fullContent += chunk;

                  if (chunk && firstToken) {
                    firstToken = false;
                    setNodeTyping(nodeId, false);
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
                        webSearch: webSearchMeta || undefined,
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
          webSearch: webSearchMeta || undefined,
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
      setNodeTyping(nodeId, false);
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
    async (
      model: string,
      overrideId?: string,
      overrideName?: string,
      overrideSystemPrompt?: string,
      overrideAdvancedSettings?: AdvancedSettings
    ) => {
      const forkId = normalizeForkId(overrideId || pendingForkMsg);
      if (!selectedCanvas || !selectedNode || !forkId) return;
      if ((canvasData?.nodes?.length || 0) >= MAX_NODES_PER_CANVAS) {
        toast({
          title: "Canvas is full",
          description: `Max ${MAX_NODES_PER_CANVAS} nodes per canvas. Delete unused branches or start a new canvas.`,
          variant: "destructive",
        });
        return;
      }
      const parentNode = canvasData?.nodes?.find((n: any) => n._id === selectedNode);
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
        systemPrompt:
          overrideSystemPrompt !== undefined
            ? overrideSystemPrompt
            : parentNode?.systemPrompt || "",
        advancedSettings:
          overrideAdvancedSettings !== undefined
            ? normalizeAdvancedSettings(overrideAdvancedSettings)
            : normalizeAdvancedSettings(parentNode?.advancedSettings),
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

      // Lineage registry: survives canvasData refetches that may drop the
      // optimistic node — handleSend falls back to this so the chat body
      // ALWAYS carries the fork's parent (the backend can seed inheritance
      // from body pointers alone, even if the node row write raced/failed).
      forkLineage.current[nodeId] = {
        parentNodeId: selectedNode,
        forkedFromMessageId: forkId,
      };

      const nodeCreationPromise = fetch(`/api/canvases/${selectedCanvas}/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNode),
      });
      // Edge POST strictly AFTER the node POST settles: firing them together
      // let the edge write's canvas snapshot race the node insert, and the
      // old full-canvas sync deleted the "missing" fresh node (branches came
      // back as bare Context cards with their fork seed destroyed).
      const edgeCreationPromise = nodeCreationPromise
        .catch(() => null)
        .then(() =>
          fetch(`/api/canvases/${selectedCanvas}/edges`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(edge),
          })
        );
      // Surface persistence failures instead of swallowing them — a silently
      // failed node write is how forks lost their parents in prod.
      nodeCreationPromise
        .then((r) => {
          if (!r.ok) {
            console.error(`Fork node persist failed: ${r.status}`);
            toast({
              title: "Branch may not be saved",
              description: `Server rejected the new branch (${r.status}). It works this session; reload may lose it.`,
              variant: "destructive",
            });
          }
        })
        .catch((e) => console.error("Fork node persist failed:", e));
      edgeCreationPromise.catch((e) => console.error("Fork edge persist failed:", e));

      window.dispatchEvent(
        new CustomEvent("canvas-select-node", {
          detail: { nodeId, nodeName: branchName, nodeType: "branch" },
        })
      );
      onNodeSelect?.(nodeId, branchName, "branch");

      // ── Auto-invoke when forking from a user message ─────────────────────
      // The fork-init buffer already ends with the user message. We send the
      // chat request with `regenerateLastUser: true` so the backend skips
      // appending a duplicate user message and only persists the assistant's
      // fresh reply. This produces an alternative answer to the same prompt.
      const isUserMessageFork = sourceMessage?.role === "user";
      if (isUserMessageFork && sourceMessage) {
        // Wait for the node row so the backend's fork_thread doesn't race
        // the canvas POST.
        try {
          await nodeCreationPromise;
        } catch (_) {
          /* fork_thread is idempotent and will create the row if needed */
        }

        // Use a fresh request msg id so the assistant response id
        // (`${requestId}_ai`) doesn't collide with the parent thread's existing
        // AI message of the same id (the messages table PK is global).
        const requestMsgId = genId();
        const userMsgForUI: Message = {
          id: sourceMessage.id,
          role: "user",
          content: sourceMessage.content,
          timestamp:
            sourceMessage.timestamp instanceof Date
              ? sourceMessage.timestamp
              : new Date(),
        };
        // Optimistically render the user message in the new branch.
        setMessages((p) => ({ ...p, [nodeId]: [userMsgForUI] }));
        setNodeTyping(nodeId, true);

        try {
          const advancedForRequest =
            overrideAdvancedSettings !== undefined
              ? normalizeAdvancedSettings(overrideAdvancedSettings)
              : normalizeAdvancedSettings(parentNode?.advancedSettings);
          const systemPromptForRequest =
            overrideSystemPrompt !== undefined
              ? overrideSystemPrompt
              : parentNode?.systemPrompt || "";

          const res = await fetch("/api/llm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              canvasId: selectedCanvas,
              nodeId,
              model,
              message_id: requestMsgId,
              message: sourceMessage.content,
              parentNodeId: selectedNode,
              forkedFromMessageId: forkId,
              isPrimary: false,
              systemPrompt: systemPromptForRequest,
              ...buildAdvancedRequestPayload(advancedForRequest, model),
              contextNodeIds: [],
              regenerateLastUser: true,
            }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Auto-response failed (${res.status})`);
          }

          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("text/event-stream") && res.body) {
            const botMsgId = `${requestMsgId}_ai`;
            const botTimestamp = new Date();
            let fullContent = "";
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
                    const chunk = parsed.message || parsed.delta || "";
                    if (chunk) {
                      fullContent += chunk;
                      if (firstToken) {
                        firstToken = false;
                        setNodeTyping(nodeId, false);
                      }
                      setMessages((p) => ({
                        ...p,
                        [nodeId]: [
                          userMsgForUI,
                          {
                            id: botMsgId,
                            role: "assistant",
                            content: fullContent,
                            timestamp: botTimestamp,
                          },
                        ],
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

            if (fullContent) {
              const allMsgs = [
                userMsgForUI,
                {
                  id: botMsgId,
                  role: "assistant" as const,
                  content: fullContent,
                  timestamp: botTimestamp,
                },
              ];
              setMessages((p) => ({ ...p, [nodeId]: allMsgs }));
              storageService.saveNodeMessages(
                selectedCanvas,
                nodeId,
                allMsgs.map((m) => ({
                  id: m.id,
                  role: m.role,
                  content: m.content,
                  timestamp: m.timestamp.toISOString(),
                }))
              );
              // Persist the assistant message so the UI re-renders correctly
              // on reload. The user message is already in DB (fork buffer).
              fetch(
                `/api/canvases/${selectedCanvas}/nodes/${nodeId}/messages`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: botMsgId,
                    role: "assistant",
                    content: fullContent,
                    timestamp: botTimestamp.toISOString(),
                  }),
                }
              ).catch(() => {});
            }
          }
        } catch (err) {
          toast({
            title: "Auto-response failed",
            description:
              err instanceof Error ? err.message : "Could not generate reply in new branch",
            variant: "destructive",
          });
        } finally {
          setNodeTyping(nodeId, false);
        }
      }
    },
    [
      selectedCanvas,
      selectedNode,
      pendingForkMsg,
      resolvedName,
      canvasData,
      currentMessages,
      onNodeSelect,
      setMessages,
      setNodeTyping,
      toast,
    ]
  );

  const handleStartFork = useCallback((messageId: string) => {
    // The "hasMessages" guard that used to live here was redundant: the
    // branch button is only rendered when canFork is true (which already
    // requires the message to be native to this node). It also caused a
    // false negative under streaming — the MessageItem memoizer doesn't
    // include onStartFork in its comparison, so this callback could capture
    // a stale `currentMessages` that didn't yet contain the assistant reply
    // even after the stream completed. Dropping the guard removes that
    // failure mode.
    const selectedMessage = currentMessages.find((message) => message.id === messageId);
    if (selectedMessage && !isMessageNativeToSelectedNode(selectedMessage)) {
      toast({
        title: "Branch unavailable",
        description: "You can only branch from messages created in this node",
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

  // Source message for the pending fork — used to prefill the branch name in
  // the fork dialog with the first words of the message being forked from.
  const pendingForkSourceMessage = useMemo(() => {
    if (!pendingForkMsg) return null;
    return (
      currentMessages.find(
        (message) => normalizeForkId(message.id) === pendingForkMsg
      ) || null
    );
  }, [pendingForkMsg, currentMessages]);

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

  // ─── Cmd/Ctrl+B → fork from the last message ───────────────
  // Opens the fork dialog for the last forkable (native-to-this-node)
  // message. Fires from anywhere in the document while the console is
  // mounted — including the composer, since forking from the last message
  // while composing is the primary use — but never from other inputs or
  // during IME composition.
  useEffect(() => {
    if (!selectedNode) return;
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "b") return;
      if (e.isComposing || e.keyCode === 229) return;
      const target = e.target as HTMLElement | null;
      const isEditable =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (isEditable && target !== textareaRef.current) return;
      if (showForkDialog) return;
      const candidates = currentMessages.filter(isMessageNativeToSelectedNode);
      const last = candidates[candidates.length - 1];
      if (!last) return;
      e.preventDefault();
      handleStartFork(last.id);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [
    selectedNode,
    showForkDialog,
    currentMessages,
    isMessageNativeToSelectedNode,
    handleStartFork,
  ]);

  // ─── Render ────────────────────────────────────────────
  return (
    <>
      <ForkDialog
        open={showForkDialog}
        sourceName={resolvedName || "this branch"}
        sourceRole={pendingForkSourceMessage?.role === "user" ? "user" : "assistant"}
        sourceMessageContent={pendingForkSourceMessage?.content}
        inheritedSystemPrompt={currentNode?.systemPrompt || ""}
        inheritedAdvancedSettings={currentNode?.advancedSettings}
        onCancel={() => {
          setShowForkDialog(false);
          setPendingForkMsg(null);
        }}
        onConfirm={(model, name, systemPrompt, advancedSettings) => {
          createFork(model, undefined, name, systemPrompt, advancedSettings);
          setShowForkDialog(false);
          setPendingForkMsg(null);
        }}
      />
      <div className="flex flex-col h-full bg-card w-full relative">
        <ConsoleHeader
          lineage={nodeLineage}
          resolvedName={resolvedName}
          activeModelId={currentNode ? activeModelId : null}
          isEditingName={isEditingName}
          nameInput={nameInput}
          onNameInputChange={setNameInput}
          onStartRename={startRename}
          onSaveName={saveName}
          onCancelRename={cancelRename}
          onNodeSelect={onNodeSelect}
          onModelChange={handleModelChange}
          isFullscreen={isFullscreen}
          onToggleFullscreen={onToggleFullscreen}
          onClose={onClose}
        />

        <ChatTab
          selectedNode={selectedNode}
          currentMessages={currentMessages}
          isLoadingMessages={isLoadingMessages}
          isTyping={isTyping}
          activeModelId={activeModelId}
          showBranchHint={showBranchHint}
          onDismissBranchHint={dismissBranchHint}
          showScrollBtn={showScrollBtn}
          onScrollToBottom={scrollToBottom}
          isMessageNativeToSelectedNode={isMessageNativeToSelectedNode}
          getForkedNodes={getForkedNodes}
          onStartFork={handleStartFork}
          onSelectForkedNode={handleSelectForkedNode}
          inputValue={inputValue}
          onInputChange={setInputValue}
          autoResize={autoResize}
          onSend={handleSend}
          webSearch={webSearch}
          onToggleWebSearch={() =>
            setWebSearch((v) => {
              const next = !v;
              try {
                localStorage.setItem(WEB_SEARCH_STICKY_KEY, next ? "on" : "off");
              } catch {}
              return next;
            })
          }
          contextFiles={contextFiles}
          onToggleContext={toggleContextFile}
          onAttachFile={uploadContextFile}
          scrollRef={scrollRef}
          endRef={endRef}
          textareaRef={textareaRef}
        />
      </div>
    </>
  );
};

export const ContextualConsoleComponent = memo(ContextualConsole);
