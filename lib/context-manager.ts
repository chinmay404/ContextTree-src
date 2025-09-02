export interface ContextConnection {
  contextNodeId: string
  llmCallNodeId: string
  contextType: "system" | "rag" | "memory" | "custom"
  priority: number
  isActive: boolean
}

export interface ContextData {
  nodeId: string
  type: "system" | "rag" | "memory" | "custom"
  content: string
  metadata?: Record<string, any>
}

export interface AssembledContext {
  systemInstructions: string[]
  ragData: string[]
  conversationMemory: string[]
  customContext: string[]
  totalTokens: number
}

class ContextManager {
  private connections: Map<string, ContextConnection[]> = new Map()
  private contextData: Map<string, ContextData> = new Map()

  // Add a context connection between a context node and LLM call node
  addConnection(contextNodeId: string, llmCallNodeId: string, contextType: string, priority = 1) {
    const connection: ContextConnection = {
      contextNodeId,
      llmCallNodeId,
      contextType: contextType as any,
      priority,
      isActive: true,
    }

    const existing = this.connections.get(llmCallNodeId) || []
    const filtered = existing.filter((c) => c.contextNodeId !== contextNodeId)
    this.connections.set(
      llmCallNodeId,
      [...filtered, connection].sort((a, b) => a.priority - b.priority),
    )
  }

  // Remove a context connection
  removeConnection(contextNodeId: string, llmCallNodeId: string) {
    const existing = this.connections.get(llmCallNodeId) || []
    this.connections.set(
      llmCallNodeId,
      existing.filter((c) => c.contextNodeId !== contextNodeId),
    )
  }

  // Get all context connections for an LLM call node
  getConnections(llmCallNodeId: string): ContextConnection[] {
    return this.connections.get(llmCallNodeId) || []
  }

  // Update context data for a node
  updateContextData(nodeId: string, data: Partial<ContextData>) {
    const existing = this.contextData.get(nodeId) || { nodeId, type: "custom", content: "" }
    this.contextData.set(nodeId, { ...existing, ...data })
  }

  // Get context data for a node
  getContextData(nodeId: string): ContextData | null {
    return this.contextData.get(nodeId) || null
  }

  // Assemble all context for an LLM call node
  assembleContext(llmCallNodeId: string): AssembledContext {
    const connections = this.getConnections(llmCallNodeId).filter((c) => c.isActive)
    const assembled: AssembledContext = {
      systemInstructions: [],
      ragData: [],
      conversationMemory: [],
      customContext: [],
      totalTokens: 0,
    }

    connections.forEach((connection) => {
      const contextData = this.getContextData(connection.contextNodeId)
      if (!contextData || !contextData.content) return

      switch (connection.contextType) {
        case "system":
          assembled.systemInstructions.push(contextData.content)
          break
        case "rag":
          assembled.ragData.push(contextData.content)
          break
        case "memory":
          assembled.conversationMemory.push(contextData.content)
          break
        case "custom":
          assembled.customContext.push(contextData.content)
          break
      }

      // Rough token estimation (4 chars = 1 token)
      assembled.totalTokens += Math.ceil(contextData.content.length / 4)
    })

    return assembled
  }

  // Get visual connection indicators for the canvas
  getConnectionIndicators(llmCallNodeId: string) {
    const connections = this.getConnections(llmCallNodeId)
    return connections.map((conn) => ({
      contextNodeId: conn.contextNodeId,
      type: conn.contextType,
      priority: conn.priority,
      isActive: conn.isActive,
    }))
  }

  // Check if two nodes are connected
  areConnected(contextNodeId: string, llmCallNodeId: string): boolean {
    const connections = this.getConnections(llmCallNodeId)
    return connections.some((c) => c.contextNodeId === contextNodeId)
  }

  // Get all LLM call nodes that a context node is connected to
  getConnectedLLMCalls(contextNodeId: string): string[] {
    const connectedCalls: string[] = []
    this.connections.forEach((connections, llmCallNodeId) => {
      if (connections.some((c) => c.contextNodeId === contextNodeId)) {
        connectedCalls.push(llmCallNodeId)
      }
    })
    return connectedCalls
  }

  // Clear all connections
  clearConnections() {
    this.connections.clear()
    this.contextData.clear()
  }

  // Export connections for persistence
  exportConnections() {
    return {
      connections: Array.from(this.connections.entries()),
      contextData: Array.from(this.contextData.entries()),
    }
  }

  // Import connections from persistence
  importConnections(data: any) {
    if (data.connections) {
      this.connections = new Map(data.connections)
    }
    if (data.contextData) {
      this.contextData = new Map(data.contextData)
    }
  }
}

export const contextManager = new ContextManager()
