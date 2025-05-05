"use client"

import type React from "react"
import { useCallback, useRef } from "react"
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
} from "reactflow"
import type { Conversation } from "@/lib/types"
import EdgeControls from "./edge-controls"
import { useTheme } from "next-themes"

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
}: FlowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()

  const onInit: OnInit = (reactFlowInstance) => {
    setReactFlowInstance(reactFlowInstance)
  }

  const onConnect = useCallback(
    (params: Connection) => {
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

      const newEdges = addEdge(newEdge, edges)
      onEdgesChange(newEdges)

      // Update conversation edges
      setConversations((prevConversations) => {
        return prevConversations.map((conv) => {
          if (conv.id === activeConversation) {
            return {
              ...conv,
              edges: [...(conv.edges || []), newEdge],
            }
          }
          return conv
        })
      })
    },
    [edges, onEdgesChange, activeConversation, setConversations],
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
        onConnect={onConnect}
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
        proOptions={{ hideAttribution: true }}
        onInit={onInit}
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
    </div>
  )
}
