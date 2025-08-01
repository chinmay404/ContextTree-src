"use client"

import type React from "react"
import { useState, useRef, useCallback } from "react"
import type { Message } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Maximize2, Minimize2, X, Bot, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { availableModels } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import NodeNotes from "@/components/node-notes"
import ThinkingAnimation from "./thinking-animation"
import { useTheme } from "next-themes"
import KeyboardShortcuts from "@/components/keyboard-shortcuts"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/esm/styles/prism"
import "./chat-panel.css"
import { ChevronLeft, ChevronRight, Edit, Trash2 } from "lucide-react"

// Function to extract thinking content from a message
const extractThinking = (content: string): { thinking: string | null; content: string } => {
  const thinkRegex = /<Thinking>([\s\S]*?)<\/think>/
  const match = content.match(thinkRegex)

  if (match && match[1])
  \
  // Return the thinking content and the cleaned message content\
  return \
  thinking: match[1].trim(),\
  content: content.replace(thinkRegex, "").trim(),
    \
  \
  \
  return \
  thinking: null, content
  \
  \
}

interface ChatPanelProps \{
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
  branchPoints?: Record<string, string>\
  connectionPoints?: Record<string, \{ nodeId: string; type: string; direction: "incoming" | "outgoing" \}>
  onNavigateToNode?: (nodeId: string) => void
  nodeNotes?: Record<string, string>
  onSaveNote?: (nodeId: string, note: string) => void
  activeNodeId?: string
  nodes?: any[]
  thinking?: boolean
  isOpen: boolean
  onClose: () => void
  className?: string
\}

