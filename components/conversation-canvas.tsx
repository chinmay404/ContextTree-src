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

          // Exit connection mode
          setShowConnectionMode(false)
          setConnectionSource(null)

          toast({
            title: "Connection created",
            description: "Nodes have been connected successfully.",
          })
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
    ],
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

  const onImageNodeDelete = useCallback(
    (nodeId: string) => {
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
    },
    [setNodes, setEdges, activeConversation, setConversations],
  )

  const onImageUpload = (file: File) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      if (event.target?.result) {
        const imageUrl = event.target.result as string
        const id = uuidv4()

        const newNode = {
          id: id,
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
      }

      return branchId
    },
    [activeNode, setNodes, activeConversation, setConversations],
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
      const flow = reactFlowInstance.toObject()
      localStorage.setItem("flow-conversation", JSON.stringify(flow))
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
          />
          <ChatPanel
            messages={messages}
            onSendMessage={onSendMessage}
            nodeName={nodeName}
            onNodeNameChange={onNodeNameChange}
            onCreateBranchNode={createBranchNodeFromChat}
            isCollapsed={chatPanelCollapsed}
            setIsCollapsed={setChatPanelCollapsed}
          />
        </div>
      </div>
    </div>
  )
}
