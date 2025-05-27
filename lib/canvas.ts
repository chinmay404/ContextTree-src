export interface CanvasData {
  userId: string
  conversationId: string
  name: string
  nodes: any[]
  edges: any[]
  lastModified: Date
  createdAt: Date
  version: number // For optimistic concurrency control
}

export interface UserCanvasData {
  userId: string
  activeConversationId: string
  lastAccessed: Date
  sessionId?: string // Track current session
}

export interface CanvasInteraction {
  id: string
  userId: string
  conversationId: string
  actionType:
    | "create_node"
    | "delete_node"
    | "update_node"
    | "create_edge"
    | "delete_edge"
    | "update_edge"
    | "send_message"
    | "rename"
  entityId: string // Node or edge ID
  timestamp: Date
  metadata: any // Additional data about the action
  sessionId: string // To track which session performed the action
}

export interface CanvasSession {
  id: string
  userId: string
  conversationId: string
  startTime: Date
  lastActivity: Date
  deviceInfo: string
  isActive: boolean
}
