"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
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
  Plus,
  GitBranch,
  MessageSquare,
  ImageIcon,
  Trash,
  Copy,
  LayoutTemplate,
  Network,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface LeftSidebarProps {
  onAddMainNode: () => void;
  onAddBranchNode: () => void;
  onAddMultipleBranches: (count: number) => void;
  onAddImageNode: () => void;
  activeConversation: string;
  conversations: any[];
  setActiveConversation: (id: string) => void;
  onCreateNewConversation: (name: string) => void;
  onDeleteConversation: (id: string) => void;
  onDuplicateConversation: (id: string) => void;
}

export default function LeftSidebar({
  onAddMainNode,
  onAddBranchNode,
  onAddMultipleBranches,
  onAddImageNode,
  activeConversation,
  conversations,
  setActiveConversation,
  onCreateNewConversation,
  onDeleteConversation,
  onDuplicateConversation,
}: LeftSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [branchCount, setBranchCount] = useState(2);
  const [newConversationName, setNewConversationName] = useState("New Context");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(264); // Default width
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(0);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const resizeFrameRef = useRef<number | null>(null);

  const handleAddMultipleBranches = () => {
    onAddMultipleBranches(branchCount);
    setIsDialogOpen(false);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = sidebarWidth;

    document.addEventListener("mousemove", handleResize);
    document.addEventListener("mouseup", stopResize);
  };

  const handleResize = (e: MouseEvent) => {
    if (!isResizing) return;

    // Cancel any pending animation frame
    if (resizeFrameRef.current !== null) {
      cancelAnimationFrame(resizeFrameRef.current);
    }

    // Use requestAnimationFrame to avoid layout thrashing
    resizeFrameRef.current = requestAnimationFrame(() => {
      const newWidth = Math.max(
        200,
        Math.min(
          400,
          resizeStartWidthRef.current + (e.clientX - resizeStartXRef.current)
        )
      );
      setSidebarWidth(newWidth);
    });
  };

  const stopResize = () => {
    setIsResizing(false);
    document.removeEventListener("mousemove", handleResize);
    document.removeEventListener("mouseup", stopResize);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleResize);
      document.removeEventListener("mouseup", stopResize);
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={sidebarRef}
      className={`relative transition-all duration-300 flex flex-col h-full ${
        isCollapsed ? "w-16" : ""
      }`}
      style={{ width: isCollapsed ? "64px" : `${sidebarWidth}px` }}
    >
      <div className="p-4 flex items-center justify-between border-b border-gray-200/50">
        <div
          className={`flex items-center gap-3 ${
            isCollapsed ? "hidden" : "flex"
          }`}
        >
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-sm">
            <Network className="h-5 w-5 text-white" />
          </div>
          <h2 className="font-bold text-lg bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            Node Tools
          </h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl hover:bg-blue-50 hover:shadow-sm transition-all duration-200"
          onClick={toggleCollapse}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className={`flex items-center gap-3 justify-start h-11 bg-white/60 border-gray-200/60 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:border-blue-300/60 hover:shadow-sm transition-all duration-200 ${
                  isCollapsed ? "px-2" : "px-4"
                }`}
                onClick={onAddMainNode}
              >
                <MessageSquare className="h-5 w-5 text-blue-600" />
                {!isCollapsed && (
                  <span className="font-medium">Add Main Node</span>
                )}
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">Add Main Node</TooltipContent>
            )}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className={`flex items-center gap-3 justify-start h-11 bg-white/60 border-gray-200/60 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 hover:border-orange-300/60 hover:shadow-sm transition-all duration-200 ${
                  isCollapsed ? "px-2" : "px-4"
                }`}
                onClick={onAddBranchNode}
              >
                <GitBranch className="h-5 w-5 text-orange-600" />
                {!isCollapsed && (
                  <span className="font-medium">Add Branch Node</span>
                )}
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">Add Branch Node</TooltipContent>
            )}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className={`flex items-center gap-3 justify-start h-11 bg-white/60 border-gray-200/60 hover:bg-gradient-to-r hover:from-green-50 hover:to-green-100 hover:border-green-300/60 hover:shadow-sm transition-all duration-200 ${
                      isCollapsed ? "px-2" : "px-4"
                    }`}
                  >
                    <GitBranch className="h-5 w-5 text-green-600" />
                    {!isCollapsed && (
                      <span className="font-medium">Multiple Branches</span>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-white/95 backdrop-blur-xl border border-gray-200/60 shadow-xl rounded-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold">
                      Add Multiple Branches
                    </DialogTitle>
                    <DialogDescription className="text-gray-600">
                      Specify how many branch nodes you want to create.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-6 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label
                        htmlFor="branches"
                        className="text-right font-medium"
                      >
                        Branches
                      </Label>
                      <Input
                        id="branches"
                        type="number"
                        value={branchCount}
                        onChange={(e) =>
                          setBranchCount(Number.parseInt(e.target.value) || 2)
                        }
                        min={1}
                        max={10}
                        className="col-span-3 h-11 rounded-xl border-gray-200/60 focus:border-blue-400/60 focus:ring-blue-400/20"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="submit"
                      onClick={handleAddMultipleBranches}
                      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-md hover:shadow-lg transition-all duration-200 rounded-xl"
                    >
                      Create Branches
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">
                Add Multiple Branches
              </TooltipContent>
            )}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className={`flex items-center gap-3 justify-start h-11 bg-white/60 border-gray-200/60 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 hover:border-purple-300/60 hover:shadow-sm transition-all duration-200 ${
                  isCollapsed ? "px-2" : "px-4"
                }`}
                onClick={onAddImageNode}
              >
                <ImageIcon className="h-5 w-5 text-purple-600" />
                {!isCollapsed && (
                  <span className="font-medium">Add Image Node</span>
                )}
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">Add Image Node</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="mt-4 border-t border-gray-200/50 p-4 flex-1 flex flex-col overflow-hidden">
        <div
          className={`flex items-center justify-between mb-4 ${
            isCollapsed ? "hidden" : "flex"
          }`}
        >
          <h3 className="text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            Contexts
          </h3>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:shadow-sm transition-all duration-200"
              >
                <Plus className="h-4 w-4 text-blue-600" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white/95 backdrop-blur-xl border border-gray-200/60 shadow-xl rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  Create New Context
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  Enter a name for your new context tree.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  value={newConversationName}
                  onChange={(e) => setNewConversationName(e.target.value)}
                  placeholder="Context name"
                  className="h-11 rounded-xl border-gray-200/60 focus:border-blue-400/60 focus:ring-blue-400/20"
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    if (newConversationName.trim()) {
                      onCreateNewConversation(newConversationName);
                      setNewConversationName("New Context");
                    }
                  }}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg transition-all duration-200 rounded-xl"
                >
                  Create Context
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div
          className={`space-y-2 overflow-auto flex-1 custom-scrollbar ${
            isCollapsed ? "hidden" : "block"
          }`}
        >
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`flex items-center justify-between p-3 rounded-xl text-sm cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:shadow-sm transition-all duration-200 group ${
                activeConversation === conversation.id
                  ? "bg-gradient-to-r from-blue-100 to-purple-100 shadow-md border border-blue-200/50"
                  : "bg-white/50 border border-gray-200/30"
              }`}
              onClick={() => setActiveConversation(conversation.id)}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    activeConversation === conversation.id
                      ? "bg-gradient-to-br from-blue-500 to-purple-600 shadow-sm"
                      : "bg-gray-100"
                  }`}
                >
                  <LayoutTemplate
                    className={`h-4 w-4 ${
                      activeConversation === conversation.id
                        ? "text-white"
                        : "text-gray-600"
                    }`}
                  />
                </div>
                <span
                  className={`truncate font-medium ${
                    activeConversation === conversation.id
                      ? "text-gray-800"
                      : "text-gray-700"
                  }`}
                >
                  {conversation.name}
                </span>
              </div>
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-blue-100 transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateConversation(conversation.id);
                  }}
                >
                  <Copy className="h-4 w-4 text-blue-600" />
                </Button>
                {conversations.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg hover:bg-red-100 transition-all duration-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conversation.id);
                    }}
                  >
                    <Trash className="h-4 w-4 text-red-600" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {isCollapsed && (
          <div className="flex flex-col items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl hover:bg-blue-50 hover:shadow-sm transition-all duration-200"
                  >
                    <LayoutTemplate className="h-5 w-5 text-blue-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Contexts</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      {/* Resize handle */}
      {!isCollapsed && (
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-gradient-to-b hover:from-blue-400 hover:to-purple-500 active:bg-gradient-to-b active:from-blue-500 active:to-purple-600 transition-all duration-200 rounded-r-lg"
          onMouseDown={startResize}
        />
      )}
    </div>
  );
}
