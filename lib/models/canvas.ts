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

export interface User {
  _id: string
  googleId: string
  name: string
  email: string
  avatar?: string
  createdAt: Date
  updatedAt: Date
}

export interface ChatThread {
  _id: string
  userId: string
  title: string
  description?: string
  canvasId: string
  createdAt: Date
  updatedAt: Date
}

export interface Canvas {
  _id: string
  chatThreadId: string
  name: string
  nodes: string[]
  edges: string[]
  createdAt: Date
  updatedAt: Date
  version: number
}

export interface Node {
  _id: string
  canvasId: string
  type: string
  position: { x: number; y: number }
  data: {
    label: string
    style?: Record<string, any>
    model?: string
    imageUrl?: string
  }
  messages: string[]
  createdAt: Date
  updatedAt: Date
}

export interface Message {
  _id: string
  nodeId: string
  sender: string
  content: string
  timestamp: Date
}
