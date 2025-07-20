"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MessageSquare,
  ChevronRight,
  MoreVertical,
  Trash,
  Edit,
  Copy,
  Bookmark,
  Clock,
  Archive,
  Star,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ConversationThread, ThreadCheckpoint } from "@/lib/models/canvas";
import {
  createNewThread,
  getUserThreads,
  updateThread,
  deleteThread,
  createCheckpoint,
  getThreadCheckpoints,
  deleteCheckpoint,
} from "@/app/actions/threads";

interface ThreadSidebarProps {
  onSelectThread: (threadId: string, checkpointId?: string) => void;
  activeThreadId?: string;
  activeCheckpointId?: string;
  className?: string;
}

export default function ThreadSidebar({
  onSelectThread,
  activeThreadId,
  activeCheckpointId,
  className = "",
}: ThreadSidebarProps) {
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [checkpoints, setCheckpoints] = useState<
    Record<string, ThreadCheckpoint[]>
  >({});
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(
    new Set()
  );
  const [isNewThreadDialogOpen, setIsNewThreadDialogOpen] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadDescription, setNewThreadDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editingThread, setEditingThread] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const { toast } = useToast();

  // Load threads on component mount
  useEffect(() => {
    loadThreads();
  }, []);

  // Load checkpoints when a thread is expanded
  useEffect(() => {
    expandedThreads.forEach((threadId) => {
      if (!checkpoints[threadId]) {
        loadCheckpoints(threadId);
      }
    });
  }, [expandedThreads]);

  const loadThreads = async () => {
    try {
      setIsLoading(true);
      const userThreads = await getUserThreads();
      setThreads(userThreads);
    } catch (error) {
      console.error("Failed to load threads:", error);
      toast({
        title: "Error",
        description: "Failed to load conversation threads",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCheckpoints = async (threadId: string) => {
    try {
      const threadCheckpoints = await getThreadCheckpoints(threadId);
      setCheckpoints((prev) => ({
        ...prev,
        [threadId]: threadCheckpoints,
      }));
    } catch (error) {
      console.error(
        `Failed to load checkpoints for thread ${threadId}:`,
        error
      );
      toast({
        title: "Error",
        description: "Failed to load checkpoints",
        variant: "destructive",
      });
    }
  };

  const handleCreateThread = async () => {
    if (!newThreadTitle.trim()) {
      toast({
        title: "Error",
        description: "Thread title is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const newThread = await createNewThread(
        newThreadTitle.trim(),
        newThreadDescription.trim() || undefined
      );
      await loadThreads();
      setNewThreadTitle("");
      setNewThreadDescription("");
      setIsNewThreadDialogOpen(false);

      // Auto-select the new thread
      onSelectThread(newThread.threadId);

      toast({
        title: "Success",
        description: "New conversation thread created",
      });
    } catch (error) {
      console.error("Failed to create thread:", error);
      toast({
        title: "Error",
        description: "Failed to create new thread",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteThread = async (threadId: string) => {
    try {
      await deleteThread(threadId);
      await loadThreads();

      // Clear checkpoints for deleted thread
      setCheckpoints((prev) => {
        const updated = { ...prev };
        delete updated[threadId];
        return updated;
      });

      toast({
        title: "Success",
        description: "Thread deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete thread:", error);
      toast({
        title: "Error",
        description: "Failed to delete thread",
        variant: "destructive",
      });
    }
  };

  const handleUpdateThread = async (threadId: string, title: string) => {
    try {
      await updateThread(threadId, { title: title.trim() });
      await loadThreads();
      setEditingThread(null);
      setEditTitle("");

      toast({
        title: "Success",
        description: "Thread updated successfully",
      });
    } catch (error) {
      console.error("Failed to update thread:", error);
      toast({
        title: "Error",
        description: "Failed to update thread",
        variant: "destructive",
      });
    }
  };

  const handleCreateCheckpoint = async (threadId: string) => {
    try {
      const checkpointName = `Checkpoint ${new Date().toLocaleString()}`;
      await createCheckpoint(threadId, checkpointName, "User checkpoint");
      await loadCheckpoints(threadId);

      toast({
        title: "Success",
        description: "Checkpoint created successfully",
      });
    } catch (error) {
      console.error("Failed to create checkpoint:", error);
      toast({
        title: "Error",
        description: "Failed to create checkpoint",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCheckpoint = async (
    checkpointId: string,
    threadId: string
  ) => {
    try {
      await deleteCheckpoint(checkpointId);
      await loadCheckpoints(threadId);

      toast({
        title: "Success",
        description: "Checkpoint deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete checkpoint:", error);
      toast({
        title: "Error",
        description: "Failed to delete checkpoint",
        variant: "destructive",
      });
    }
  };

  const toggleThreadExpansion = (threadId: string) => {
    setExpandedThreads((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(threadId)) {
        newSet.delete(threadId);
      } else {
        newSet.add(threadId);
      }
      return newSet;
    });
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return (
      d.toLocaleDateString() +
      " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  return (
    <div className={`flex flex-col h-full bg-background border-r ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <Dialog
            open={isNewThreadDialogOpen}
            onOpenChange={setIsNewThreadDialogOpen}
          >
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Thread</DialogTitle>
                <DialogDescription>
                  Start a new conversation thread to organize your discussions.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newThreadTitle}
                    onChange={(e) => setNewThreadTitle(e.target.value)}
                    placeholder="Enter thread title..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    value={newThreadDescription}
                    onChange={(e) => setNewThreadDescription(e.target.value)}
                    placeholder="Enter thread description..."
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsNewThreadDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateThread}
                  disabled={isLoading || !newThreadTitle.trim()}
                >
                  {isLoading ? "Creating..." : "Create Thread"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && threads.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading threads...
          </div>
        ) : threads.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No conversation threads yet</p>
            <p className="text-sm">Create your first thread to get started</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {threads.map((thread) => (
              <div key={thread.threadId} className="space-y-1">
                {/* Thread Item */}
                <div
                  className={`group flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                    activeThreadId === thread.threadId
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 mr-1"
                    onClick={() => toggleThreadExpansion(thread.threadId)}
                  >
                    <ChevronRight
                      className={`h-3 w-3 transition-transform ${
                        expandedThreads.has(thread.threadId) ? "rotate-90" : ""
                      }`}
                    />
                  </Button>

                  <div
                    className="flex-1 min-w-0"
                    onClick={() => onSelectThread(thread.threadId)}
                  >
                    {editingThread === thread.threadId ? (
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() =>
                          handleUpdateThread(thread.threadId, editTitle)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleUpdateThread(thread.threadId, editTitle);
                          } else if (e.key === "Escape") {
                            setEditingThread(null);
                            setEditTitle("");
                          }
                        }}
                        className="h-auto py-1 px-2 text-sm"
                        autoFocus
                      />
                    ) : (
                      <div>
                        <div className="font-medium text-sm truncate">
                          {thread.title}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {formatDate(thread.lastModified)} •{" "}
                          {thread.metadata.totalNodes} nodes
                        </div>
                      </div>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingThread(thread.threadId);
                          setEditTitle(thread.title);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleCreateCheckpoint(thread.threadId)}
                      >
                        <Bookmark className="h-4 w-4 mr-2" />
                        Create Checkpoint
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteThread(thread.threadId)}
                        className="text-destructive"
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Checkpoints */}
                {expandedThreads.has(thread.threadId) &&
                  checkpoints[thread.threadId] && (
                    <div className="ml-6 space-y-1">
                      {checkpoints[thread.threadId].map((checkpoint) => (
                        <div
                          key={checkpoint.checkpointId}
                          className={`group flex items-center p-2 rounded-md cursor-pointer transition-colors ${
                            activeCheckpointId === checkpoint.checkpointId
                              ? "bg-secondary/60 border border-secondary"
                              : "hover:bg-muted/30"
                          }`}
                          onClick={() =>
                            onSelectThread(
                              thread.threadId,
                              checkpoint.checkpointId
                            )
                          }
                        >
                          <Clock className="h-3 w-3 mr-2 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">
                              {checkpoint.name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {formatDate(checkpoint.createdAt)}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="h-2 w-2" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDeleteCheckpoint(
                                    checkpoint.checkpointId,
                                    thread.threadId
                                  )
                                }
                                className="text-destructive"
                              >
                                <Trash className="h-3 w-3 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
