export interface CanvasData {
  userId: string
  conversationId: string
  name: string
  nodes: any[]
  edges: any[]
  lastModified: Date
  createdAt: Date
}

export interface UserCanvasData {
  userId: string
  activeConversationId: string
  lastAccessed: Date
}
