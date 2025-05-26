"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useNodesState, useEdgesState, MarkerType } from "reactflow"
import "reactflow/dist/style.css"
import Navbar from "@/components/navbar"
import ChatPanel from "@/components/chat-panel"
import FlowCanvas from "@/components/flow-canvas"
import LeftSidebar from "@/components/left-sidebar"
import MainNode from "@/components/nodes/main-node"
import BranchNode from "@/components/nodes/branch-node"
import ImageNode from "@/components/nodes/image-node"
import CustomEdge from "@/components/edges/custom-edge"
import { useToast } from "@/components/ui/use-toast"
import { v4 as uuidv4 } from "uuid"
import type { Message, Conversation } from "@/lib/types"
import type { Edge } from "reactflow"
import ConnectionHistory from "@/components/connection-history"
import type { NodeParentInfo } from "@/lib/types"
// Add import for the API service at the top
import { getChatResponse } from "@/lib/api-service"
import { getMockResponse } from "@/lib/mock-response"
// Import server actions
import {
  saveConversation,
  getUserConversations,
  deleteConversation as deleteConversationFromDB,
  setActiveConversation as setActiveConversationInDB,
  trackInteraction,
  getInteractionHistory,
} from "@/app/actions/canvas"
import { useSession } from "next-auth/react"
import { initializeDatabase } from "@/lib/init-db"
import { useEffect as useEffectOriginal } from "react"
import SessionManager from "@/components/session-manager"
import SaveStatus from "@/components/save-status"

const initialNodes = [
  {
    id: "1",
    type: "mainNode",
    position: { x: 250, y: 100 },
    data: {
      label: "Start",
      messages: [{ id: uuidv4(), sender: "ai", content: "Hello!", timestamp: Date.now() }],
      isEditing: false,
      expanded: true,
      style: { width: 250 },
      model: "gpt-4",
      parents: [],
    },
  },
]

const initialEdges = []

const nodeTypes = {
  mainNode: MainNode,
  branchNode: BranchNode,
  imageNode: ImageNode,
}

const edgeTypes = {
  custom: CustomEdge,
}

// Default React Flow options for smooth interactions
const defaultEdgeOptions = {
  animated: true,
  type: "custom",
  style: { stroke: "#3b82f6" },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "#3b82f6",
  },
}

