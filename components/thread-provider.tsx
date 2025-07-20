"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  ConversationThread,
  ThreadCheckpoint,
  ThreadNode,
} from "@/lib/models/canvas";
import {
  getUserThreads,
  getThread,
  getThreadCheckpoints,
  getThreadNodes,
  loadCheckpoint,
} from "@/app/actions/threads";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";

interface ThreadContextType {
  // Current state
  currentThread: ConversationThread | null;
  currentCheckpoint: ThreadCheckpoint | null;
  currentNodes: ThreadNode[];
  threads: ConversationThread[];

  // Loading states
  isLoading: boolean;
  isLoadingNodes: boolean;

  // Actions
  selectThread: (threadId: string, checkpointId?: string) => Promise<void>;
  refreshThreads: () => Promise<void>;
  refreshCurrentThread: () => Promise<void>;
  clearCurrentThread: () => void;
}

const ThreadContext = createContext<ThreadContextType | undefined>(undefined);

export function useThread() {
  const context = useContext(ThreadContext);
  if (context === undefined) {
    throw new Error("useThread must be used within a ThreadProvider");
  }
  return context;
}

interface ThreadProviderProps {
  children: ReactNode;
}

export function ThreadProvider({ children }: ThreadProviderProps) {
  const { data: session, status } = useSession();
  const { toast } = useToast();

  const [currentThread, setCurrentThread] = useState<ConversationThread | null>(
    null
  );
  const [currentCheckpoint, setCurrentCheckpoint] =
    useState<ThreadCheckpoint | null>(null);
  const [currentNodes, setCurrentNodes] = useState<ThreadNode[]>([]);
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingNodes, setIsLoadingNodes] = useState(false);

  // Load threads when user session is available
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      refreshThreads();
    }
  }, [status, session]);

  const refreshThreads = async () => {
    try {
      setIsLoading(true);
      const userThreads = await getUserThreads();
      setThreads(userThreads);
    } catch (error) {
      console.error("Failed to refresh threads:", error);
      toast({
        title: "Error",
        description: "Failed to load conversation threads",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCurrentThread = async () => {
    if (!currentThread) return;

    try {
      const updatedThread = await getThread(currentThread.threadId);
      if (updatedThread) {
        setCurrentThread(updatedThread);
      }
    } catch (error) {
      console.error("Failed to refresh current thread:", error);
      toast({
        title: "Error",
        description: "Failed to refresh thread data",
        variant: "destructive",
      });
    }
  };

  const selectThread = async (threadId: string, checkpointId?: string) => {
    try {
      setIsLoading(true);
      setIsLoadingNodes(true);

      // Load the thread
      const thread = await getThread(threadId);
      if (!thread) {
        throw new Error("Thread not found");
      }
      setCurrentThread(thread);

      let checkpoint: ThreadCheckpoint | null = null;
      let nodes: ThreadNode[] = [];

      if (checkpointId) {
        // Load specific checkpoint and its data
        const checkpointData = await loadCheckpoint(checkpointId);
        if (checkpointData) {
          checkpoint = checkpointData.checkpoint;
          nodes = checkpointData.nodes;
        }
      } else {
        // Load all current nodes for the thread
        nodes = await getThreadNodes(threadId);
      }

      setCurrentCheckpoint(checkpoint);
      setCurrentNodes(nodes);

      toast({
        title: "Thread Loaded",
        description: checkpoint
          ? `Loaded checkpoint: ${checkpoint.name}`
          : `Loaded thread: ${thread.title}`,
      });
    } catch (error) {
      console.error("Failed to select thread:", error);
      toast({
        title: "Error",
        description: "Failed to load thread",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsLoadingNodes(false);
    }
  };

  const clearCurrentThread = () => {
    setCurrentThread(null);
    setCurrentCheckpoint(null);
    setCurrentNodes([]);
  };

  const value: ThreadContextType = {
    currentThread,
    currentCheckpoint,
    currentNodes,
    threads,
    isLoading,
    isLoadingNodes,
    selectThread,
    refreshThreads,
    refreshCurrentThread,
    clearCurrentThread,
  };

  return (
    <ThreadContext.Provider value={value}>{children}</ThreadContext.Provider>
  );
}
