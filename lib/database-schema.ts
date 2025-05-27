import type { ObjectId } from "mongodb"

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export interface User {
  _id: ObjectId
  googleId: string // Google OAuth sub or email
  name: string
  email: string
  avatar?: string
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// CANVAS MANAGEMENT
// ============================================================================

export interface Canvas {
  _id: ObjectId
  chatThreadId: ObjectId // Reference to ChatThread._id
  name: string
  nodes: ObjectId[] // Array of Node._id
  edges: ObjectId[] // Array of Edge._id (optional)
  createdAt: Date
  updatedAt: Date
  version: number
}

// ============================================================================
// NODE MANAGEMENT
// ============================================================================

export interface Node {
  _id: ObjectId
  canvasId: ObjectId // Reference to Canvas._id
  type: string // e.g., "main", "branch", "image"
  position: { x: number; y: number }
  data: {
    label: string
    style?: Record<string, any>
    model?: string
    imageUrl?: string
  }
  messages: ObjectId[] // Array of Message._id
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// CHAT THREAD MANAGEMENT
// ============================================================================

export interface ChatThread {
  _id: ObjectId
  userId: ObjectId // Reference to User._id
  title: string
  description?: string
  canvasId: ObjectId // Reference to Canvas._id
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// MESSAGE MANAGEMENT
// ============================================================================

export interface Message {
  _id: ObjectId
  nodeId: ObjectId // Reference to Node._id
  sender: string // "user", "ai", or user name
  content: string
  timestamp: Date
}

// ============================================================================
// EDGE/CONNECTION MANAGEMENT
// ============================================================================

export interface Edge {
  _id: ObjectId
  edgeId: string
  canvasId: string
  userId: string // Creator

  connection: {
    sourceNodeId: string
    targetNodeId: string
    sourceHandle?: string // Specific connection point
    targetHandle?: string
  }

  style: {
    type: "straight" | "curved" | "step" | "smoothstep"
    color?: string
    width?: number
    dashArray?: string
    animated?: boolean
    label?: string
    labelPosition?: "start" | "middle" | "end"
  }

  metadata: {
    createdAt: Date
    updatedAt: Date
    createdBy: string
    isVisible: boolean
    weight?: number // For algorithmic purposes
  }
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

export interface Session {
  _id: ObjectId
  sessionId: string
  userId: string
  canvasId?: string

  activity: {
    startTime: Date
    lastActivity: Date
    endTime?: Date
    isActive: boolean
    duration?: number // in seconds
  }

  context: {
    deviceInfo: {
      userAgent: string
      platform: string
      browser: string
      isMobile: boolean
    }
    location?: {
      country: string
      city: string
      timezone: string
    }
    referrer?: string
  }

  interactions: Array<{
    type: "view" | "edit" | "create" | "delete" | "share" | "export"
    entityType: "canvas" | "node" | "message" | "thread"
    entityId: string
    timestamp: Date
    metadata?: Record<string, any>
  }>
}

// ============================================================================
// ANALYTICS AND INSIGHTS
// ============================================================================

export interface Analytics {
  _id: ObjectId
  userId: string
  canvasId?: string
  period: {
    startDate: Date
    endDate: Date
    type: "daily" | "weekly" | "monthly" | "yearly"
  }

  metrics: {
    canvasMetrics: {
      totalCanvases: number
      activeCanvases: number
      publicCanvases: number
      templatesCreated: number
    }
    nodeMetrics: {
      totalNodes: number
      nodesByType: Record<string, number>
      averageNodesPerCanvas: number
    }
    chatMetrics: {
      totalMessages: number
      totalThreads: number
      averageMessagesPerThread: number
      aiInteractions: number
    }
    collaborationMetrics: {
      sharedCanvases: number
      collaborators: number
      commentsReceived: number
    }
    usageMetrics: {
      sessionCount: number
      totalTimeSpent: number // in seconds
      averageSessionDuration: number
      featuresUsed: string[]
    }
  }

  insights: {
    mostActiveCanvas: string
    preferredNodeTypes: string[]
    peakUsageHours: number[]
    collaborationPatterns: Record<string, any>
  }

  generatedAt: Date
}

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================

export interface Notification {
  _id: ObjectId
  notificationId: string
  userId: string // Recipient

  content: {
    type: "mention" | "comment" | "share" | "collaboration" | "system" | "ai_response"
    title: string
    message: string
    actionUrl?: string
    priority: "low" | "medium" | "high"
  }

  context: {
    canvasId?: string
    nodeId?: string
    threadId?: string
    messageId?: string
    triggeredBy?: string // userId who triggered the notification
  }

  delivery: {
    channels: Array<"in_app" | "email" | "push">
    status: "pending" | "sent" | "delivered" | "read" | "failed"
    sentAt?: Date
    readAt?: Date
    deliveredAt?: Date
  }

  timestamps: {
    createdAt: Date
    expiresAt?: Date
  }
}

// ============================================================================
// BACKUP AND EXPORT
// ============================================================================

export interface Backup {
  _id: ObjectId
  backupId: string
  userId: string

  scope: {
    type: "full" | "canvas" | "selective"
    canvasIds?: string[]
    includeMessages: boolean
    includeAnalytics: boolean
  }

  backup: {
    format: "json" | "mongodb_dump" | "csv"
    compression: "none" | "gzip" | "zip"
    encryption: boolean
    size: number // in bytes
    fileUrl: string
    checksum: string
  }

  metadata: {
    createdAt: Date
    expiresAt: Date
    downloadCount: number
    lastDownloadAt?: Date
    isAutomatic: boolean
    description?: string
  }
}

// ============================================================================
// DATABASE INDEXES FOR PERFORMANCE
// ============================================================================

export const DatabaseIndexes = {
  users: [
    { userId: 1 },
    { email: 1 },
    { "metadata.createdAt": -1 },
    { "subscription.plan": 1, "subscription.status": 1 },
  ],

  canvases: [
    { canvasId: 1 },
    { userId: 1, "timestamps.lastModified": -1 },
    { "metadata.isPublic": 1, "metadata.category": 1 },
    { "permissions.collaborators.userId": 1 },
    { "metadata.tags": 1 },
    { "timestamps.createdAt": -1 },
  ],

  nodes: [
    { nodeId: 1 },
    { canvasId: 1, "metadata.createdAt": -1 },
    { userId: 1, type: 1 },
    { "chatThread.threadId": 1 },
    { "connections.parent": 1 },
    { "metadata.tags": 1 },
  ],

  chatThreads: [
    { threadId: 1 },
    { nodeId: 1 },
    { canvasId: 1, "timestamps.lastMessageAt": -1 },
    { userId: 1, "metadata.status": 1 },
    { "participants.userId": 1 },
  ],

  messages: [
    { messageId: 1 },
    { threadId: 1, "relationships.threadPosition": 1 },
    { userId: 1, "timestamps.createdAt": -1 },
    { canvasId: 1, "timestamps.createdAt": -1 },
    { "content.mentions.userId": 1 },
    { "aiContext.model": 1, "timestamps.createdAt": -1 },
  ],

  edges: [{ edgeId: 1 }, { canvasId: 1 }, { "connection.sourceNodeId": 1 }, { "connection.targetNodeId": 1 }],

  sessions: [
    { sessionId: 1 },
    { userId: 1, "activity.startTime": -1 },
    { canvasId: 1, "activity.isActive": 1 },
    { "activity.lastActivity": -1 },
  ],

  notifications: [
    { userId: 1, "delivery.status": 1, "timestamps.createdAt": -1 },
    { "context.canvasId": 1 },
    { "delivery.readAt": 1 },
    { "timestamps.expiresAt": 1 },
  ],
}