export default function ContextTree() {
  const { data: session, status } = useSession()
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedEdge, setSelectedEdge] = useState(null)
  const [activeNode, setActiveNode] = useState("1")
  const [nodeName, setNodeName] = useState("Start")
  const [messages, setMessages] = useState<Message[]>([
    { id: uuidv4(), sender: "ai", content: "Hello!", timestamp: Date.now() },
  ])
  const [conversations, setConversations] = useState<Conversation[]>([
    { id: uuidv4(), name: "New Context", nodes: initialNodes, edges: initialEdges },
  ])
  const [activeConversation, setActiveConversation] = useState(conversations[0].id)
  const [branchCount, setBranchCount] = useState(1)
  const { toast } = useToast()
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
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [dbInitialized, setDbInitialized] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [interactionHistory, setInteractionHistory] = useState<any[]>([])

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

  // Load user conversations from MongoDB when component mounts
  useEffect(() => {
    const loadUserData = async () => {
      if (status === "authenticated" && session?.user && !isInitialized && dbInitialized) {
        setIsLoading(true)
        try {
          const result = await getUserConversations()

          if (result.success) {
            // Store the session ID
            if (result.sessionId) {
              setCurrentSessionId(result.sessionId)
            }

            if (result.conversations.length > 0) {
              setConversations(result.conversations)

              // Set active conversation
              if (result.activeConversationId) {
                setActiveConversation(result.activeConversationId)
              } else {
                // Default to the first conversation
                setActiveConversation(result.conversations[0].id)
              }

              // Load interaction history for the active conversation
              if (result.activeConversationId) {
                const historyResult = await getInteractionHistory(result.activeConversationId)
                if (historyResult.success) {
                  setInteractionHistory(historyResult.interactions)
                }
              }

              setIsInitialized(true)
            } else if (result.success && result.conversations.length === 0) {
              // No conversations found, create a default one and save it
              const defaultConversation = {
                id: uuidv4(),
                name: "New Context",
                nodes: initialNodes,
                edges: initialEdges,
              }

              setConversations([defaultConversation])
              setActiveConversation(defaultConversation.id)

              // Save the default conversation
              const saveResult = await saveConversation(defaultConversation)
              if (saveResult.sessionId) {
                setCurrentSessionId(saveResult.sessionId)
              }

              setIsInitialized(true)
            }
          }
        } catch (error) {
          console.error("Error loading user data:", error)
          toast({
            title: "Error loading your data",
            description: "There was a problem loading your conversations. Please try again.",
            variant: "destructive",
          })
        } finally {
          setIsLoading(false)
        }
      }
    }

    loadUserData()
  }, [status, session, toast, isInitialized, dbInitialized])

  // Set up auto-save
  useEffect(() => {
    if (status === "authenticated" && isInitialized && dbInitialized) {
      // Clear any existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }

      // Set a new timer for auto-save
      autoSaveTimerRef.current = setTimeout(async () => {
        await handleAutoSave()
      }, saveTimeoutDuration)
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [conversations, activeConversation, nodes, edges, status, isInitialized, dbInitialized])

  // Track online/offline status
  useEffectOriginal(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Handle auto-save
  const handleAutoSave = async () => {
    if (status === "authenticated" && isInitialized && dbInitialized) {
      try {
        setIsSaving(true)

        // Find the active conversation
        const activeConv = conversations.find((conv) => conv.id === activeConversation)
        if (activeConv) {
          // Save the active conversation
          const result = await saveConversation(activeConv, currentSessionId)

          if (result.success) {
            // Update session ID if it was created during save
            if (result.sessionId && !currentSessionId) {
              setCurrentSessionId(result.sessionId)
            }

            setLastSaved(new Date())
            console.log("Auto-saved successfully")
          } else {
            throw new Error(result.error || "Unknown error")
          }
        }
      } catch (error) {
        console.error("Auto-save failed:", error)
      } finally {
        setIsSaving(false)
      }
    }
  }

  useEffect(() => {
    // Sync nodes and edges with the active conversation
    const activeConv = conversations.find((conv) => conv.id === activeConversation)
    if (activeConv) {
      setNodes(activeConv.nodes)
      setEdges(activeConv.edges)
    }
  }, [activeConversation, conversations, setNodes, setEdges])

  useEffect(() => {
    // Sync active node data
    const activeNodeData = nodes.find((node) => node.id === activeNode)?.data
    if (activeNodeData) {
      setNodeName(activeNodeData.label)
      setMessages(activeNodeData.messages)
      setActiveNodeModel(activeNodeData.model || "gpt-4")
    }
  }, [activeNode, nodes])

  // Save viewport state when it changes
  const onViewportChange = useCallback((viewport) => {
    lastViewportRef.current = viewport
  }, [])

  const onNodeClick = useCallback(
    (nodeId: string) => {
      if (showConnectionMode && connectionSource) {
        // If we're in connection mode and have a source, create a connection
        if (nodeId !== connectionSource) {
          const newEdge = {
            id: `e${connectionSource}-${nodeId}`,
            source: connectionSource,
            target: nodeId,
            type: "custom",
            animated: true,
            style: { stroke: "#3b82f6" },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "#3b82f6",
            },
            data: {
              label: "Connection",
            },
          }

          setEdges((eds) => [...eds, newEdge])

          // Update conversation edges
          setConversations((prevConversations) =>
            prevConversations.map((conv) => {
              if (conv.id === activeConversation) {
                return {
                  ...conv,
                  edges: [...(conv.edges || []), newEdge],
                }
              }
              return conv
            }),
          )

          // If the active node is involved in this connection, add a connection point
          if (connectionSource === activeNode || nodeId === activeNode) {
            // Get the last message ID to attach the connection point to
            if (messages.length > 0) {
              const lastMessageId = messages[messages.length - 1].id
              const targetNodeData = nodes.find(
                (n) => n.id === (connectionSource === activeNode ? nodeId : connectionSource),
              )
              const nodeType = targetNodeData?.type || "unknown"

              setConnectionPoints((prev) => ({
                ...prev,
                [lastMessageId]: {
                  nodeId: connectionSource === activeNode ? nodeId : connectionSource,
                  type: nodeType,
                  direction: connectionSource === activeNode ? "outgoing" : "incoming",
                },
              }))

              toast({
                title: "Connection created",
                description: `Node "${targetNodeData?.data?.label || "Unknown"}" has been connected to this conversation.`,
              })
            }
          }

          // Exit connection mode
          setShowConnectionMode(false)
          setConnectionSource(null)
        }
      } else {
        // Normal node click behavior
        setActiveNode(nodeId)

        // Ensure the chat panel is visible and not collapsed
        if (setChatPanelCollapsed) {
          setChatPanelCollapsed(false)
        }
      }
    },
    [
      showConnectionMode,
      connectionSource,
      setEdges,
      activeConversation,
      setConversations,
      toast,
      setChatPanelCollapsed,
      activeNode,
      messages,
      nodes,
    ],
  )

  // Handle edge creation through the ReactFlow onConnect callback
  const onConnect = useCallback(
    (params) => {
      const newEdge = {
        ...params,
        id: `e${params.source}-${params.target}`,
        type: "custom",
        animated: true,
        style: { stroke: "#3b82f6" },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#3b82f6",
        },
        data: {
          label: "Connection",
        },
      }

      setEdges((eds) => [...eds, newEdge])

      // Update conversation edges
      setConversations((prevConversations) =>
        prevConversations.map((conv) => {
          if (conv.id === activeConversation) {
            return {
              ...conv,
              edges: [...(conv.edges || []), newEdge],
            }
          }
          return conv
        }),
      )

      // Update parent relationships
      const sourceNode = nodes.find((n) => n.id === params.source)
      const targetNode = nodes.find((n) => n.id === params.target)

      if (sourceNode && targetNode) {
        // Create parent info for the source node
        const parentInfo: NodeParentInfo = {
          id: sourceNode.id,
          type: sourceNode.type,
          label: sourceNode.data.label,
        }

        // Update the target node's parents array
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === params.target) {
              // Create a new parents array that includes the source node and avoids duplicates
              const existingParents = node.data.parents || []
              const parentExists = existingParents.some((p) => p.id === parentInfo.id)

              const updatedParents = parentExists ? existingParents : [...existingParents, parentInfo]

              // Also include all parents of the source node to maintain the full ancestry
              if (sourceNode.data.parents && Array.isArray(sourceNode.data.parents)) {
                sourceNode.data.parents.forEach((parentNode) => {
                  const exists = updatedParents.some((p) => p.id === parentNode.id)
                  if (!exists) {
                    updatedParents.push(parentNode)
                  }
                })
              }

              return {
                ...node,
                data: {
                  ...node.data,
                  parents: updatedParents,
                },
              }
            }
            return node
          }),
        )

        // Update in conversation data
        setConversations((prevConversations) =>
          prevConversations.map((conv) => {
            if (conv.id === activeConversation) {
              return {
                ...conv,
                nodes: conv.nodes.map((node) => {
                  if (node.id === params.target) {
                    // Create a new parents array that includes the source node and avoids duplicates
                    const existingParents = node.data.parents || []
                    const parentExists = existingParents.some((p) => p.id === parentInfo.id)

                    const updatedParents = parentExists ? existingParents : [...existingParents, parentInfo]

                    // Also include all parents of the source node to maintain the full ancestry
                    if (sourceNode.data.parents && Array.isArray(sourceNode.data.parents)) {
                      sourceNode.data.parents.forEach((parentNode) => {
                        const exists = updatedParents.some((p) => p.id === parentNode.id)
                        if (!exists) {
                          updatedParents.push(parentNode)
                        }
                      })
                    }

                    return {
                      ...node,
                      data: {
                        ...node.data,
                        parents: updatedParents,
                      },
                    }
                  }
                  return node
                }),
              }
            }
            return conv
          }),
        )
      }

      // If the active node is involved in this connection, add a connection message and point
      if (params.source === activeNode || params.target === activeNode) {
        const connectedNodeId = params.source === activeNode ? params.target : params.source
        const targetNodeData = nodes.find((n) => n.id === connectedNodeId)
        const nodeType = targetNodeData?.type || "unknown"
        const nodeLabel = targetNodeData?.data?.label || "Unknown"
        const direction = params.source === activeNode ? "outgoing" : "incoming"

        // Create a connection notification message
        const newMessage = {
          id: uuidv4(),
          sender: "ai",
          content:
            direction === "outgoing"
              ? `Connected to ${nodeType === "mainNode" ? "Main Node" : nodeType === "branchNode" ? "Branch Node" : "Image Node"} "${nodeLabel}".`
              : `Connected from ${nodeType === "mainNode" ? "Main Node" : nodeType === "branchNode" ? "Branch Node" : "Image Node"} "${nodeLabel}".`,
          timestamp: Date.now(),
        }

        // Update messages in the active node
        setMessages((prevMessages) => [...prevMessages, newMessage])

        // Update the active node with the new message
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === activeNode) {
              return {
                ...node,
                data: {
                  ...node.data,
                  messages: [...node.data.messages, newMessage],
                },
              }
            }
            return node
          }),
        )

        // Update in conversation data
        setConversations((prevConversations) =>
          prevConversations.map((conv) => {
            if (conv.id === activeConversation) {
              return {
                ...conv,
                nodes: conv.nodes.map((node) => {
                  if (node.id === activeNode) {
                    return {
                      ...node,
                      data: {
                        ...node.data,
                        messages: [...node.data.messages, newMessage],
                      },
                    }
                  }
                  return node
                }),
              }
            }
            return conv
          }),
        )

        // Add the connection point to the message
        setConnectionPoints((prev) => ({
          ...prev,
          [newMessage.id]: {
            nodeId: connectedNodeId,
            type: nodeType,
            direction: direction,
          },
        }))

        toast({
          title: "Connection created",
          description: `Node "${nodeLabel}" has been connected to this conversation.`,
        })
      }

      // Add to connection history
      const sourceNodeData = nodes.find((n) => n.id === params.source)
      const targetNodeData = nodes.find((n) => n.id === params.target)

      setConnectionEvents((prev) => [
        {
          id: uuidv4(),
          timestamp: Date.now(),
          type: "connect",
          sourceId: params.source,
          targetId: params.target,
          sourceType: sourceNodeData?.type || "unknown",
          targetType: targetNodeData?.type || "unknown",
          sourceLabel: sourceNodeData?.data?.label || "Unknown",
          targetLabel: targetNodeData?.data?.label || "Unknown",
        },
        ...prev,
      ])
    },
    [activeNode, messages, nodes, setEdges, activeConversation, setConversations, toast, setMessages, setNodes],
  )

  const startConnectionMode = (nodeId: string) => {
    setShowConnectionMode(true)
    setConnectionSource(nodeId)

    toast({
      title: "Connection mode activated",
      description: "Click on another node to create a connection.",
    })
  }

  const cancelConnectionMode = () => {
    setShowConnectionMode(false)
    setConnectionSource(null)
  }

  const onLabelChange = useCallback(
    (nodeId: string, label: string) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                label: label,
              },
            }
          }
          return node
        }),
      )

      // Update in conversation data
      setConversations((prevConversations) =>
        prevConversations.map((conv) => {
          if (conv.id === activeConversation) {
            return {
              ...conv,
              nodes: conv.nodes.map((node) => {
                if (node.id === nodeId) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      label: label,
                    },
                  }
                }
                return node
              }),
            }
          }
          return conv
        }),
      )
    },
    [setNodes, activeConversation, setConversations],
  )

  const onNodeNameChange = (name: string) => {
    onLabelChange(activeNode, name)
  }

  const onModelChange = useCallback(
    (nodeId: string, model: string) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                model: model,
              },
            }
          }
          return node
        }),
      )

      // Update in conversation data
      setConversations((prevConversations) =>
        prevConversations.map((conv) => {
          if (conv.id === activeConversation) {
            return {
              ...conv,
              nodes: conv.nodes.map((node) => {
                if (node.id === nodeId) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      model: model,
                    },
                  }
                }
                return node
              }),
            }
          }
          return conv
        }),
      )

      // Update active node model if this is the active node
      if (nodeId === activeNode) {
        setActiveNodeModel(model)
      }
    },
    [setNodes, activeConversation, setConversations, activeNode],
  )

  const onActiveNodeModelChange = (model: string) => {
    onModelChange(activeNode, model)
  }

  // Update the onSendMessage function to include the API call with fallback
  const onSendMessage = useCallback(
    async (content: string) => {
      // Create and add the user message
      const newUserMessage = {
        id: uuidv4(),
        sender: "user",
        content: content,
        timestamp: Date.now(),
      }

      setMessages((prevMessages) => [...prevMessages, newUserMessage])

      // Update the active node with the new user message
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === activeNode) {
            return {
              ...node,
              data: {
                ...node.data,
                messages: [...node.data.messages, newUserMessage],
              },
            }
          }
          return node
        }),
      )

      // Update in conversation data
      setConversations((prevConversations) =>
        prevConversations.map((conv) => {
          if (conv.id === activeConversation) {
            return {
              ...conv,
              nodes: conv.nodes.map((node) => {
                if (node.id === activeNode) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      messages: [...node.data.messages, newUserMessage],
                    },
                  }
                }
                return node
              }),
            }
          }
          return conv
        }),
      )

      // Get the current node's data
      const currentNode = nodes.find((node) => node.id === activeNode)
      if (!currentNode) return

      // Get parent node IDs
      const parentNodeIds = currentNode.data.parents ? currentNode.data.parents.map((p) => p.id) : []

      // Set thinking state to true (we'll pass this down to ChatPanel)
      setChatThinking(true)

      let apiResponse: string

      try {
        // Call the API to get a response
        apiResponse = await getChatResponse(content, activeNode, currentNode.data.model || "gpt-4", parentNodeIds)
      } catch (error) {
        console.error("Error in API call:", error)
        // Use the mock response as fallback
        apiResponse = getMockResponse(content)
      } finally {
        // Create and add the AI response message
        const newAiMessage = {
          id: uuidv4(),
          sender: "ai",
          content: apiResponse || "Sorry, I couldn't generate a response at this time.",
          timestamp: Date.now(),
        }

        setMessages((prevMessages) => [...prevMessages, newAiMessage])

        // Update the active node with the new AI message
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === activeNode) {
              return {
                ...node,
                data: {
                  ...node.data,
                  messages: [...node.data.messages, newAiMessage],
                },
              }
            }
            return node
          }),
        )

        // Update in conversation data
        setConversations((prevConversations) =>
          prevConversations.map((conv) => {
            if (conv.id === activeConversation) {
              return {
                ...conv,
                nodes: conv.nodes.map((node) => {
                  if (node.id === activeNode) {
                    return {
                      ...node,
                      data: {
                        ...node.data,
                        messages: [...node.data.messages, newAiMessage],
                      },
                    }
                  }
                  return node
                }),
              }
            }
            return conv
          }),
        )

        // Set thinking state back to false
        setChatThinking(false)

        // Trigger a save after sending a message
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current)
        }
        autoSaveTimerRef.current = setTimeout(async () => {
          await handleAutoSave()
        }, 2000) // Save sooner after a message

        if (currentSessionId) {
          await trackInteraction(
            activeConversation,
            "send_message",
            newUserMessage.id,
            { content: content, nodeId: activeNode },
            currentSessionId,
          )
        }
      }
    },
    [activeNode, setNodes, activeConversation, setConversations, setMessages, nodes, currentSessionId],
  )

  const handleToggleExpand = useCallback(
    (nodeId: string, expanded: boolean) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                expanded: expanded,
              },
            }
          }
          return node
        }),
      )

      // Update in conversation data
      setConversations((prevConversations) =>
        prevConversations.map((conv) => {
          if (conv.id === activeConversation) {
            return {
              ...conv,
              nodes: conv.nodes.map((node) => {
                if (node.id === nodeId) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      expanded: expanded,
                    },
                  }
                }
                return node
              }),
            }
          }
          return conv
        }),
      )
    },
    [setNodes, activeConversation, setConversations],
  )

  const onResize = useCallback(
    (nodeId: string, width: number) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                style: {
                  ...node.data.style,
                  width: width,
                },
              },
            }
          }
          return node
        }),
      )

      // Update in conversation data
      setConversations((prevConversations) =>
        prevConversations.map((conv) => {
          if (conv.id === activeConversation) {
            return {
              ...conv,
              nodes: conv.nodes.map((node) => {
                if (node.id === nodeId) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      style: {
                        ...node.data.style,
                        width: width,
                      },
                    },
                  }
                }
                return node
              }),
            }
          }
          return conv
        }),
      )
    },
    [setNodes, activeConversation, setConversations],
  )

  const onImageNodeResize = useCallback(
    (nodeId: string, width: number, height: number) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                style: {
                  width: width,
                  height: height,
                },
              },
            }
          }
          return node
        }),
      )

      // Update in conversation data
      setConversations((prevConversations) =>
        prevConversations.map((conv) => {
          if (conv.id === activeConversation) {
            return {
              ...conv,
              nodes: conv.nodes.map((node) => {
                if (node.id === nodeId) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      style: {
                        width: width,
                        height: height,
                      },
                    },
                  }
                }
                return node
              }),
            }
          }
          return conv
        }),
      )
    },
    [setNodes, activeConversation, setConversations],
  )

  const onNodeDelete = useCallback(
    (nodeId: string) => {
      // Get connected edges
      const connectedEdges = edges.filter((edge) => edge.source === nodeId || edge.target === nodeId)

      // Remove the node and its connected edges
      setNodes((nds) => nds.filter((node) => node.id !== nodeId))
      setEdges((edgs) => edgs.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))

      // Update in conversation data
      setConversations((prevConversations) =>
        prevConversations.map((conv) => {
          if (conv.id === activeConversation) {
            return {
              ...conv,
              nodes: conv.nodes.filter((node) => node.id !== nodeId),
              edges: conv.edges?.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
            }
          }
          return conv
        }),
      )

      // If the deleted node is the active node, select another node
      if (nodeId === activeNode) {
        const remainingNodes = nodes.filter((node) => node.id !== nodeId)
        if (remainingNodes.length > 0) {
          setActiveNode(remainingNodes[0].id)
        }
      }

      // Remove any branch points that point to this node
      setBranchPoints((prev) => {
        const newBranchPoints = { ...prev }
        Object.keys(newBranchPoints).forEach((messageId) => {
          if (newBranchPoints[messageId] === nodeId) {
            delete newBranchPoints[messageId]
          }
        })
        return newBranchPoints
      })

      // Remove any connection points that point to this node
      setConnectionPoints((prev) => {
        const newConnectionPoints = { ...prev }
        Object.keys(newConnectionPoints).forEach((messageId) => {
          if (newConnectionPoints[messageId].nodeId === nodeId) {
            delete newConnectionPoints[messageId]
          }
        })
        return newConnectionPoints
      })

      toast({
        title: "Node deleted",
        description: "The node and its connections have been removed.",
      })
    },
    [nodes, edges, setNodes, setEdges, activeConversation, setConversations, activeNode, toast],
  )

  const onActiveNodeDelete = useCallback(() => {
    if (activeNode) {
      onNodeDelete(activeNode)
    }
  }, [activeNode, onNodeDelete])

  const onImageNodeDelete = useCallback(
    (nodeId: string) => {
      onNodeDelete(nodeId)
    },
    [onNodeDelete],
  )

  const onImageUpload = (file: File) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      if (event.target?.result) {
        const imageUrl = event.target.result as string
        const id = uuidv4()

        // Calculate position based on viewport center
        let position = { x: 100, y: 100 }
        if (reactFlowInstance) {
          const viewport = reactFlowInstance.getViewport()
          const center = reactFlowInstance.screenToFlowPosition({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          })
          position = { x: center.x, y: center.y }
        }

        const newNode = {
          id,
          type: "imageNode",
          position,
          data: {
            imageUrl: imageUrl,
            onDelete: onImageNodeDelete,
            onResize: onImageNodeResize,
            style: {
              width: 200,
              height: 150,
            },
            parents: [],
          },
        }

        // Add the new node while preserving existing nodes
        setNodes((nds) => [...nds, newNode])

        // Update conversation nodes
        setConversations((prevConversations) =>
          prevConversations.map((conv) => {
            if (conv.id === activeConversation) {
              return {
                ...conv,
                nodes: [...conv.nodes, newNode],
              }
            }
            return conv
          }),
        )

        toast({
          title: "Image added",
          description: "The image has been added to the canvas.",
        })
      }
    }

    reader.readAsDataURL(file)
  }

  // Update the createMainNode function to include parents array
  const createMainNode = () => {
    const id = uuidv4()

    // Calculate position based on viewport center
    let position = { x: 250, y: 100 }
    if (reactFlowInstance) {
      const viewport = reactFlowInstance.getViewport()
      const center = reactFlowInstance.screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      })
      position = { x: center.x, y: center.y }
    }

    const newNode = {
      id,
      type: "mainNode",
      position,
      data: {
        label: `Main ${nodes.filter((n) => n.type === "mainNode").length + 1}`,
        messages: [],
        isEditing: false,
        expanded: true,
        onNodeClick,
        onLabelChange,
        onToggleExpand: handleToggleExpand,
        onResize,
        style: { width: 220 },
        onStartConnection: startConnectionMode,
        onDelete: onNodeDelete,
        model: "gpt-4",
        onModelChange,
        onDimensionsChange: () => {}, // Add this to avoid errors
        parents: [], // Initialize empty parents array
      },
    }

    // Add the new node while preserving existing nodes
    setNodes((nds) => [...nds, newNode])

    // Update conversation nodes
    setConversations((prevConversations) =>
      prevConversations.map((conv) => {
        if (conv.id === activeConversation) {
          return {
            ...conv,
            nodes: [...conv.nodes, newNode],
          }
        }
        return conv
      }),
    )

    return id
  }

  // Update the createBranchNode function to include parents array and track parent node
  const createBranchNode = (sourceNodeId?: string) => {
    const id = uuidv4()

    // Calculate position based on viewport center or relative to source node
    let position = { x: 250, y: 200 }

    // Initialize parents array
    const parents: NodeParentInfo[] = []

    // If we have a source node, add it to parents and position relative to it
    if (sourceNodeId) {
      const sourceNode = nodes.find((node) => node.id === sourceNodeId)
      if (sourceNode) {
        position = {
          x: sourceNode.position.x + 300,
          y: sourceNode.position.y + 50,
        }

        // Add source node to parents
        parents.push({
          id: sourceNodeId,
          type: sourceNode.type,
          label: sourceNode.data.label,
        })

        // Also include all parents of the source node to maintain the full ancestry
        if (sourceNode.data.parents && Array.isArray(sourceNode.data.parents)) {
          parents.push(...sourceNode.data.parents)
        }
      }
    } else if (reactFlowInstance) {
      // Otherwise use the center of the viewport
      const center = reactFlowInstance.screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      })
      position = { x: center.x, y: center.y }
    }

    const newNode = {
      id,
      type: "branchNode",
      position,
      data: {
        label: `Branch ${branchCount}`,
        messages: [],
        isEditing: false,
        expanded: true,
        onNodeClick,
        onLabelChange,
        onToggleExpand: handleToggleExpand,
        onResize,
        style: { width: 220 },
        onStartConnection: startConnectionMode,
        onDelete: onNodeDelete,
        model: "gpt-4",
        onModelChange,
        onDimensionsChange: () => {}, // Add this to avoid errors
        parents: parents, // Set parents array
      },
    }

    // Add the new node while preserving existing nodes
    setNodes((nds) => [...nds, newNode])

    // Update conversation nodes
    setConversations((prevConversations) =>
      prevConversations.map((conv) => {
        if (conv.id === activeConversation) {
          return {
            ...conv,
            nodes: [...conv.nodes, newNode],
          }
        }
        return conv
      }),
    )

    setBranchCount((count) => count + 1)

    if (sourceNodeId) {
      const newEdge = {
        id: `e${sourceNodeId}-${id}`,
        source: sourceNodeId,
        target: id,
        type: "custom",
        animated: true,
        style: { stroke: "#3b82f6" },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#3b82f6",
        },
        data: {
          label: "Condition",
        },
      }

      setEdges((edgs) => [...edgs, newEdge])

      // Update conversation edges
      setConversations((prevConversations) =>
        prevConversations.map((conv) => {
          if (conv.id === activeConversation) {
            return {
              ...conv,
              edges: [...(conv.edges || []), newEdge],
            }
          }
          return conv
        }),
      )

      // If the source node is the active node, add a connection point
      if (sourceNodeId === activeNode && activeNode !== id) {
        // Add the connection point to track this branch
        const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : null
        if (lastMessageId) {
          setConnectionPoints((prev) => ({
            ...prev,
            [lastMessageId]: {
              nodeId: id,
              type: "branchNode",
              direction: "outgoing",
            },
          }))
        }
      }
    }

    return id
  }

  const createBranchNodeFromChat = useCallback(
    (content: string) => {
      // Create a new branch node
      const branchId = createBranchNode(activeNode)

      // Add the content as a message in the new branch node
      if (branchId) {
        const newMessage = {
          id: uuidv4(),
          sender: "user",
          content: content,
          timestamp: Date.now(),
        }

        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === branchId) {
              return {
                ...node,
                data: {
                  ...node.data,
                  messages: [...(node.data.messages || []), newMessage],
                },
              }
            }
            return node
          }),
        )

        // Update in conversation data
        setConversations((prevConversations) =>
          prevConversations.map((conv) => {
            if (conv.id === activeConversation) {
              return {
                ...conv,
                nodes: conv.nodes.map((node) => {
                  if (node.id === branchId) {
                    return {
                      ...node,
                      data: {
                        ...node.data,
                        messages: [...(node.data.messages || []), newMessage],
                      },
                    }
                  }
                  return node
                }),
              }
            }
            return conv
          }),
        )

        // Add the branch point to track where this branch was created from
        if (messages.length > 0) {
          const lastMessageId = messages[messages.length - 1].id
          setBranchPoints((prev) => ({
            ...prev,
            [lastMessageId]: branchId,
          }))
        }
      }

      return branchId
    },
    [activeNode, setNodes, activeConversation, setConversations, messages],
  )

  const navigateToNode = useCallback(
    (nodeId: string) => {
      // Set the active node to the target node
      setActiveNode(nodeId)

      // Ensure the chat panel is visible
      setChatPanelCollapsed(false)

      // Center the view on the node
      if (reactFlowInstance) {
        const node = nodes.find((n) => n.id === nodeId)
        if (node) {
          reactFlowInstance.setCenter(node.position.x, node.position.y, { duration: 800 })
        }
      }
    },
    [nodes, reactFlowInstance, setChatPanelCollapsed],
  )

  const createMultipleBranches = (count: number) => {
    const sourceNodeId = activeNode
    const createdNodes = []

    for (let i = 0; i < count; i++) {
      const id = createBranchNode(sourceNodeId)

      if (id) {
        createdNodes.push(id)

        // Add a connection point to track this branch
        const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : null
        if (lastMessageId) {
          setConnectionPoints((prev) => ({
            ...prev,
            [lastMessageId]: {
              nodeId: id,
              type: "branchNode",
              direction: "outgoing",
            },
          }))
        }
      }
    }

    // Show a toast notification
    if (createdNodes.length > 0) {
      toast({
        title: `${createdNodes.length} branch nodes created`,
        description: "New branch nodes have been connected to the current node.",
      })
    }

    return createdNodes
  }

  // Update the createImageNode function to include parents array
  const createImageNode = () => {
    const id = uuidv4()

    // Calculate position based on viewport center
    let position = { x: 250, y: 200 }
    if (reactFlowInstance) {
      const center = reactFlowInstance.screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      })
      position = { x: center.x, y: center.y }
    }

    const newNode = {
      id,
      type: "imageNode",
      position,
      data: {
        imageUrl: "",
        onDelete: onImageNodeDelete,
        onResize: onImageNodeResize,
        style: {
          width: 200,
          height: 150,
        },
        parents: [], // Initialize empty parents array
      },
    }

    // Add the new node while preserving existing nodes
    setNodes((nds) => [...nds, newNode])

    // Update conversation nodes
    setConversations((prevConversations) =>
      prevConversations.map((conv) => {
        if (conv.id === activeConversation) {
          return {
            ...conv,
            nodes: [...conv.nodes, newNode],
          }
        }
        return conv
      }),
    )

    return id
  }

  // Update the createNewConversation function to initialize parents array for the first node
  const createNewConversation = async (name: string) => {
    const newConversation = {
      id: uuidv4(),
      name,
      nodes: [
        {
          id: uuidv4(),
          type: "mainNode",
          position: { x: 250, y: 100 },
          data: {
            label: "Start",
            messages: [],
            isEditing: false,
            expanded: true,
            style: { width: 220 },
            model: "gpt-4",
            parents: [], // Initialize empty parents array
          },
        },
      ],
      edges: [],
    }

    setConversations((prevConversations) => [...prevConversations, newConversation])
    setActiveConversation(newConversation.id)

    // Save the new conversation to the database
    try {
      await saveConversation(newConversation)
      await setActiveConversationInDB(newConversation.id)
    } catch (error) {
      console.error("Error saving new conversation:", error)
      toast({
        title: "Error saving conversation",
        description: "There was a problem saving your new conversation.",
        variant: "destructive",
      })
    }
  }

  const deleteConversation = async (id: string) => {
    if (conversations.length <= 1) {
      toast({
        title: "Cannot delete",
        description: "You must have at least one conversation.",
      })
      return
    }

    try {
      // Delete from database first
      const result = await deleteConversationFromDB(id)

      if (result.success) {
        // Then update local state
        setConversations((prevConversations) => prevConversations.filter((conv) => conv.id !== id))

        if (activeConversation === id) {
          const newActiveConv = conversations.find((conv) => conv.id !== id)
          if (newActiveConv) {
            setActiveConversation(newActiveConv.id)
            await setActiveConversationInDB(newActiveConv.id)
          }
        }

        toast({
          title: "Conversation deleted",
          description: "The conversation has been removed.",
        })
      } else {
        throw new Error(result.error || "Unknown error")
      }
    } catch (error) {
      console.error("Error deleting conversation:", error)
      toast({
        title: "Error deleting conversation",
        description: "There was a problem deleting your conversation.",
        variant: "destructive",
      })
    }
  }

  const duplicateConversation = async (id: string) => {
    const conversationToDuplicate = conversations.find((conv) => conv.id === id)
    if (!conversationToDuplicate) return

    const newConversation = {
      ...conversationToDuplicate,
      id: uuidv4(),
      name: `${conversationToDuplicate.name} (Copy)`,
      nodes: conversationToDuplicate.nodes.map((node) => ({
        ...node,
        id: node.id === activeNode ? activeNode : uuidv4(),
      })),
      edges: conversationToDuplicate.edges?.map((edge) => ({
        ...edge,
        id: uuidv4(),
        source: edge.source,
        target: edge.target,
      })),
    }

    try {
      // Save to database
      await saveConversation(newConversation)

      // Update local state
      setConversations((prevConversations) => [...prevConversations, newConversation])
      setActiveConversation(newConversation.id)
      await setActiveConversationInDB(newConversation.id)

      toast({
        title: "Conversation duplicated",
        description: "A copy of the conversation has been created.",
      })
    } catch (error) {
      console.error("Error duplicating conversation:", error)
      toast({
        title: "Error duplicating conversation",
        description: "There was a problem creating a copy of your conversation.",
        variant: "destructive",
      })
    }
  }

  const onSave = async () => {
    try {
      setIsSaving(true)

      // Find the active conversation
      const activeConv = conversations.find((conv) => conv.id === activeConversation)
      if (activeConv) {
        // Save the active conversation
        const result = await saveConversation(activeConv, currentSessionId)

        if (result.success) {
          // Track the save interaction
          if (currentSessionId) {
            await trackInteraction(
              activeConversation,
              "manual_save",
              activeConversation,
              { conversationName: activeConv.name },
              currentSessionId,
            )
          }

          setLastSaved(new Date())

          toast({
            title: "Canvas saved",
            description: "Your work has been saved to the database.",
          })
        } else {
          throw new Error(result.error || "Unknown error")
        }
      }
    } catch (error) {
      console.error("Error saving canvas:", error)
      toast({
        title: "Error saving canvas",
        description: "There was a problem saving your work.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const onExport = () => {
    if (reactFlowInstance) {
      const flowData = reactFlowInstance.toObject()
      const json = JSON.stringify(flowData, null, 2)
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "context-tree.json"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }

  const saveNodeNote = (nodeId: string, note: string) => {
    setNodeNotes((prev) => ({
      ...prev,
      [nodeId]: note,
    }))

    toast({
      title: "Note saved",
      description: "Your note for this node has been saved.",
    })
  }

  const handleEdgeRemoval = useCallback(
    (edge: Edge) => {
      // Check if the active node is involved in this edge
      if (edge.source === activeNode || edge.target === activeNode) {
        const connectedNodeId = edge.source === activeNode ? edge.target : edge.source
        const targetNodeData = nodes.find((n) => n.id === connectedNodeId)
        const nodeType = targetNodeData?.type || "unknown"
        const nodeLabel = targetNodeData?.data?.label || "Unknown"
        const direction = edge.source === activeNode ? "outgoing" : "incoming"

        // Create a disconnection notification message
        const newMessage = {
          id: uuidv4(),
          sender: "ai",
          content:
            direction === "outgoing"
              ? `Disconnected from ${nodeType === "mainNode" ? "Main Node" : nodeType === "branchNode" ? "Branch Node" : "Image Node"} "${nodeLabel}".`
              : `Disconnected from ${nodeType === "mainNode" ? "Main Node" : nodeType === "branchNode" ? "Branch Node" : "Image Node"} "${nodeLabel}".`,
          timestamp: Date.now(),
        }

        // Update messages in the active node
        setMessages((prevMessages) => [...prevMessages, newMessage])

        // Update the active node with the new message
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === activeNode) {
              return {
                ...node,
                data: {
                  ...node.data,
                  messages: [...node.data.messages, newMessage],
                },
              }
            }
            return node
          }),
        )

        // Update in conversation data
        setConversations((prevConversations) =>
          prevConversations.map((conv) => {
            if (conv.id === activeConversation) {
              return {
                ...conv,
                nodes: conv.nodes.map((node) => {
                  if (node.id === activeNode) {
                    return {
                      ...node,
                      data: {
                        ...node.data,
                        messages: [...node.data.messages, newMessage],
                      },
                    }
                  }
                  return node
                }),
              }
            }
            return conv
          }),
        )
      }

      // Add to connection history
      const sourceNodeData = nodes.find((n) => n.id === edge.source)
      const targetNodeData = nodes.find((n) => n.id === edge.target)

      setConnectionEvents((prev) => [
        {
          id: uuidv4(),
          timestamp: Date.now(),
          type: "disconnect",
          sourceId: edge.source,
          targetId: edge.target,
          sourceType: sourceNodeData?.type || "unknown",
          targetType: targetNodeData?.type || "unknown",
          sourceLabel: sourceNodeData?.data?.label || "Unknown",
          targetLabel: targetNodeData?.data?.label || "Unknown",
        },
        ...prev,
      ])
    },
    [activeNode, nodes, setNodes, setMessages, activeConversation, setConversations],
  )

  const onEdgeDelete = useCallback(
    (edges: Edge[]) => {
      // For each edge being deleted, add a disconnection message
      edges.forEach((edge) => {
        handleEdgeRemoval(edge)
      })

      // Update conversation edges
      setConversations((prevConversations) => {
        return prevConversations.map((conv) => {
          if (conv.id === activeConversation) {
            return {
              ...conv,
              edges: conv.edges?.filter((e) => !edges.some((deletedEdge) => deletedEdge.id === e.id)),
            }
          }
          return conv
        })
      })
      setSelectedEdge(null)
    },
    [activeConversation, setConversations, setSelectedEdge, handleEdgeRemoval],
  )

  const handleForceSync = async () => {
    setIsLoading(true)
    try {
      // Reload the current conversation from the database
      const result = await getUserConversations()

      if (result.success && result.conversations.length > 0) {
        // Find the current active conversation in the result
        const updatedConversation = result.conversations.find((conv) => conv.id === activeConversation)

        if (updatedConversation) {
          // Update the local state with the latest from the database
          setConversations((prevConversations) =>
            prevConversations.map((conv) => (conv.id === activeConversation ? updatedConversation : conv)),
          )

          // Update nodes and edges
          setNodes(updatedConversation.nodes)
          setEdges(updatedConversation.edges)

          toast({
            title: "Canvas synchronized",
            description: "Your canvas has been synchronized with the latest changes.",
          })
        }
      }
    } catch (error) {
      console.error("Error syncing canvas:", error)
      toast({
        title: "Error synchronizing",
        description: "There was a problem synchronizing your canvas.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <Navbar
        onSave={onSave}
        onImageUpload={onImageUpload}
        onExport={onExport}
        showConnectionMode={showConnectionMode}
        onCancelConnectionMode={cancelConnectionMode}
      />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          onAddMainNode={createMainNode}
          onAddBranchNode={createBranchNode}
          onAddMultipleBranches={createMultipleBranches}
          onAddImageNode={createImageNode}
          activeConversation={activeConversation}
          conversations={conversations}
          setActiveConversation={async (id) => {
            setActiveConversation(id)
            await setActiveConversationInDB(id)
          }}
          onCreateNewConversation={createNewConversation}
          onDeleteConversation={deleteConversation}
          onDuplicateConversation={duplicateConversation}
        />
        <div className="flex flex-1 overflow-hidden relative">
          <div className="absolute top-4 left-0 right-0 z-50 mx-auto w-fit">
            <div className="bg-amber-100 border border-amber-300 text-amber-800 px-4 py-2 rounded-md shadow-md flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span className="font-medium">Context treeing and branching features temporarily removed</span>
            </div>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center w-full h-full">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-600">Loading your canvas...</p>
              </div>
            </div>
          ) : (
            <>
              <FlowCanvas
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                selectedEdge={selectedEdge}
                setSelectedEdge={setSelectedEdge}
                activeNode={activeNode}
                activeConversation={activeConversation}
                setConversations={setConversations}
                conversations={conversations}
                createBranchNode={createBranchNode}
                branchCount={branchCount}
                setReactFlowInstance={setReactFlowInstance}
                showConnectionMode={showConnectionMode}
                connectionSource={connectionSource}
                onConnect={onConnect}
                onViewportChange={onViewportChange}
                onEdgeDelete={onEdgeDelete}
              />
              <div className="absolute bottom-4 left-[280px] z-10 w-64">
                <ConnectionHistory connectionEvents={connectionEvents} onNavigateToNode={navigateToNode} />
              </div>
              <ChatPanel
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
                nodes={nodes} // Pass the nodes array
                thinking={chatThinking}
              />
            </>
          )}
          <div className="absolute bottom-4 right-4 flex flex-col items-end space-y-2">
            <SaveStatus isSaving={isSaving} lastSaved={lastSaved} isOnline={isOnline} />
            <SessionManager currentSessionId={currentSessionId} onForceSync={handleForceSync} />
          </div>
        </div>
      </div>
    </div>
  )
}
