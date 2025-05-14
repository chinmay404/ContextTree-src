"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import type { Message } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Send,
  Edit,
  Check,
  X,
  User,
  Bot,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Maximize2,
  Minimize2,
  Trash2,
  MessageSquare,
  CornerDownRight,
  Link,
  ArrowRight,
  ArrowLeft,
} from "lucide-react"
import { format } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "@/components/ui/use-toast"
import { availableModels } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import NodeNotes from "@/components/node-notes"
import ThinkingAnimationComponent from "./thinking-animation"

// Update the ChatPanelProps interface to include isThinking
interface ChatPanelProps {
  messages: Message[]
  onSendMessage: (content: string) => void
  nodeName: string
  onNodeNameChange: (name: string) => void
  onCreateBranchNode?: (content: string) => void
  isCollapsed?: boolean
  setIsCollapsed?: (collapsed: boolean) => void
  onDeleteNode?: () => void
  model?: string
  onModelChange?: (model: string) => void
  branchPoints?: Record<string, string> // Map of message IDs to branch node IDs
  connectionPoints?: Record<string, { nodeId: string; type: string; direction: "incoming" | "outgoing" }> // Map of message IDs to connection info
  onNavigateToNode?: (nodeId: string) => void // Function to navigate to a node
  nodeNotes?: Record<string, string>
  onSaveNote?: (nodeId: string, note: string) => void
  activeNodeId?: string
  nodes?: any[] // Add nodes array to access parent information
  isThinking?: boolean // Add isThinking prop
}

interface NodeParentInfo {
  id: string
  label: string
  type: string
}

function ThinkingAnimation() {
  return (
    <div className="flex gap-1">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
    </div>
  )
}

