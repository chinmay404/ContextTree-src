"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Edge,
  type Node,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import ChatPanel from "./chat-panel"
import MainNode from "./nodes/main-node"
import BranchNode from "./nodes/branch-node"
import ImageNode from "./nodes/image-node"
import CustomEdge from "./edges/custom-edge"
import { MessageSquare, Plus, Save, Download, Layers } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { v4 as uuidv4 } from "uuid"
import type { Message, Conversation } from "@/lib/types"
import { useSession } from "next-auth/react"
import { initializeDatabase } from "@/lib/init-db"

const nodeTypes = {
  main: MainNode,
  branch: BranchNode,
  image: ImageNode,
  mainNode: MainNode,
  branchNode: BranchNode,
  imageNode: ImageNode,
}

const edgeTypes = {
  custom: CustomEdge,
}

const initialNodes: Node[] = [
  {
    id: "1",
    type: "mainNode",
    position: { x: 250, y: 100 },
    data: {
      label: "Start",
      messages: [
        {
          id: uuidv4(),
          sender: "ai" as const,
          content: "Hello! How can i help you today",
          timestamp: Date.now(),
        },
      ],
      isEditing: false,
      expanded: true,
      style: { width: 250 },
      model: "gpt-4",
      parents: [],
    },
  },
]

const initialEdges: Edge[] = []

interface ConversationCanvasProps {
  className?: string
}