interface NodeParentInfo \{
  id: string
  label: string
  type: string
\}
\
export function ChatPanel(\{
  messages,
  onSendMessage,
  nodeName,
  onNodeNameChange,
  onCreateBranchNode,
  isCollapsed: propIsCollapsed,
  setIsCollapsed: propSetIsCollapsed,
  onDeleteNode,
  model = "gpt-4",
  onModelChange,\
  branchPoints = \{\},\
  connectionPoints = \{\},
  onNavigateToNode,\
  nodeNotes = \{\},
  onSaveNote,
  activeNodeId,
  nodes,
  thinking = false,
  isOpen,
  onClose,
  className,
\}: ChatPanelProps) \
{
  const [inputValue, setInputValue] = useState("")
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState(nodeName)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [panelWidth, setPanelWidth] = useState(320)
  const [isResizing, setIsResizing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const resizeStartXRef = useRef(0)
  const resizeStartWidthRef = useRef(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const resizeFrameRef = useRef<number | null>(null)
  \
  const [commandFeedback, setCommandFeedback] = useState<\
  active: boolean
  command: string
  content: string
  \
  \
  | null>(null)\
  const \{ toast \} = useToast()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  \
  const handleTogglePanel = () => \
  if (propSetIsCollapsed)
  \
  propSetIsCollapsed(!propIsCollapsed)
  \
    \
  else \
  setIsCollapsed(!isCollapsed)
  \
  \

  const isActuallyCollapsed = propIsCollapsed ?? isCollapsed
  const [createdBranchId, setCreatedBranchId] = useState<string | null>(null)
  const [readingMode, setReadingMode] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  \
  const \{ theme, setTheme \} = useTheme()
  \
  useEffect(() => \
  setEditedName(nodeName)
  \
  \
  , [nodeName])

  useEffect(() => \
  if (propIsCollapsed !== undefined)
  \
  setIsCollapsed(propIsCollapsed)
  \
  \
  \
  , [propIsCollapsed])

  // Add keyboard shortcut for full-screen toggle
  useEffect(() => \
  {
    \
    const handleKeyDown = (e: KeyboardEvent) => \
    // Toggle full-screen with F key or Escape to exit
    if (e.key === "f" && (e.ctrlKey || e.metaKey))
    \
    e.preventDefault()
    setIsExpanded((prev) => !prev)
    \
      \
    else
    if (e.key === "Escape" && isExpanded)
    \
    setIsExpanded(false)
    \
    \

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
    \
  \
  }
  , [isExpanded])

  // Focus input when entering full-screen mode
  useEffect(() => \
  if (isExpanded && inputRef.current)
  \
  \
      setTimeout(() => \
  inputRef.current?.focus()
  \
      \
  , 300)
    \
  \
  \
  , [isExpanded])
\
  const handleSubmit = (e: React.FormEvent) => \
  e.preventDefault()

  if (inputValue.trim())
  \
  if (inputValue.startsWith("/branch "))
  \
  {
    const branchContent = inputValue.substring(8).trim()

    if (branchContent && onCreateBranchNode)
    \
    {
      const branchId = onCreateBranchNode(branchContent)
      if (branchId)
      \
      setCreatedBranchId(branchId)
      \
            toast(\
      title: "Branch node created",\
      description: `Created a new branch node with content: "$\{branchContent.substring(
                0,
                30,
              )\}$\{branchContent.length > 30 ? "..." : ""\}"`,\
      \
      )
          \
      setInputValue("")
      return
      \
    }
    \
  }

  onSendMessage(inputValue)
  setInputValue("")
  \
  \
  \
  const handleSaveName = () => \
  if (editedName.trim())
  \
  onNodeNameChange(editedName)
  \
  setIsEditingName(false)
  \
  \
  const scrollToBottom = useCallback(() => \{\
    messagesEndRef.current?.scrollIntoView(\{ behavior: "smooth" \})
  \
}
, [])

  useEffect(() => \
{
  scrollToBottom()
  \
}
, [messages, scrollToBottom])

  useEffect(() => \
{
  if (isOpen && inputRef.current)
  \
  inputRef.current.focus()
  \
  \
}
, [isOpen])

const handleSendMessage = async () => \
{
  if (!inputValue.trim() || isLoading) return

  const userMessage: Message = \
  id: Date.now().toString(), content
  : inputValue.trim(),
      role: "user",
      timestamp: new Date(),
    \

  onSendMessage(userMessage.content)
  setInputValue("")
  setIsLoading(true)

  // Simulate AI response
  setTimeout(() => \{
      const assistantMessage: Message = \{
        id: (Date.now() + 1).toString(),
        content: `I understand you're asking about: "$\{userMessage.content\}". This is a simulated response. In a real implementation, this would connect to your AI service.`,
        role: "assistant",
        timestamp: new Date(),
      \}
      onSendMessage(assistantMessage.content)
      setIsLoading(false)
    \}, 1500)
  \
}

const handleKeyPress = (e: React.KeyboardEvent) => \
{
  if (e.key === "Enter" && !e.shiftKey)
  \
  e.preventDefault()
  handleSendMessage()
  \
  \
}

const copyMessage = (content: string) => \
{
  navigator.clipboard.writeText(content)
  toast(\{
      title: "Copied to clipboard",
      description: "Message content has been copied.",
    \})
  \
}

const toggleFullscreen = () => \
{
  setIsFullscreen(!isFullscreen)
  \
}

const selectedModel = availableModels.find((m) => m.id === model)?.name || "GPT-4"

const getNodeTypeName = (type: string) => \
{
    switch (type) \{
      case "mainNode":
        return "Main Node"
      case "branchNode":
        return "Branch Node"
      case "imageNode":
        return "Image"
      default:
        return "Node"
    \}
  \}

  const toggleTheme = () => \{
    setTheme(theme === "dark" ? "light" : "dark")
  \}

  const toggleCollapse = () => \{
    setIsCollapsed(!isCollapsed)
  \}

  const toggleExpand = () => \{
    setIsExpanded(!isExpanded)
  \}

  const handleDeleteNode = () => \{
    if (onDeleteNode) \
      onDeleteNode()
    \
  \}

  const handleModelChange = (newModel: string) => \{
    if (onModelChange) \
      onModelChange(newModel)
    \
  \}

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => \{
    setInputValue(e.target.value)
  \}

  const startResize = (e: React.MouseEvent) => \{
    e.preventDefault()
    setIsResizing(true)
    resizeStartXRef.current = e.clientX
    resizeStartWidthRef.current = panelWidth
  \}

  if (!isOpen) return null

  return (
    <>
      \{/* Overlay for fullscreen mode */\}
      \{isFullscreen && <div className="chat-panel-overlay" onClick=\{() => setIsFullscreen(false)\} />\}

      <motion.div
        ref=\{panelRef\}
        className=\{`relative flex flex-col h-full border-l border-border/60 layout-transition $\{
          isCollapsed ? "w-12" : ""
        \} $\{isExpanded ? "fixed right-0 top-0 h-screen z-50 w-full chat-panel-expanded shadow-xl" : ""\}`\}
        style=\{\{
          width: isCollapsed ? "48px" : isExpanded ? "100%" : `$\{panelWidth\}px`,
          marginTop: isExpanded ? "0" : "",
          height: isExpanded ? "100vh" : "",
          paddingTop: isExpanded ? "0" : "",
        \}\}
        initial=\{isCollapsed ? \{ width: "48px" \} : \{ width: `$\{panelWidth\}px` \}\}
        animate=\{isCollapsed ? \{ width: "48px" \} : isExpanded ? \{ width: "100%" \} : \{ width: `$\{panelWidth\}px` \}\}
        transition=\{\{ type: "spring", stiffness: 300, damping: 30 \}\}
      >
        \{/* Header for normal mode */\}
        \{!isExpanded && (
          <motion.div
            className=\{`chat-header p-4 border-b border-border/60 flex items-center`\}
            initial=\{\{ opacity: 0.8 \}\}
            animate=\{\{ opacity: 1 \}\}
            transition=\{\{ duration: 0.2 \}\}
          >
            <Button variant="ghost" size="icon" className="collapse-button h-8 w-8 mr-2" onClick=\{toggleCollapse\}>
              \{isCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />\}
            </Button>

            \{!isCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 mr-2"
                onClick=\{toggleExpand\}
                aria-label=\{isExpanded ? "Exit full-screen" : "Enter full-screen"\}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            )\}

            \{!isCollapsed && (
              <div className="flex items-center justify-between flex-1">
                \{isEditingName ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value=\{editedName\}
                      onChange=\{(e) => setEditedName(e.target.value)\}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick=\{handleSaveName\}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick=\{() => setIsEditingName(false)\}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-lg font-semibold flex-1 tracking-tight">\{nodeName\}</h2>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick=\{() => setIsEditingName(true)\}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      \{onDeleteNode && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick=\{handleDeleteNode\}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )\}
                    </div>
                  </>
                )\}
              </div>
            )\}
          </motion.div>
        )\}
        \{/* Enhanced full-screen header */\}
        \{isExpanded && (
          <motion.div
            initial=\{\{ opacity: 0, y: -10 \}\}
            animate=\{\{ opacity: 1, y: 0 \}\}
            className=\{`sticky top-0 z-10 w-full flex items-center justify-between p-4 border-b border-border $\{
              readingMode ? "bg-background/90 backdrop-blur-md" : "bg-card/95 backdrop-blur-md"
            \} shadow-sm`\}
          >
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-muted transition-colors"
                onClick=\{toggleExpand\}
                aria-label="Exit full-screen"
              >
                <Minimize2 className="h-5 w-5" />
              </Button>
              <h2 className="text-xl font-semibold tracking-tight">\{nodeName\}</h2>
              \{model && (
                <div className="hidden md:flex items-center ml-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    \{selectedModel\}
                  </span>
                </div>
              )\}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className=\{`h-8 text-xs $\{
                  readingMode ? "bg-primary/10 text-primary" : ""
                \} hover:bg-muted transition-colors`\}
                onClick=\{() => setReadingMode(!readingMode)\}
              >
                \{readingMode ? "Edit Mode" : "Reading Mode"\}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-muted transition-colors"
                onClick=\{toggleTheme\}
              >
                \{theme === "dark" ? <X className="h-4 w-4" /> : <Bot className="h-4 w-4" />\}
              </Button>
              <div className="hidden md:flex items-center">
                <KeyboardShortcuts />
              </div>
            </div>
          </motion.div>
        )\}
        \{!isCollapsed && (
          <AnimatePresence mode="wait">
            \{!isExpanded && (
              <motion.div
                key="chat-header"
                initial=\{\{ opacity: 0, y: -10 \}\}
                animate=\{\{ opacity: 1, y: 0 \}\}
                exit=\{\{ opacity: 0, y: -10 \}\}
                transition=\{\{ duration: 0.3 \}\}
                className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between"
              >
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">AI Model</label>
                  <Select value=\{model\} onValueChange=\{handleModelChange\}>
                    <SelectTrigger className="h-9 text-sm bg-background/70 backdrop-blur-sm border-border/60 shadow-sm hover:shadow transition-shadow duration-200">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent className="border-border/60 shadow-md">
                      \{availableModels.map((model) => (
                        <SelectItem key=\{model.id\} value=\{model.id\} className="focus:bg-primary/10">
                          \{model.name\} <span className="text-xs text-muted-foreground ml-1">(\{model.provider\})</span>
                        </SelectItem>
                      ))\}
                    </SelectContent>
                  </Select>
                </div>
                \{activeNodeId && onSaveNote && (
                  <div className="ml-3">
                    <NodeNotes nodeId=\{activeNodeId\} notes=\{nodeNotes\} onSaveNote=\{onSaveNote\} />
                  </div>
                )\}
              </motion.div>
            )\}

            \{!isCollapsed && !isExpanded && activeNodeId && (
              <AnimatePresence mode="wait">
                <motion.div
                  key="parent-nodes-panel"
                  initial=\{\{ opacity: 0, y: -10 \}\}
                  animate=\{\{ opacity: 1, y: 0 \}\}
                  exit=\{\{ opacity: 0, y: -10 \}\}
                  transition=\{\{ duration: 0.3 \}\}
                  className="px-4 py-2 border-t border-border bg-muted/10"
                >
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">Parent Nodes</label>
                  </div>

                  \{nodes?.find((n) => n.id === activeNodeId)?.data?.parents?.length > 0 ? (
                    <div className="mt-2 space-y-1.5">
                      \{nodes
                        ?.find((n) => n.id === activeNodeId)
                        ?.data?.parents.map((parent: NodeParentInfo) => (
                          <Button
                            key=\{parent.id\}
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-xs h-7 gap-1.5 bg-transparent"
                            onClick=\{() => onNavigateToNode && onNavigateToNode(parent.id)\}
                          >
                            <div
                              className=\{`w-2 h-2 rounded-full $\{
                                parent.type === "mainNode"
                                  ? "bg-primary"
                                  : parent.type === "branchNode"
                                    ? "bg-orange-500"
                                    : "bg-blue-500"
                              \}`\}
                            ></div>
                            <span className="truncate">\{parent.label\}</span>
                          </Button>
                        ))\}
                    </div>
                  ) : (
                    <div className="py-2 text-center text-xs text-muted-foreground">No parent nodes</div>
                  )\}
                </motion.div>
              </AnimatePresence>
            )\}

            \{/* Enhanced messages container for full-screen mode */\}
            <motion.div
              className=\{`flex-1 overflow-auto chat-scrollbar $\{
                isExpanded
                  ? readingMode
                    ? "px-4 md:px-0 py-8 max-w-3xl mx-auto"
                    : "p-6 md:p-8 max-w-4xl mx-auto"
                  : "p-4"
              \} space-y-8 $\{isExpanded ? "max-h-[calc(100vh-140px)]" : ""\}`\}
              initial=\{\{ opacity: 0 \}\}
              animate=\{\{ opacity: 1 \}\}
              transition=\{\{ duration: 0.3, delay: 0.1 \}\}
            >
              \{messages.length === 0 ? (
                <motion.div
                  className="flex flex-col items-center justify-center h-full text-center p-6"
                  initial=\{\{ opacity: 0, scale: 0.9 \}\}
                  animate=\{\{ opacity: 1, scale: 1 \}\}
                  transition=\{\{ duration: 0.4, type: "spring" \}\}
                >
                  <div className="bg-primary/10 p-4 rounded-full mb-4">
                    <Bot className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-lg font-medium mb-2">No messages yet</p>
                  <p className="text-muted-foreground text-sm max-w-xs">
                    Start a conversation by typing a message below. This will be part of your conversation node.
                  </p>
                </motion.div>
              ) : (
                messages.map((message, index) => \{
                  const \{ thinking: messageThinking, content \} = extractThinking(message.content)

                  return (
                    <div key=\{message.id\} className="mb-8">
                      <motion.div
                        initial=\{\{ opacity: 0, y: 10 \}\}
                        animate=\{\{ opacity: 1, y: 0 \}\}
                        transition=\{\{ duration: 0.3, delay: index * 0.05 \}\}
                        className=\{`flex flex-col group $\{message.sender === "user" ? "items-end" : "items-start"\}`\}
                      >
                        \{/* Thinking section */\}
                        \{messageThinking && (
                          <motion.div
                            initial=\{\{ opacity: 0, height: 0 \}\}
                            animate=\{\{ opacity: 1, height: "auto" \}\}
                            className=\{`mb-2 w-full max-w-[85%] md:max-w-[75%] $\{
                              message.sender === "user" ? "self-end" : "self-start"
                            \}`\}
                          >
                            <details className="bg-muted/30 rounded-lg border border-border/50 text-sm">
                              <summary className="cursor-pointer p-2 font-medium text-xs flex items-center gap-1.5 text-muted-foreground">
                                <span className="inline-flex items-center justify-center rounded-full bg-primary/10 p-1">
                                  <Bot className="h-3 w-3 text-primary" />
                                </span>
                                Thinking process
                              </summary>
                              <div className="p-3 pt-1 whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                                \{messageThinking\}
                              </div>
                            </details>
                          </motion.div>
                        )\}

                        <div className="flex items-end gap-2 relative">
                          \{message.sender !== "user" && (
                            <div className="bg-primary/15 p-1.5 rounded-full shadow-sm">
                              <Bot className="h-3.5 w-3.5 text-primary" />
                            </div>
                          )\}
                          <div
                            className=\{`$\{
                              isExpanded
                                ? message.sender === "user"
                                  ? "chat-message-user max-w-[85%] md:max-w-[75%] p-4"
                                  : "chat-message-ai max-w-[85%] md:max-w-[75%] p-4"
                                : message.sender === "user"
                                  ? "chat-message-user max-w-[85%] p-3.5"
                                  : "chat-message-ai max-w-[85%] p-3.5"
                            \} relative chat-typography`\}
                          >
                            \{message.sender === "user" ? (
                              <p className=\{`$\{isExpanded ? "text-base leading-relaxed" : "text-sm leading-relaxed"\}`\}>
                                \{content\}
                              </p>
                            ) : (
                              <div className=\{`$\{isExpanded ? "text-base" : "text-sm"\} markdown-content`\}>
                                <ReactMarkdown
                                  remarkPlugins=\{[remarkGfm]\}
                                  components=\{\{
                                    code(\{ node, inline, className, children, ...props \}) \{
                                      const match = /language-(\w+)/.exec(className || "")
                                      return !inline && match ? (
                                        <SyntaxHighlighter
                                          style=\{theme === "dark" ? vscDarkPlus : vs\}
                                          language=\{match[1]\}
                                          PreTag="div"
                                          \{...props\}
                                        >
                                          \{String(children).replace(/\n$/, "")\}
                                        </SyntaxHighlighter>
                                      ) : (
                                        <code
                                          className=\{`$\{className\} bg-muted px-1 py-0.5 rounded text-sm font-mono`\}
                                          \{...props\}
                                        >
                                          \{children\}
                                        </code>
                                      )
                                    \},
                                    p: (\{ children \}) => <p className="mb-4 last:mb-0">\{children\}</p>,
                                    ul: (\{ children \}) => <ul className="mb-4 list-disc pl-6 last:mb-0">\{children\}</ul>,
                                    ol: (\{ children \}) => (
                                      <ol className="mb-4 list-decimal pl-6 last:mb-0">\{children\}</ol>
                                    ),
                                    li: (\{ children \}) => <li className="mb-1">\{children\}</li>,
                                    h1: (\{ children \}) => <h1 className="text-xl font-bold mb-4 mt-6">\{children\}</h1>,
                                    h2: (\{ children \}) => <h2 className="text-lg font-bold mb-3 mt-5">\{children\}</h2>,
                                    h3: (\{ children \}) => <h3 className="text-md font-bold mb-2 mt-4">\{children\}</h3>,
                                    a: (\{ href, children \}) => (
                                      <a
                                        href=\{href\}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary underline"
                                      >
                                        \{children\}
                                      </a>
                                    ),
                                    blockquote: (\{ children \}) => (
                                      <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic my-4">
                                        \{children\}
                                      </blockquote>
                                    ),
                                    hr: () => <hr className="my-4 border-border" />,
                                    table: (\{ children \}) => (
                                      <div className="overflow-x-auto my-4">
                                        <table className="min-w-full divide-y divide-border">\{children\}</table>
                                      </div>
                                    ),
                                    thead: (\{ children \}) => <thead className="bg-muted/50">\{children\}</thead>,
                                    tbody: (\{ children \}) => (
                                      <tbody className="divide-y divide-border">\{children\}</tbody>
                                    ),
                                    tr: (\{ children \}) => <tr>\{children\}</tr>,
                                    th: (\{ children \}) => (
                                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        \{children\}
                                      </th>
                                    ),
                                    td: (\{ children \}) => <td className="px-3 py-2 whitespace-nowrap">\{children\}</td>,
                                  \}\}
                                >
                                  \{content\}
                                </ReactMarkdown>
                              </div>
                            )\}
                          </div>
                          \{message.sender === "user" && (
                            <div className="bg-primary/15 p-1.5 rounded-full shadow-sm">
                              <User className="h-3.5 w-3.5 text-primary" />
                            </div>
                          )\}
                        </div>
                        <span className=\{`text-xs text-muted-foreground mt-1.5 px-2 $\{isExpanded ? "opacity-70" : ""\}`\}>
                          \{format(new Date(message.timestamp), "h:mm a")\}
                        </span>
                      </motion.div>

                      \{/* Branch indicator */\}
                      \{branchPoints[message.id] && (
                        <motion.div
                          initial=\{\{ opacity: 0, y: 5 \}\}
                          animate=\{\{ opacity: 1, y: 0 \}\}
                          transition=\{\{ duration: 0.3, delay: 0.1 \}\}
                          className=\{`flex my-2 $\{message.sender === "user" ? "justify-end" : "justify-start"\}`\}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className=\{`flex items-center gap-1.5 h-7 px-2 py-1 text-xs rounded-md border border-dashed $\{
                              message.sender === "user"
                                ? "border-primary/30 text-primary"
                                : "border-orange-500/30 text-orange-500"
                            \}`\}
                            onClick=\{() => onNavigateToNode && onNavigateToNode(branchPoints[message.id])\}
                          >
                            <Bot className="h-3 w-3" />
                            <span>Branch created</span>
                            <Bot className="h-3 w-3 ml-1" />
                          </Button>
                        </motion.div>
                      )\}

                      \{/* Connection indicator */\}
                      \{connectionPoints[message.id] && (
                        <motion.div
                          initial=\{\{ opacity: 0, y: 5 \}\}
                          animate=\{\{ opacity: 1, y: 0 \}\}
                          transition=\{\{ duration: 0.3, delay: 0.1 \}\}
                          className=\{`flex my-2 $\{message.sender === "user" ? "justify-end" : "justify-start"\}`\}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className=\{`flex items-center gap-1.5 h-7 px-2 py-1 text-xs rounded-md border border-dashed $\{
                              connectionPoints[message.id].type === "mainNode"
                                ? "border-primary/30 text-primary"
                                : connectionPoints[message.id].type === "branchNode"
                                  ? "border-orange-500/30 text-orange-500"
                                  : "border-blue-500/30 text-blue-500"
                            \}`\}
                            onClick=\{() => onNavigateToNode && onNavigateToNode(connectionPoints[message.id].nodeId)\}
                          >
                            <Bot className="h-3 w-3" />
                            <span>
                              \{connectionPoints[message.id].direction === "outgoing"
                                ? "Connected to"
                                : "Connected from"\}\{" "\}
                              \{getNodeTypeName(connectionPoints[message.id].type)\}
                            </span>
                            \{connectionPoints[message.id].direction === "outgoing" ? (
                              <Bot className="h-3 w-3 ml-1" />
                            ) : (
                              <Bot className="h-3 w-3 ml-1" />
                            )\}
                          </Button>
                        </motion.div>
                      )\}
                    </div>
                  )
                \})
              )\}
              \{thinking && (
                <motion.div
                  initial=\{\{ opacity: 0, y: 10 \}\}
                  animate=\{\{ opacity: 1, y: 0 \}\}
                  className="flex flex-col items-start"
                >
                  <div className="flex items-end gap-2">
                    <div className="bg-primary/10 p-1.5 rounded-full">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="bg-card border border-border shadow-sm rounded-2xl p-3.5">
                      <ThinkingAnimation />
                    </div>
                  </div>
                </motion.div>
              )\}
              <div ref=\{messagesEndRef\} />
            </motion.div>

            \{/* Enhanced input area for full-screen mode */\}
            <motion.div
              className=\{`$\{
                isExpanded
                  ? readingMode
                    ? "hidden"
                    : "sticky bottom-0 p-6 border-t border-border/60 bg-gradient-to-r from-background/95 to-card/95 backdrop-blur-md max-w-4xl mx-auto w-full shadow-md"
                  : "p-4 border-t border-border/60 bg-gradient-to-b from-background/80 to-card/80 backdrop-blur-sm"
              \}`\}
              initial=\{\{ opacity: 0, y: 10 \}\}
              animate=\{\{ opacity: 1, y: 0 \}\}
              transition=\{\{ duration: 0.3, delay: 0.2 \}\}
            >
              \{commandFeedback?.active && (
                <motion.div
                  initial=\{\{ opacity: 0, height: 0 \}\}
                  animate=\{\{ opacity: 1, height: "auto" \}\}
                  exit=\{\{ opacity: 0, height: 0 \}\}
                  className="px-4 py-2 mb-3 bg-orange-500/10 border border-orange-500/20 rounded-md flex items-center gap-2"
                >
                  <Bot className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">Creating branch node with content:</span>
                  <span className="text-sm text-muted-foreground truncate">
                    \{commandFeedback.content.substring(0, 30)\}
                    \{commandFeedback.content.length > 30 ? "..." : ""\}
                  </span>
                </motion.div>
              )\}
              <form onSubmit=\{handleSubmit\} className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Input
                    ref=\{inputRef\}
                    value=\{inputValue\}
                    onChange=\{handleInputChange\}
                    placeholder="Type your message..."
                    className=\{`flex-1 chat-input $\{
                      isExpanded ? "h-12 text-base rounded-xl" : "transition-shadow duration-200"
                    \}`\}
                  />
                  <Button
                    type="submit"
                    size=\{isExpanded ? "default" : "icon"\}
                    className=\{`chat-send-button $\{isExpanded ? "px-6 rounded-xl h-12" : ""\}`\}
                  >
                    \{isExpanded ? (
                      <span className="flex items-center gap-2">
                        <Bot className="h-4 w-4" /> Send
                      </span>
                    ) : (
                      <Bot className="h-4 w-4" />
                    )\}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tip: Type\{" "\}
                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">/branch Your content</span> to
                  create a new branch node
                </p>
              </form>
            </motion.div>
          </AnimatePresence>
        )\}
        \{/* Resize handle */\}
        \{!isCollapsed && !isExpanded && (
          <div
            className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-primary/20 active:bg-primary/40 transition-colors"
            onMouseDown=\{startResize\}
          />
        )\}
      </motion.div>
    </>
  )
\}

// Export both named and default
export default ChatPanel