// Update the function parameters to include isThinking
export default function ChatPanel({
  messages,
  onSendMessage,
  nodeName,
  onNodeNameChange,
  onCreateBranchNode,
  isCollapsed: propIsCollapsed,
  setIsCollapsed: propSetIsCollapsed,
  onDeleteNode,
  model = "gpt-4",
  onModelChange,
  branchPoints = {},
  connectionPoints = {},
  onNavigateToNode,
  nodeNotes = {},
  onSaveNote,
  activeNodeId,
  nodes,
  isThinking = false,
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState("")
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState(nodeName)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [panelWidth, setPanelWidth] = useState(320) // Default width
  const [isResizing, setIsResizing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const resizeStartXRef = useRef(0)
  const resizeStartWidthRef = useRef(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const resizeFrameRef = useRef<number | null>(null)
  const [commandFeedback, setCommandFeedback] = useState<{
    active: boolean
    command: string
    content: string
  } | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [createdBranchId, setCreatedBranchId] = useState<string | null>(null)
  // Add isThinking state

  useEffect(() => {
    setEditedName(nodeName)
  }, [nodeName])

  // Use props for collapsed state if provided
  useEffect(() => {
    if (propIsCollapsed !== undefined) {
      setIsCollapsed(propIsCollapsed)
    }
  }, [propIsCollapsed])

  // Add this useEffect to ensure the model stays in sync
  useEffect(() => {
    // This ensures that when the model prop changes, the UI reflects it
    if (model) {
      // No need to call handleModelChange here, just ensure the UI shows the correct model
    }
  }, [model])

  // Update the handleSubmit function to include the API call
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (inputValue.trim()) {
      // Check if the input starts with "/branch"
      if (inputValue.startsWith("/branch ")) {
        const branchContent = inputValue.substring(8).trim()

        if (branchContent && onCreateBranchNode) {
          const branchId = onCreateBranchNode(branchContent)
          if (branchId) {
            setCreatedBranchId(branchId)
            toast({
              title: "Branch node created",
              description: `Created a new branch node with content: "${branchContent.substring(0, 30)}${
                branchContent.length > 30 ? "..." : ""
              }"`,
            })
          }
          setInputValue("")
          return
        }
      }

      // Send the user message
      onSendMessage(inputValue)
      setInputValue("")
    }
  }

  const handleSaveName = () => {
    if (editedName.trim()) {
      onNodeNameChange(editedName)
    }
    setIsEditingName(false)
  }

  // Scroll to bottom when messages change or when a new node is selected
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, nodeName])

  const toggleCollapse = () => {
    const newCollapsedState = !isCollapsed
    setIsCollapsed(newCollapsedState)
    if (propSetIsCollapsed) {
      propSetIsCollapsed(newCollapsedState)
    }
  }

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  const handleDeleteNode = () => {
    if (onDeleteNode) {
      onDeleteNode()
    }
  }

  const handleModelChange = (value: string) => {
    if (onModelChange) {
      onModelChange(value)
    }
  }

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    resizeStartXRef.current = e.clientX
    resizeStartWidthRef.current = panelWidth

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
      const newWidth = Math.max(280, Math.min(500, resizeStartWidthRef.current - (e.clientX - resizeStartXRef.current)))
      setPanelWidth(newWidth)
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)

    // Check for command patterns
    if (value.startsWith("/branch ")) {
      setCommandFeedback({
        active: true,
        command: "/branch",
        content: value.substring(8).trim(),
      })
    } else {
      setCommandFeedback(null)
    }
  }

  const handleNavigateToNode = (nodeId: string) => {
    if (onNavigateToNode) {
      onNavigateToNode(nodeId)
    }
  }

  // Get the selected model name
  const selectedModel = availableModels.find((m) => m.id === model)?.name || "GPT-4"

  // Helper function to get node type display name
  const getNodeTypeName = (type: string) => {
    switch (type) {
      case "mainNode":
        return "Main Node"
      case "branchNode":
        return "Branch Node"
      case "imageNode":
        return "Image"
      default:
        return "Node"
    }
  }

  return (
    <motion.div
      ref={panelRef}
      className={`relative flex flex-col h-full border-l border-border transition-all duration-300 ${
        isCollapsed ? "w-12" : ""
      } ${isExpanded ? "fixed right-0 top-0 h-screen z-50 w-[70vw] backdrop-blur-md bg-background/90 shadow-xl" : ""}`}
      style={{
        width: isCollapsed ? "48px" : isExpanded ? "70vw" : `${panelWidth}px`,
        marginTop: isExpanded ? "0" : "",
        height: isExpanded ? "100vh" : "",
        paddingTop: isExpanded ? "60px" : "",
      }}
      initial={isCollapsed ? { width: "48px" } : { width: `${panelWidth}px` }}
      animate={isCollapsed ? { width: "48px" } : isExpanded ? { width: "70vw" } : { width: `${panelWidth}px` }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <motion.div
        className="p-4 border-b border-border bg-card/50 flex items-center"
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Button variant="ghost" size="icon" className="h-8 w-8 mr-2" onClick={toggleCollapse}>
          {isCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>

        {!isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 mr-2"
            onClick={toggleExpand}
            aria-label={isExpanded ? "Collapse panel" : "Expand panel"}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        )}

        {!isCollapsed && (
          <div className="flex items-center justify-between flex-1">
            {isEditingName ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="h-8 text-sm"
                  autoFocus
                />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveName}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditingName(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold flex-1 tracking-tight">{nodeName}</h2>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditingName(true)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  {onDeleteNode && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleDeleteNode}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </motion.div>

      {isExpanded && (
        <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={toggleExpand}>
          <X className="h-4 w-4" />
        </Button>
      )}

      {!isCollapsed && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between"
          >
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">AI Model</label>
              <Select value={model} onValueChange={handleModelChange}>
                <SelectTrigger className="h-9 text-sm bg-background/60 backdrop-blur-sm">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name} <span className="text-xs text-muted-foreground ml-1">({model.provider})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {activeNodeId && onSaveNote && (
              <div className="ml-3">
                <NodeNotes nodeId={activeNodeId} notes={nodeNotes} onSaveNote={onSaveNote} />
              </div>
            )}
          </motion.div>

          {/* Add a section to display parent nodes in the chat panel */}
          {/* Add this after the model selector section */}
          {!isCollapsed && activeNodeId && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="px-4 py-2 border-t border-border bg-muted/10"
              >
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Parent Nodes</label>
                </div>

                {nodes?.find((n) => n.id === activeNodeId)?.data?.parents?.length > 0 ? (
                  <div className="mt-2 space-y-1.5">
                    {nodes
                      ?.find((n) => n.id === activeNodeId)
                      ?.data?.parents.map((parent: NodeParentInfo) => (
                        <Button
                          key={parent.id}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-xs h-7 gap-1.5"
                          onClick={() => onNavigateToNode && onNavigateToNode(parent.id)}
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${
                              parent.type === "mainNode"
                                ? "bg-primary"
                                : parent.type === "branchNode"
                                  ? "bg-orange-500"
                                  : "bg-blue-500"
                            }`}
                          ></div>
                          <span className="truncate">{parent.label}</span>
                        </Button>
                      ))}
                  </div>
                ) : (
                  <div className="py-2 text-center text-xs text-muted-foreground">No parent nodes</div>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          <motion.div
            className={`flex-1 overflow-auto p-4 space-y-4 custom-scrollbar ${
              isExpanded ? "max-h-[calc(100vh-180px)]" : ""
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {messages.length === 0 ? (
              <motion.div
                className="flex flex-col items-center justify-center h-full text-center p-6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, type: "spring" }}
              >
                <div className="bg-primary/10 p-4 rounded-full mb-4">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
                <p className="text-lg font-medium mb-2">No messages yet</p>
                <p className="text-muted-foreground text-sm max-w-xs">
                  Start a conversation by typing a message below. This will be part of your conversation node.
                </p>
              </motion.div>
            ) : (
              messages.map((message, index) => (
                <div key={message.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`flex flex-col ${message.sender === "user" ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-end gap-2">
                      {message.sender !== "user" && (
                        <div className="bg-primary/10 p-1.5 rounded-full">
                          <Bot className="h-3.5 w-3.5 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-2xl p-3.5 ${
                          message.sender === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border border-border shadow-sm"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      </div>
                      {message.sender === "user" && (
                        <div className="bg-primary/10 p-1.5 rounded-full">
                          <User className="h-3.5 w-3.5 text-primary" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground mt-1.5 px-2">
                      {format(new Date(message.timestamp), "h:mm a")}
                    </span>
                  </motion.div>

                  {/* Branch indicator */}
                  {branchPoints[message.id] && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className={`flex my-2 ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`flex items-center gap-1.5 h-7 px-2 py-1 text-xs rounded-md border border-dashed ${
                          message.sender === "user"
                            ? "border-primary/30 text-primary"
                            : "border-orange-500/30 text-orange-500"
                        }`}
                        onClick={() => handleNavigateToNode(branchPoints[message.id])}
                      >
                        <GitBranch className="h-3 w-3" />
                        <span>Branch created</span>
                        <CornerDownRight className="h-3 w-3 ml-1" />
                      </Button>
                    </motion.div>
                  )}

                  {/* Connection indicator */}
                  {connectionPoints[message.id] && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className={`flex my-2 ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`flex items-center gap-1.5 h-7 px-2 py-1 text-xs rounded-md border border-dashed ${
                          connectionPoints[message.id].type === "mainNode"
                            ? "border-primary/30 text-primary"
                            : connectionPoints[message.id].type === "branchNode"
                              ? "border-orange-500/30 text-orange-500"
                              : "border-blue-500/30 text-blue-500"
                        }`}
                        onClick={() => handleNavigateToNode(connectionPoints[message.id].nodeId)}
                      >
                        <Link className="h-3 w-3" />
                        <span>
                          {connectionPoints[message.id].direction === "outgoing" ? "Connected to" : "Connected from"}{" "}
                          {getNodeTypeName(connectionPoints[message.id].type)}
                        </span>
                        {connectionPoints[message.id].direction === "outgoing" ? (
                          <ArrowRight className="h-3 w-3 ml-1" />
                        ) : (
                          <ArrowLeft className="h-3 w-3 ml-1" />
                        )}
                      </Button>
                    </motion.div>
                  )}
                </div>
              ))
            )}
            {isThinking && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-start"
              >
                <div className="flex items-end gap-2">
                  <div className="bg-primary/10 p-1.5 rounded-full">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="bg-card border border-border shadow-sm rounded-2xl p-3.5">
                    <ThinkingAnimationComponent />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </motion.div>

          <motion.div
            className="p-4 border-t border-border bg-card/50"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            {commandFeedback?.active && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 py-2 mb-3 bg-orange-500/10 border border-orange-500/20 rounded-md flex items-center gap-2"
              >
                <GitBranch className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Creating branch node with content:</span>
                <span className="text-sm text-muted-foreground truncate">
                  {commandFeedback.content.substring(0, 30)}
                  {commandFeedback.content.length > 30 ? "..." : ""}
                </span>
              </motion.div>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder="Type your message..."
                  className="flex-1 bg-background/60 backdrop-blur-sm border-muted-foreground/20 focus-visible:ring-primary/30"
                />
                <Button type="submit" size="icon" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Tip: Type{" "}
                <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">/branch Your content</span> to
                create a new branch node
              </p>
            </form>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Resize handle */}
      {!isCollapsed && (
        <div
          className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-primary/20 active:bg-primary/40 transition-colors"
          onMouseDown={startResize}
        />
      )}
    </motion.div>
  )
}
