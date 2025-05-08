"use client"

import { useState, useCallback, useEffect } from "react"
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

export default function ConversationCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedEdge, setSelectedEdge] = useState(null)
  const [activeNode, setActiveNode] = useState("1")
  const [nodeName, setNodeName] = useState("Start")
  const [messages, setMessages] = useState<Message[]>([
    { id: uuidv4(), sender: "ai", content: "Hello!", timestamp: Date.now() },
  ])
  const [conversations, setConversations] = useState<Conversation[]>([
    { id: uuidv4(), name: "New Conversation", nodes: initialNodes, edges: initialEdges },
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

      // If the active node is involved in this connection, add a connection point
      if (params.source === activeNode || params.target === activeNode) {
        // Get the last message ID to attach the connection point to
        if (messages.length > 0) {
          const lastMessageId = messages[messages.length - 1].id
          const connectedNodeId = params.source === activeNode ? params.target : params.source
          const targetNodeData = nodes.find((n) => n.id === connectedNodeId)
          const nodeType = targetNodeData?.type || "unknown"

          setConnectionPoints((prev) => ({
            ...prev,
            [lastMessageId]: {
              nodeId: connectedNodeId,
              type: nodeType,
              direction: params.source === activeNode ? "outgoing" : "incoming",
            },
          }))

          toast({
            title: "Connection created",
            description: `Node "${targetNodeData?.data?.label || "Unknown"}" has been connected to this conversation.`,
          })
        }
      }
    },
    [activeNode, messages, nodes, setEdges, activeConversation, setConversations, toast],
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

  const onSendMessage = useCallback(
    (content: string) => {
      const newMessage = {
        id: uuidv4(),
        sender: "user",
        content: content,
        timestamp: Date.now(),
      }

      setMessages((prevMessages) => [...prevMessages, newMessage])

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
    },
    [activeNode, setNodes, activeConversation, setConversations, setMessages],
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

        const newNode = {
          id,
          type: "imageNode",
          position: {
            x: 100,
            y: 100,
          },
          data: {
            imageUrl: imageUrl,
            onDelete: onImageNodeDelete,
            onResize: onImageNodeResize,
            style: {
              width: 200,
              height: 150,
            },
          },
        }

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

  const createMainNode = () => {
    const id = uuidv4()
    const position = reactFlowInstance ? reactFlowInstance.project({ x: 100, y: 100 }) : { x: 250, y: 100 }

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
      },
    }

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

  const createBranchNode = (sourceNodeId?: string) => {
    const id = uuidv4()
    const position = reactFlowInstance ? reactFlowInstance.project({ x: 100, y: 100 }) : { x: 250, y: 200 }

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
      },
    }

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
      if (sourceNodeId === activeNode && messages.length > 0) {
        const lastMessageId = messages[messages.length - 1].id
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
    [activeNode, setNodes, activeConversation, setConversations, messages, createBranchNode],
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
      createdNodes.push(id)
    }

    return createdNodes
  }

  const createImageNode = () => {
    const id = uuidv4()
    const position = reactFlowInstance ? reactFlowInstance.project({ x: 100, y: 100 }) : { x: 250, y: 200 }

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
      },
    }

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

  const createNewConversation = (name: string) => {
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
          },
        },
      ],
      edges: [],
    }

    setConversations((prevConversations) => [...prevConversations, newConversation])
    setActiveConversation(newConversation.id)
  }

  const deleteConversation = (id: string) => {
    if (conversations.length <= 1) return

    setConversations((prevConversations) => prevConversations.filter((conv) => conv.id !== id))

    if (activeConversation === id) {
      setActiveConversation(conversations.find((conv) => conv.id !== id)?.id || "")
    }
  }

  const duplicateConversation = (id: string) => {
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

    setConversations((prevConversations) => [...prevConversations, newConversation])
    setActiveConversation(newConversation.id)
  }

  const onSave = () => {
    if (reactFlowInstance) {
      const flowData = reactFlowInstance.toObject()
      localStorage.setItem("flow-conversation", JSON.stringify(flowData))
      toast({
        title: "Canvas saved",
        description: "The current canvas state has been saved to local storage.",
      })
    }
  }

  const onExport = () => {
    if (reactFlowInstance) {
      const flow = reactFlowInstance.toObject()
      const json = JSON.stringify(flow, null, 2)
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "conversation-canvas.json"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
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
          setActiveConversation={setActiveConversation}
          onCreateNewConversation={createNewConversation}
          onDeleteConversation={deleteConversation}
          onDuplicateConversation={duplicateConversation}
        />
        <div className="flex flex-1 overflow-hidden">
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
          />
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
          />
        </div>
      </div>
    </div>
  )
}
