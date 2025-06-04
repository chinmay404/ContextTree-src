export interface UserProfile {
  userId: string
  email: string
  name?: string
  avatar?: string
  preferences: UserPreferences
  createdAt: Date
  lastLogin: Date
  subscription?: {
    plan: "free" | "pro" | "enterprise"
    status: "active" | "cancelled" | "expired"
    expiresAt?: Date
  }
}

export interface UserPreferences {
  theme: "light" | "dark" | "system"
  autoSave: boolean
  autoSaveInterval: number // in seconds
  defaultModel: string
  canvasSettings: {
    snapToGrid: boolean
    showMinimap: boolean
    animateEdges: boolean
  }
  notifications: {
    email: boolean
    browser: boolean
  }
}

export interface ConversationMetadata {
  conversationId: string
  userId: string
  tags: string[]
  isPublic: boolean
  collaborators: string[]
  analytics: {
    totalNodes: number
    totalEdges: number
    totalMessages: number
    lastActivity: Date
    timeSpent: number // in minutes
  }
  backup: {
    lastBackup: Date
    backupCount: number
  }
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
