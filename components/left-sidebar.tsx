"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
} from "lucide-react"

interface LeftSidebarProps {
  onAddMainNode: () => void
  onAddBranchNode: () => void
  onAddMultipleBranches: (count: number) => void
  onAddImageNode: () => void
  activeConversation: string
  conversations: any[]
  setActiveConversation: (id: string) => void
  onCreateNewConversation: (name: string) => void
  onDeleteConversation: (id: string) => void
  onDuplicateConversation: (id: string) => void
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
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [branchCount, setBranchCount] = useState(2)
  const [newConversationName, setNewConversationName] = useState("New Context")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(264) // Default width
  const [isResizing, setIsResizing] = useState(false)
  const resizeStartXRef = useRef(0)
  const resizeStartWidthRef = useRef(0)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const resizeFrameRef = useRef<number | null>(null)

  const handleAddMultipleBranches = () => {
    onAddMultipleBranches(branchCount)
    setIsDialogOpen(false)
  }

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    resizeStartXRef.current = e.clientX
    resizeStartWidthRef.current = sidebarWidth

    document.addEventListener("mousemove", handleResize)
    document.addEventListener("mouseup", stopResize)
  }

  const handleResize = (e: MouseEvent) => {
    if (!isResizing) return

    // Cancel any pending animation frame
    if (resizeFrameRef.current !== null) {
      cancelAnimationFrame(resizeFrameRef.current)
    }

    // Use requestAnimationFrame to avoid layout thrashing
    resizeFrameRef.current = requestAnimationFrame(() => {
      const newWidth = Math.max(200, Math.min(400, resizeStartWidthRef.current + (e.clientX - resizeStartXRef.current)))
      setSidebarWidth(newWidth)
    })
  }

  const stopResize = () => {
    setIsResizing(false)
    document.removeEventListener("mousemove", handleResize)
    document.removeEventListener("mouseup", stopResize)
  }

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleResize)
      document.removeEventListener("mouseup", stopResize)
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={sidebarRef}
      className={`relative border-r border-border bg-card transition-all duration-300 flex flex-col ${
        isCollapsed ? "w-16" : ""
      }`}
      style={{ width: isCollapsed ? "64px" : `${sidebarWidth}px` }}
    >
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className={`flex items-center gap-2 ${isCollapsed ? "hidden" : "flex"}`}>
          <Network className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-sm">Node Tools</h2>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleCollapse}>
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <div className="p-3 flex flex-col gap-2">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className={`flex items-center gap-2 justify-start ${isCollapsed ? "px-2" : ""}`}
                onClick={onAddMainNode}
              >
                <MessageSquare className="h-4 w-4 text-primary" />
                {!isCollapsed && <span>Add Main Node</span>}
              </Button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">Add Main Node</TooltipContent>}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className={`flex items-center gap-2 justify-start ${isCollapsed ? "px-2" : ""}`}
                onClick={onAddBranchNode}
              >
                <GitBranch className="h-4 w-4 text-orange-500" />
                {!isCollapsed && <span>Add Branch Node</span>}
              </Button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">Add Branch Node</TooltipContent>}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className={`flex items-center gap-2 justify-start ${isCollapsed ? "px-2" : ""}`}
                  >
                    <GitBranch className="h-4 w-4 text-green-500" />
                    {!isCollapsed && <span>Add Multiple Branches</span>}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add Multiple Branches</DialogTitle>
                    <DialogDescription>Specify how many branch nodes you want to create.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="branches" className="text-right">
                        Branches
                      </Label>
                      <Input
                        id="branches"
                        type="number"
                        value={branchCount}
                        onChange={(e) => setBranchCount(Number.parseInt(e.target.value) || 2)}
                        min={1}
                        max={10}
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={handleAddMultipleBranches}>
                      Create Branches
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">Add Multiple Branches</TooltipContent>}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className={`flex items-center gap-2 justify-start ${isCollapsed ? "px-2" : ""}`}
                onClick={onAddImageNode}
              >
                <ImageIcon className="h-4 w-4 text-blue-500" />
                {!isCollapsed && <span>Add Image Node</span>}
              </Button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">Add Image Node</TooltipContent>}
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="mt-4 border-t border-border p-3 flex-1 flex flex-col overflow-hidden">
        <div className={`flex items-center justify-between mb-2 ${isCollapsed ? "hidden" : "flex"}`}>
          <h3 className="text-sm font-medium">Contexts</h3>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Context</DialogTitle>
                <DialogDescription>Enter a name for your new context tree.</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  value={newConversationName}
                  onChange={(e) => setNewConversationName(e.target.value)}
                  placeholder="Context name"
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    if (newConversationName.trim()) {
                      onCreateNewConversation(newConversationName)
                      setNewConversationName("New Context")
                    }
                  }}
                >
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className={`space-y-1 overflow-auto flex-1 custom-scrollbar ${isCollapsed ? "hidden" : "block"}`}>
          {conversations.map((conversation, idx) => (
            <div
              key={conversation.id && conversation.id !== "" ? conversation.id : `conv-${idx}`}
              className={`flex items-center justify-between p-2 rounded-md text-sm cursor-pointer hover:bg-accent group ${
                activeConversation === conversation.id ? "bg-accent" : ""
              }`}
              onClick={() => setActiveConversation(conversation.id)}
            >
              <div className="flex items-center gap-2">
                <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{conversation.name}</span>
              </div>
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDuplicateConversation(conversation.id)
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                {conversations.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteConversation(conversation.id)
                    }}
                  >
                    <Trash className="h-3.5 w-3.5" />
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
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <LayoutTemplate className="h-4 w-4" />
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
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 active:bg-primary/40 transition-colors"
          onMouseDown={startResize}
        />
      )}
    </div>
  )
}
