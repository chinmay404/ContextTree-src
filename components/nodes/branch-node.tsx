"use client"

import type React from "react"
import { memo, useState, useRef, useEffect, useCallback } from "react"
import { Handle, Position, type NodeProps, useUpdateNodeInternals } from "reactflow"
import type { Message } from "@/lib/types"
import { GitBranch, Edit, Check, ChevronDown, ChevronUp, Settings, MoreHorizontal, Link2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { debounce } from "lodash"
import { availableModels } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface BranchNodeData {
  label: string
  messages: Message[]
  onNodeClick?: (id: string) => void
  onLabelChange?: (id: string, label: string) => void
  isEditing: boolean
  expanded: boolean
  onToggleExpand?: (id: string, expanded: boolean) => void
  onResize?: (id: string, width: number) => void
  style?: {
    width: number
    backgroundColor?: string
    borderColor?: string
  }
  onCustomize?: () => void
  onStartConnection?: (id: string) => void
  onDelete?: (id: string) => void
  model?: string
  onModelChange?: (id: string, model: string) => void
  onDimensionsChange?: (id: string, dimensions: { width: number; height: number }) => void
}

function BranchNode({ id, data, selected }: NodeProps<BranchNodeData>) {
  const {
    label,
    messages,
    onNodeClick,
    onLabelChange,
    expanded,
    onToggleExpand,
    onResize,
    style = { width: 220 },
    onCustomize,
    onStartConnection,
    onDelete,
    model = "gpt-4",
    onModelChange,
    onDimensionsChange,
  } = data

  const [isEditing, setIsEditing] = useState(false)
  const [editedLabel, setEditedLabel] = useState(label)
  const [isResizing, setIsResizing] = useState(false)
  const [nodeWidth, setNodeWidth] = useState(style.width || 220)
  const nodeRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef<number>(0)
  const startWidthRef = useRef<number>(0)
  const resizeFrameRef = useRef<number | null>(null)
  const updateNodeInternals = useUpdateNodeInternals()

  useEffect(() => {
    setNodeWidth(style.width || 220)
  }, [style.width])

  useEffect(() => {
    setEditedLabel(label)
  }, [label])

  const handleClick = () => {
    if (onNodeClick) {
      onNodeClick(id)
    }
  }

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
    setEditedLabel(label)
  }

  const saveLabel = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onLabelChange && editedLabel.trim()) {
      onLabelChange(id, editedLabel)
    }
    setIsEditing(false)
  }

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onToggleExpand) {
      onToggleExpand(id, !expanded)
    }
  }

  const handleModelChange = (value: string) => {
    if (onModelChange) {
      onModelChange(id, value)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete) {
      onDelete(id)
    }
  }

  // Debounced resize update to prevent too many state updates
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedResizeUpdate = useCallback(
    debounce((width: number) => {
      if (onResize) {
        onResize(id, width)
      }
    }, 100),
    [id, onResize],
  )

  const startResize = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsResizing(true)
    startXRef.current = e.clientX
    startWidthRef.current = nodeWidth

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
      const diff = e.clientX - startXRef.current
      const newWidth = Math.max(180, startWidthRef.current + diff)
      setNodeWidth(newWidth)
    })
  }

  const stopResize = () => {
    setIsResizing(false)
    document.removeEventListener("mousemove", handleResize)
    document.removeEventListener("mouseup", stopResize)

    // Only update the parent component if the width actually changed
    if (nodeWidth !== startWidthRef.current) {
      debouncedResizeUpdate(nodeWidth)
    }
  }

  const handleCustomize = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onCustomize) {
      onCustomize()
    }
  }

  const handleStartConnection = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onStartConnection) {
      onStartConnection(id)
    }
  }

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleResize)
      document.removeEventListener("mouseup", stopResize)
      debouncedResizeUpdate.cancel()
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current)
      }
    }
  }, [debouncedResizeUpdate])

  // Add error handler for ResizeObserver errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message.includes("ResizeObserver")) {
        event.preventDefault()
      }
    }

    window.addEventListener("error", handleError)
    return () => window.removeEventListener("error", handleError)
  }, [])

  // Make sure messages are properly initialized
  useEffect(() => {
    if (data.messages && data.messages.length > 0) {
      // Ensure the node is expanded if it has messages
      if (!expanded && onToggleExpand) {
        onToggleExpand(id, true)
      }
    }
  }, [data.messages, expanded, id, onToggleExpand])

  // Update node dimensions for preview positioning
  useEffect(() => {
    if (nodeRef.current && onDimensionsChange) {
      const { width, height } = nodeRef.current.getBoundingClientRect()
      if (width && height && width > 0 && height > 0) {
        onDimensionsChange(id, { width, height })
        updateNodeInternals(id)
      }
    }
  }, [nodeWidth, id, onDimensionsChange, updateNodeInternals])

  // Get the selected model name
  const selectedModel = availableModels.find((m) => m.id === model)?.name || "GPT-4"

  return (
    <motion.div
      ref={nodeRef}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, type: "spring", stiffness: 500, damping: 30 }}
      className={`px-3 py-2 rounded-lg border ${
        selected ? "border-orange-500 shadow-[0_0_0_1px] shadow-orange-500/20" : "border-border"
      } bg-card shadow-md transition-all duration-200 group hover:shadow-lg`}
      onClick={handleClick}
      style={{
        width: `${nodeWidth}px`,
        backgroundColor: style.backgroundColor || "",
        borderColor: style.borderColor || "",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-orange-500 !border-2 !border-background transition-all"
      />

      <div className="flex items-center gap-2 mb-2">
        <div className="bg-orange-500/10 p-1.5 rounded-md">
          <GitBranch className="h-3.5 w-3.5 text-orange-500" />
        </div>

        {isEditing ? (
          <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
            <Input
              value={editedLabel}
              onChange={(e) => setEditedLabel(e.target.value)}
              className="h-7 py-1 text-sm"
              autoFocus
            />
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={saveLabel}>
              <Check className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <>
            <div className="font-medium text-sm flex-1 truncate">{label}</div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 transition-opacity"
              onClick={startEditing}
            >
              <Edit className="h-3 w-3" />
            </Button>
          </>
        )}

        <div className="text-xs font-medium px-1.5 py-0.5 bg-orange-500/10 text-orange-500 rounded-full">
          {messages.length}
        </div>
      </div>

      {/* Model selector */}
      <div className="mb-2" onClick={(e) => e.stopPropagation()}>
        <Select value={model} onValueChange={handleModelChange}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {availableModels.map((model) => (
              <SelectItem key={model.id} value={model.id} className="text-xs">
                {model.name} ({model.provider})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-2 border-t border-border pt-2">
        <div className="flex items-center justify-between mb-1">
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs rounded-md" onClick={toggleExpand}>
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" /> Hide
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" /> Show
              </>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={handleStartConnection}>
                <Link2 className="h-3.5 w-3.5 mr-2" />
                Connect
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCustomize}>
                <Settings className="h-3.5 w-3.5 mr-2" />
                Customize
              </DropdownMenuItem>
              <DropdownMenuItem onClick={startEditing}>
                <Edit className="h-3.5 w-3.5 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-2 space-y-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar"
            >
              {messages.slice(-3).map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-2 rounded-md bg-background/80 border border-border/50"
                >
                  <div className="font-medium text-xs flex items-center gap-1">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${msg.sender === "user" ? "bg-blue-500" : "bg-green-500"}`}
                    ></span>
                    {msg.sender === "user" ? "You" : "AI"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">{msg.content}</div>
                </motion.div>
              ))}
              {messages.length > 3 && (
                <div className="text-center text-xs text-muted-foreground py-1">
                  + {messages.length - 3} more messages
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-orange-500 !border-2 !border-background transition-all"
      />

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={startResize}
        style={{
          backgroundImage:
            "linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1) 75%, transparent 75%)",
          backgroundSize: "8px 8px",
        }}
      />
    </motion.div>
  )
}

export default memo(BranchNode)
