import type { ObjectId } from "mongodb"

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export interface User {
  _id: ObjectId
  userId: string // Google OAuth ID or email
  email: string
  name: string
  avatar?: string
  profile: {
    displayName: string
    bio?: string
    preferences: {
      theme: "light" | "dark" | "system"
      language: string
      timezone: string
      notifications: {
        email: boolean
        push: boolean
        mentions: boolean
      }
    }
  }
  subscription: {
    plan: "free" | "pro" | "enterprise"
    status: "active" | "cancelled" | "expired"
    startDate: Date
    endDate?: Date
    features: string[]
  }
  metadata: {
    createdAt: Date
    updatedAt: Date
    lastLoginAt: Date
    isActive: boolean
    version: number
  }
}

// ============================================================================
// CANVAS MANAGEMENT
// ============================================================================

export interface Canvas {
  _id: ObjectId
  canvasId: string // Unique identifier
  userId: string // Owner of the canvas
  metadata: {
    name: string
    description?: string
    tags: string[]
    category?: string
    isPublic: boolean
    isTemplate: boolean
  }
  settings: {
    theme: string
    layout: "flow" | "grid" | "freeform"
    zoom: number
    viewport: {
      x: number
      y: number
      width: number
      height: number
    }
    gridSettings: {
      enabled: boolean
      size: number
      color: string
    }
  }
  permissions: {
    owner: string // userId
    collaborators: Array<{
      userId: string
      role: "viewer" | "editor" | "admin"
      permissions: string[]
      addedAt: Date
      addedBy: string
    }>
    shareSettings: {
      isPublic: boolean
      allowComments: boolean
      allowCopy: boolean
      shareLink?: string
      expiresAt?: Date
    }
  }
  versioning: {
    currentVersion: number
    versions: Array<{
      version: number
      createdAt: Date
      createdBy: string
      description?: string
      snapshot: {
        nodes: string[] // nodeIds
        edges: string[] // edgeIds
      }
    }>
  }
  statistics: {
    nodeCount: number
    messageCount: number
    collaboratorCount: number
    viewCount: number
    lastActivity: Date
  }
  timestamps: {
    createdAt: Date
    updatedAt: Date
    lastModified: Date
    lastAccessed: Date
  }
}

// ============================================================================
// NODE MANAGEMENT
// ============================================================================

export interface Node {
  _id: ObjectId
  nodeId: string // Unique identifier
  canvasId: string
  userId: string // Creator of the node
  type: "main" | "branch" | "image" | "text" | "code" | "link" | "file"

  // Position and visual properties
  position: {
    x: number
    y: number
    z?: number // For layering
  }
  dimensions: {
    width: number
    height: number
  }
  style: {
    backgroundColor?: string
    borderColor?: string
    borderWidth?: number
    borderRadius?: number
    opacity?: number
    rotation?: number
  }

  // Content based on node type
  content: {
    title: string
    description?: string
    // Type-specific content
    text?: string
    imageUrl?: string
    fileUrl?: string
    linkUrl?: string
    codeContent?: {
      language: string
      code: string
    }
    metadata?: Record<string, any>
  }

  // Chat thread association
  chatThread: {
    threadId: string
    messageCount: number
    lastMessageAt?: Date
    isActive: boolean
  }

  // Relationships
  connections: {
    incoming: string[] // nodeIds that connect to this node
    outgoing: string[] // nodeIds this node connects to
    parent?: string // parent nodeId for hierarchical structures
    children: string[] // child nodeIds
  }

  // Permissions and sharing
  permissions: {
    isPrivate: boolean
    allowedUsers: string[] // userIds who can access this node
    inheritFromCanvas: boolean
  }

  // Versioning
  versioning: {
    version: number
    history: Array<{
      version: number
      changes: Record<string, any>
      changedBy: string
      changedAt: Date
      description?: string
    }>
  }

  // Metadata
  metadata: {
    createdAt: Date
    updatedAt: Date
    createdBy: string
    lastModifiedBy: string
    tags: string[]
    isArchived: boolean
    archivedAt?: Date
  }
}

// ============================================================================
// CHAT THREAD MANAGEMENT
// ============================================================================

export interface ChatThread {
  _id: ObjectId
  threadId: string // Unique identifier
  nodeId: string // Associated node
  canvasId: string
  userId: string // Thread creator

  metadata: {
    title: string
    description?: string
    status: "active" | "resolved" | "archived" | "locked"
    priority: "low" | "medium" | "high" | "urgent"
    category?: string
    tags: string[]
  }

  participants: Array<{
    userId: string
    role: "owner" | "participant" | "observer"
    joinedAt: Date
    lastReadAt: Date
    permissions: string[]
    isActive: boolean
  }>

  settings: {
    isPrivate: boolean
    allowAnonymous: boolean
    requireApproval: boolean
    autoArchiveAfter?: number // days
    notificationSettings: {
      mentions: boolean
      newMessages: boolean
      statusChanges: boolean
    }
  }

  statistics: {
    messageCount: number
    participantCount: number
    lastActivity: Date
    averageResponseTime?: number
    resolutionTime?: number
  }

  timestamps: {
    createdAt: Date
    updatedAt: Date
    lastMessageAt?: Date
    resolvedAt?: Date
    archivedAt?: Date
  }
}

// ============================================================================
// MESSAGE MANAGEMENT
// ============================================================================

export interface Message {
  _id: ObjectId
  messageId: string // Unique identifier
  threadId: string
  nodeId: string
  canvasId: string
  userId: string // Message sender

  content: {
    type: "text" | "image" | "file" | "code" | "system" | "ai_response"
    text?: string
    html?: string // Rendered markdown/rich text
    attachments?: Array<{
      type: "image" | "file" | "link"
      url: string
      name: string
      size?: number
      mimeType?: string
      thumbnail?: string
    }>
    mentions?: Array<{
      userId: string
      displayName: string
      position: number // Character position in text
    }>
    reactions?: Array<{
      emoji: string
      userId: string
      addedAt: Date
    }>
  }

  // AI-specific fields
  aiContext?: {
    model: string
    prompt?: string
    tokens?: {
      input: number
      output: number
    }
    processingTime?: number
    confidence?: number
    thinking?: string // AI thinking process
  }

  // Message relationships
  relationships: {
    replyTo?: string // messageId this is replying to
    threadPosition: number // Position in thread
    isEdited: boolean
    editHistory?: Array<{
      content: string
      editedAt: Date
      editedBy: string
    }>
  }

  // Status and metadata
  status: {
    isDelivered: boolean
    isRead: boolean
    readBy: Array<{
      userId: string
      readAt: Date
    }>
    isDeleted: boolean
    deletedAt?: Date
    deletedBy?: string
  }

  timestamps: {
    createdAt: Date
    updatedAt: Date
    scheduledFor?: Date // For scheduled messages
  }
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