export function ConversationCanvas({ className }: ConversationCanvasProps) {
  const { data: session, status } = useSession()
  const [isMounted, setIsMounted] = useState(false)

  // Prevent SSR issues
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved")
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null)
  const [activeNode, setActiveNode] = useState("1")
  const [nodeName, setNodeName] = useState("Start")
  const [messages, setMessages] = useState<Message[]>([
    { id: uuidv4(), sender: "ai", content: "Hello!", timestamp: Date.now() },
  ])
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: uuidv4(),
      name: "New Context",
      nodes: initialNodes,
      edges: initialEdges,
    },
  ])
  const [activeConversation, setActiveConversation] = useState(conversations[0]?.id || "")
  const [branchCount, setBranchCount] = useState(1)
  const [reactFlowInstance, setReactFlowInstance] = useState(null)
  const [showConnectionMode, setShowConnectionMode] = useState(false)
  const [connectionSource, setConnectionSource] = useState<string | null>(null)
  const [chatPanelCollapsed, setChatPanelCollapsed] = useState(false)
  const [activeNodeModel, setActiveNodeModel] = useState("gpt-4")
  const [branchPoints, setBranchPoints] = useState<Record<string, string>>({})
  const [connectionPoints, setConnectionPoints] = useState<
    Record<string, { nodeId: string; type: string; direction: "incoming" | "outgoing" }>
  >({})
  const lastViewportRef = useRef({ x: 0, y: 0, zoom: 1 })
  const [connectionEvents, setConnectionEvents] = useState<
    Array<{
      id: string
      timestamp: number
      type: "connect" | "disconnect"
      sourceId: string
      targetId: string
      sourceType: string
      targetType: string
      sourceLabel: string
      targetLabel: string
    }>
  >([])
  const [nodeNotes, setNodeNotes] = useState<Record<string, string>>({})
  // Add the chatThinking state
  const [chatThinking, setChatThinking] = useState(false)
  // Add loading state for database operations
  const [isSaving, setIsSaving] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [dbInitialized, setDbInitialized] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [interactionHistory, setInteractionHistory] = useState<any[]>([])
  // Add state for error and countdown
  const [loadError, setLoadError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(5)
  const [forceProceed, setForceProceed] = useState(false)
  // Enhanced save-related state
  const [savePreferences, setSavePreferences] = useState<any>({
    enableAutoSave: true,
    autoSaveIntervalMs: 10000,
    maxBackupCount: 50,
    enableCloudSync: true,
    saveOnExit: true,
    compressionEnabled: false,
  })
  const [saveAnalytics, setSaveAnalytics] = useState<any>(null)
  const [pendingChanges, setPendingChanges] = useState(false)
  const [lastChangeTimestamp, setLastChangeTimestamp] = useState<number>(Date.now())
  const [saveQueue, setSaveQueue] = useState<any[]>([])
  const [retryCount, setRetryCount] = useState(0)
  const [saveResult, setSaveResult] = useState<any>(null)
  const [backupCount, setBackupCount] = useState(0)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // UI component states
  const [showBackupManager, setShowBackupManager] = useState(false)
  const [showSavePreferences, setShowSavePreferences] = useState(false)
  const [showSaveAnalytics, setShowSaveAnalytics] = useState(false)

  // Auto-save timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const saveTimeoutDuration = 10000 // 10 seconds

  // Initialize database
  useEffect(() => {
    const initDb = async () => {
      if (!dbInitialized) {
        try {
          const result = await initializeDatabase()
          if (result.success) {
            setDbInitialized(true)
            console.log("Database initialized successfully")
          } else {
            console.error("Failed to initialize database:", result.error)
          }
        } catch (error) {
          console.error("Error initializing database:", error)
        }
      }
    }

    if (status === "authenticated") {
      initDb()
    }
  }, [status, dbInitialized])

  // Simple placeholder functions for the demo
  const onNodeClick = useCallback((nodeId: string) => {
    setActiveNode(nodeId)
  }, [])

  const onSendMessage = useCallback((content: string) => {
    const newMessage: Message = {
      id: uuidv4(),
      sender: "user",
      content,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, newMessage])
  }, [])

  const onNodeNameChange = useCallback((name: string) => {
    setNodeName(name)
  }, [])

  const createBranchNodeFromChat = useCallback((content: string) => {
    return uuidv4()
  }, [])

  const onActiveNodeDelete = useCallback(() => {
    // Placeholder
  }, [])

  const onActiveNodeModelChange = useCallback((model: string) => {
    setActiveNodeModel(model)
  }, [])

  const navigateToNode = useCallback((nodeId: string) => {
    setActiveNode(nodeId)
  }, [])

  const saveNodeNote = useCallback((nodeId: string, note: string) => {
    setNodeNotes((prev) => ({ ...prev, [nodeId]: note }))
  }, [])

  const addNode = useCallback(
    (type: "main" | "branch" | "image") => {
      const newNode: Node = {
        id: `${Date.now()}`,
        type,
        position: {
          x: Math.random() * 400 + 200,
          y: Math.random() * 400 + 200,
        },
        data: {
          label: `New ${type} node`,
          content: type === "image" ? "" : "Enter your content here...",
          isMain: type === "main",
        },
      }
      setNodes((nds) => [...nds, newNode])
      setSaveStatus("unsaved")
    },
    [setNodes],
  )

  const saveCanvas = useCallback(async () => {
    setSaveStatus("saving")
    setIsLoading(true)

    // Simulate save operation
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setSaveStatus("saved")
    setIsLoading(false)
    toast({
      title: "Canvas saved",
      description: "Your conversation canvas has been saved successfully.",
    })
  }, [toast])

  const exportCanvas = useCallback(() => {
    const canvasData = {
      nodes,
      edges,
      timestamp: new Date().toISOString(),
      version: "1.0",
    }

    const blob = new Blob([JSON.stringify(canvasData, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `conversation-canvas-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Canvas exported",
      description: "Your canvas has been downloaded as a JSON file.",
    })
  }, [nodes, edges, toast])

  // Auto-save functionality
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (saveStatus === "unsaved") {
        saveCanvas()
      }
    }, 30000) // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval)
  }, [saveStatus, saveCanvas])

  // Mark as unsaved when nodes or edges change
  useEffect(() => {
    setSaveStatus("unsaved")
  }, [nodes, edges])

  if (!isMounted) {
    return null
  }

  return (
    <div className={cn("h-screen w-full flex flex-col bg-background", className)}>
      {/* Top Toolbar */}
      <div className="flex-shrink-0 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">ContextTree Canvas</h1>
            <Badge
              variant={saveStatus === "saved" ? "default" : saveStatus === "saving" ? "secondary" : "destructive"}
              className="text-xs"
            >
              {saveStatus === "saved" && "Saved"}
              {saveStatus === "saving" && "Saving..."}
              {saveStatus === "unsaved" && "Unsaved changes"}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => addNode("main")} className="btn-enhanced">
              <Plus className="h-4 w-4 mr-2" />
              Main Node
            </Button>
            <Button variant="outline" size="sm" onClick={() => addNode("branch")} className="btn-enhanced">
              <Plus className="h-4 w-4 mr-2" />
              Branch
            </Button>
            <Button variant="outline" size="sm" onClick={() => addNode("image")} className="btn-enhanced">
              <Plus className="h-4 w-4 mr-2" />
              Image
            </Button>

            <Separator orientation="vertical" className="h-6" />

            <Button
              variant="outline"
              size="sm"
              onClick={saveCanvas}
              disabled={isLoading || saveStatus === "saved"}
              className="btn-enhanced bg-transparent"
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" size="sm" onClick={exportCanvas} className="btn-enhanced bg-transparent">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>

            <Separator orientation="vertical" className="h-6" />

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={cn("btn-enhanced", isChatOpen && "bg-primary text-primary-foreground")}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              AI Chat
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative">
        <div ref={reactFlowWrapper} className="h-full w-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            className="bg-background"
          >
            <Background color="hsl(var(--muted-foreground))" gap={20} size={1} variant="dots" />
            <Controls className="bg-card border border-border rounded-lg shadow-md" showInteractive={false} />
            <MiniMap
              className="bg-card border border-border rounded-lg shadow-md"
              nodeColor="hsl(var(--primary))"
              maskColor="hsl(var(--muted) / 0.8)"
            />
          </ReactFlow>
        </div>

        {/* Stats Panel */}
        <Card className="absolute top-4 left-4 w-64 card-enhanced">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Canvas Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Nodes:</span>
              <Badge variant="secondary">{nodes.length}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Connections:</span>
              <Badge variant="secondary">{edges.length}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={saveStatus === "saved" ? "default" : "secondary"} className="text-xs">
                {saveStatus}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Chat Panel */}
        <ChatPanel
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          messages={messages}
          onSendMessage={onSendMessage}
          nodeName={nodeName}
          onNodeNameChange={onNodeNameChange}
          onCreateBranchNode={createBranchNodeFromChat}
          isCollapsed={chatPanelCollapsed}
          setIsCollapsed={setChatPanelCollapsed}
          onDeleteNode={onActiveNodeDelete}
          model={activeNodeModel}
          onModelChange={onActiveNodeModelChange}
          branchPoints={branchPoints}
          connectionPoints={connectionPoints}
          onNavigateToNode={navigateToNode}
          nodeNotes={nodeNotes}
          onSaveNote={saveNodeNote}
          activeNodeId={activeNode}
          nodes={nodes}
          thinking={chatThinking}
        />
      </div>
    </div>
  )
}

// Export both named and default
export default ConversationCanvas
