"use client"

import type React from "react"
import { useCallback, useRef, useState, useEffect } from "react"
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  Panel,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  type OnInit,
  type Viewport,
} from "reactflow"
import type { Conversation } from "@/lib/types"
import EdgeControls from "./edge-controls"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"

interface FlowCanvasProps {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: (changes: any) => void
  onEdgesChange: (changes: any) => void
  nodeTypes: any
  edgeTypes: any
  selectedEdge: Edge | null
  setSelectedEdge: (edge: Edge | null) => void
  activeNode: string
  activeConversation: string
  setConversations: (value: Conversation[] | ((val: Conversation[]) => Conversation[])) => void
  conversations: Conversation[]
  createBranchNode: (sourceNodeId?: string) => string | undefined
  branchCount: number
  setReactFlowInstance: any
  showConnectionMode?: boolean
  connectionSource?: string | null
  onConnect?: (params: Connection) => void
  onViewportChange?: (viewport: Viewport) => void
}

export default function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  nodeTypes,
  edgeTypes,
  selectedEdge,
  setSelectedEdge,
  activeNode,
  activeConversation,
  setConversations,
  conversations,
  createBranchNode,
  branchCount,
  setReactFlowInstance,
  showConnectionMode = false,
  connectionSource = null,
  onConnect,
  onViewportChange,
}: FlowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()
  const [hoverNode, setHoverNode] = useState<Node | null>(null)
  const [showNodePreview, setShowNodePreview] = useState(false)
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 })
  const [reactFlowInstanceInternal, setReactFlowInstanceInternal] = useState<any>(null)
  const [nodeDimensions, setNodeDimensions] = useState<Record<string, { width: number; height: number }>>({})

  const onInit: OnInit = (instance) => {
    setReactFlowInstanceInternal(instance)
    setReactFlowInstance(instance)
  }

  const handleConnect = useCallback(
    (params: Connection) => {
      if (onConnect) {
        onConnect(params)
      } else {
        const newEdges = addEdge(
          {
            ...params,
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
          },
          edges,
        )
        onEdgesChange(newEdges)
      }
    },
    [edges, onEdgesChange, onConnect],
  )

  // Handle viewport changes
  const handleViewportChange = useCallback(
    (viewport: Viewport) => {
      if (onViewportChange) {
        onViewportChange(viewport)
      }
    },
    [onViewportChange],
  )

  // Save node positions when they change
  const onNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setConversations((prevConversations) =>
        prevConversations.map((conv) => {
          if (conv.id === activeConversation) {
            return {
              ...conv,
              nodes: conv.nodes.map((n) => {
                if (n.id === node.id) {
                  return {
                    ...n,
                    position: node.position,
                  }
                }
                return n
              }),
            }
          }
          return conv
        }),
      )
    },
    [activeConversation, setConversations],
  )

  const handleEdgeClick = (edge: Edge) => {
    setSelectedEdge(edge)
  }

  const updateEdgeStyle = (edgeId: string, style: any) => {
    onEdgesChange(
      edges.map((edge) => {
        if (edge.id === edgeId) {
          return {
            ...edge,
            style: { ...edge.style, ...style },
            animated: style.animated !== undefined ? style.animated : edge.animated,
            data: {
              ...edge.data,
              label: style.label || edge.data?.label,
            },
          }
        }
        return edge
      }),
    )

    // Update in conversation data
    setConversations((prevConversations) =>
      prevConversations.map((conv) => {
        if (conv.id === activeConversation) {
          return {
            ...conv,
            edges: conv.edges?.map((edge) => {
              if (edge.id === edgeId) {
                return {
                  ...edge,
                  style: { ...edge.style, ...style },
                  animated: style.animated !== undefined ? style.animated : edge.animated,
                  data: {
                    ...edge.data,
                    label: style.label || edge.data?.label,
                  },
                }
              }
              return edge
            }),
          }
        }
        return conv
      }),
    )
  }

  const onEdgeDelete = useCallback(
    (edges: Edge[]) => {
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
    [activeConversation, setConversations, setSelectedEdge],
  )

  // Handle node dimensions change
  const handleNodeDimensionsChange = useCallback((nodeId: string, dimensions: { width: number; height: number }) => {
    setNodeDimensions((prev) => ({
      ...prev,
      [nodeId]: dimensions,
    }))
  }, [])

  // Update node data with the dimensions change handler
  useEffect(() => {
    const updatedNodes = nodes.map((node) => {
      if (!node.data.onDimensionsChange) {
        return {
          ...node,
          data: {
            ...node.data,
            onDimensionsChange: handleNodeDimensionsChange,
          },
        }
      }
      return node
    })

    if (JSON.stringify(nodes) !== JSON.stringify(updatedNodes)) {
      onNodesChange(updatedNodes)
    }
  }, [nodes, handleNodeDimensionsChange, onNodesChange])

  // Handle node hover for preview
  const onNodeMouseEnter = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current)
      }

      // Set a timeout to show the preview after 2 seconds
      hoverTimerRef.current = setTimeout(() => {
        setHoverNode(node)
        setShowNodePreview(true)

        // Position the preview beside the node in the canvas
        if (reactFlowInstanceInternal) {
          const dimensions = nodeDimensions[node.id] || { width: 220, height: 150 }

          const nodePosition = reactFlowInstanceInternal.project({
            x: node.position.x + dimensions.width + 10, // Position it to the right of the node
            y: node.position.y, // Align with the top of the node
          })

          setPreviewPosition({
            x: nodePosition.x,
            y: nodePosition.y,
          })
        }
      }, 2000) // 2 seconds delay
    },
    [reactFlowInstanceInternal, nodeDimensions],
  )

  const onNodeMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    setShowNodePreview(false)
  }, [])

  // Close preview when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (previewRef.current && !previewRef.current.contains(event.target as Node)) {
        setShowNodePreview(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current)
      }
    }
  }, [])

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full w-full relative">
      {showConnectionMode && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-yellow-500/90 text-black px-4 py-2 rounded-md flex items-center gap-2">
          <span className="text-sm font-medium">
            {connectionSource ? "Click on a target node to connect" : "Select a source node"}
          </span>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.5 }}
        minZoom={0.5}
        maxZoom={2}
        onEdgeClick={(_, edge) => handleEdgeClick(edge)}
        deleteKeyCode="Delete"
        onEdgesDelete={onEdgeDelete}
        onNodeDragStop={onNodeDragStop}
        className={theme === "dark" ? "bg-background" : "bg-slate-50"}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        proOptions={{
          hideAttribution: true,
          smooth: true,
        }}
        onInit={onInit}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        nodesDraggable={true}
        nodesConnectable={true}
        snapToGrid={true}
        snapGrid={[15, 15]}
        elevateNodesOnSelect={true}
        onMove={handleViewportChange}
      >
        <Background color={theme === "dark" ? "#333" : "#aaa"} gap={16} size={1} variant="dots" />
        <Controls className="m-4" />

        {/* Edge Controls Panel */}
        {selectedEdge && (
          <Panel
            position="top-right"
            className="bg-background/90 backdrop-blur-sm border border-border rounded-md shadow-md p-3 m-4"
          >
            <EdgeControls
              edge={selectedEdge}
              updateEdgeStyle={(style) => updateEdgeStyle(selectedEdge.id, style)}
              onClose={() => setSelectedEdge(null)}
            />
          </Panel>
        )}
      </ReactFlow>

      {/* Node Preview Popup */}
      <AnimatePresence>
        {showNodePreview && hoverNode && (
          <motion.div
            ref={previewRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="absolute z-50 bg-background/95 backdrop-blur-md border border-border rounded-lg shadow-lg p-4 max-h-[400px] overflow-hidden node-preview"
            style={{
              position: "absolute",
              left: `${previewPosition.x}px`,
              top: `${previewPosition.y}px`,
              width: "300px",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-base">{hoverNode.data?.label || "Node Preview"}</h3>
              <button
                onClick={() => setShowNodePreview(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 max-h-[320px] overflow-y-auto preview-scrollbar pr-1">
              {hoverNode.data?.messages && hoverNode.data.messages.length > 0 ? (
                hoverNode.data.messages.map((message: any, index: number) => (
                  <div
                    key={message.id || index}
                    className={`p-3 rounded-lg ${
                      message.sender === "user"
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-card border border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`w-2 h-2 rounded-full ${message.sender === "user" ? "bg-primary" : "bg-green-500"}`}
                      ></div>
                      <span className="text-xs font-medium">{message.sender === "user" ? "User" : "AI"}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-sm">{message.content}</p>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-6">
                  <p>No messages in this node</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
