"use client"
import { useState, useEffect, useCallback } from "react"
import { contextManager, type ContextConnection, type AssembledContext } from "@/lib/context-manager"

export function useContextFlow(llmCallNodeId?: string) {
  const [connections, setConnections] = useState<ContextConnection[]>([])
  const [assembledContext, setAssembledContext] = useState<AssembledContext | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const refreshConnections = useCallback(() => {
    if (!llmCallNodeId) return

    const nodeConnections = contextManager.getConnections(llmCallNodeId)
    setConnections(nodeConnections)

    const assembled = contextManager.assembleContext(llmCallNodeId)
    setAssembledContext(assembled)
  }, [llmCallNodeId])

  const addContextConnection = useCallback(
    (contextNodeId: string, contextType: string, priority = 1) => {
      if (!llmCallNodeId) return

      contextManager.addConnection(contextNodeId, llmCallNodeId, contextType, priority)
      refreshConnections()
    },
    [llmCallNodeId, refreshConnections],
  )

  const removeContextConnection = useCallback(
    (contextNodeId: string) => {
      if (!llmCallNodeId) return

      contextManager.removeConnection(contextNodeId, llmCallNodeId)
      refreshConnections()
    },
    [llmCallNodeId, refreshConnections],
  )

  const updateContextData = useCallback(
    (nodeId: string, content: string, type: string) => {
      contextManager.updateContextData(nodeId, { content, type: type as any })
      refreshConnections()
    },
    [refreshConnections],
  )

  const toggleConnectionActive = useCallback(
    (contextNodeId: string) => {
      if (!llmCallNodeId) return

      const currentConnections = contextManager.getConnections(llmCallNodeId)
      const connection = currentConnections.find((c) => c.contextNodeId === contextNodeId)

      if (connection) {
        contextManager.removeConnection(contextNodeId, llmCallNodeId)
        contextManager.addConnection(contextNodeId, llmCallNodeId, connection.contextType, connection.priority)
        // Toggle the active state
        const updatedConnections = contextManager.getConnections(llmCallNodeId)
        const updatedConnection = updatedConnections.find((c) => c.contextNodeId === contextNodeId)
        if (updatedConnection) {
          updatedConnection.isActive = !connection.isActive
        }
      }

      refreshConnections()
    },
    [llmCallNodeId, refreshConnections],
  )

  useEffect(() => {
    refreshConnections()
  }, [refreshConnections])

  return {
    connections,
    assembledContext,
    isLoading,
    addContextConnection,
    removeContextConnection,
    updateContextData,
    toggleConnectionActive,
    refreshConnections,
  }
}
