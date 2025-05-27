import type { DatabaseCollections } from "./collections"
import type { Canvas, Node, Message, ChatThread } from "@/lib/database-schema"

export class DatabaseQueries {
  private db: DatabaseCollections

  constructor(db: DatabaseCollections) {
    this.db = db
  }

  // ============================================================================
  // CANVAS QUERIES
  // ============================================================================

  async createCanvas(userId: string, canvasData: Partial<Canvas>) {
    const canvas: Partial<Canvas> = {
      canvasId: `canvas_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      metadata: {
        name: canvasData.metadata?.name || "Untitled Canvas",
        description: canvasData.metadata?.description,
        tags: canvasData.metadata?.tags || [],
        isPublic: false,
        isTemplate: false,
        ...canvasData.metadata,
      },
      settings: {
        theme: "default",
        layout: "flow",
        zoom: 1,
        viewport: { x: 0, y: 0, width: 1920, height: 1080 },
        gridSettings: { enabled: true, size: 20, color: "#e5e5e5" },
        ...canvasData.settings,
      },
      permissions: {
        owner: userId,
        collaborators: [],
        shareSettings: {
          isPublic: false,
          allowComments: true,
          allowCopy: false,
        },
        ...canvasData.permissions,
      },
      versioning: {
        currentVersion: 1,
        versions: [
          {
            version: 1,
            createdAt: new Date(),
            createdBy: userId,
            description: "Initial version",
            snapshot: { nodes: [], edges: [] },
          },
        ],
      },
      statistics: {
        nodeCount: 0,
        messageCount: 0,
        collaboratorCount: 0,
        viewCount: 0,
        lastActivity: new Date(),
      },
      timestamps: {
        createdAt: new Date(),
        updatedAt: new Date(),
        lastModified: new Date(),
        lastAccessed: new Date(),
      },
    }

    const result = await this.db.canvases.insertOne(canvas as Canvas)
    return { ...canvas, _id: result.insertedId }
  }

  async updateCanvas(canvasId: string, userId: string, updates: Partial<Canvas>) {
    const updateData = {
      ...updates,
      "timestamps.updatedAt": new Date(),
      "timestamps.lastModified": new Date(),
    }

    return await this.db.canvases.updateOne(
      {
        canvasId,
        $or: [{ userId }, { "permissions.collaborators.userId": userId }],
      },
      { $set: updateData },
    )
  }

  // ============================================================================
  // NODE QUERIES
  // ============================================================================

  async createNode(canvasId: string, userId: string, nodeData: Partial<Node>) {
    const threadId = `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const node: Partial<Node> = {
      nodeId: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      canvasId,
      userId,
      type: nodeData.type || "main",
      position: nodeData.position || { x: 0, y: 0 },
      dimensions: nodeData.dimensions || { width: 300, height: 200 },
      style: nodeData.style || {},
      content: {
        title: nodeData.content?.title || "New Node",
        description: nodeData.content?.description,
        ...nodeData.content,
      },
      chatThread: {
        threadId,
        messageCount: 0,
        isActive: true,
      },
      connections: {
        incoming: [],
        outgoing: [],
        children: [],
        ...nodeData.connections,
      },
      permissions: {
        isPrivate: false,
        allowedUsers: [],
        inheritFromCanvas: true,
        ...nodeData.permissions,
      },
      versioning: {
        version: 1,
        history: [],
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        lastModifiedBy: userId,
        tags: [],
        isArchived: false,
      },
    }

    // Create associated chat thread
    await this.createChatThread(threadId, node.nodeId!, canvasId, userId)

    const result = await this.db.nodes.insertOne(node as Node)

    // Update canvas node count
    await this.db.canvases.updateOne(
      { canvasId },
      {
        $inc: { "statistics.nodeCount": 1 },
        $set: { "timestamps.lastModified": new Date() },
      },
    )

    return { ...node, _id: result.insertedId }
  }

  // ============================================================================
  // CHAT THREAD QUERIES
  // ============================================================================

  async createChatThread(threadId: string, nodeId: string, canvasId: string, userId: string) {
    const chatThread: Partial<ChatThread> = {
      threadId,
      nodeId,
      canvasId,
      userId,
      metadata: {
        title: `Chat for Node`,
        status: "active",
        priority: "medium",
        tags: [],
      },
      participants: [
        {
          userId,
          role: "owner",
          joinedAt: new Date(),
          lastReadAt: new Date(),
          permissions: ["read", "write", "manage"],
          isActive: true,
        },
      ],
      settings: {
        isPrivate: false,
        allowAnonymous: false,
        requireApproval: false,
        notificationSettings: {
          mentions: true,
          newMessages: true,
          statusChanges: true,
        },
      },
      statistics: {
        messageCount: 0,
        participantCount: 1,
        lastActivity: new Date(),
      },
      timestamps: {
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }

    const result = await this.db.chatThreads.insertOne(chatThread as ChatThread)
    return { ...chatThread, _id: result.insertedId }
  }

  // ============================================================================
  // MESSAGE QUERIES
  // ============================================================================

  async createMessage(
    threadId: string,
    nodeId: string,
    canvasId: string,
    userId: string,
    content: string,
    type: "text" | "ai_response" = "text",
    aiContext?: any,
  ) {
    // Get current thread position
    const lastMessage = await this.db.messages.findOne({ threadId }, { sort: { "relationships.threadPosition": -1 } })

    const threadPosition = (lastMessage?.relationships.threadPosition || 0) + 1

    const message: Partial<Message> = {
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      threadId,
      nodeId,
      canvasId,
      userId,
      content: {
        type,
        text: content,
        html: content, // You might want to process markdown here
        attachments: [],
        mentions: [],
        reactions: [],
      },
      aiContext,
      relationships: {
        threadPosition,
        isEdited: false,
      },
      status: {
        isDelivered: true,
        isRead: false,
        readBy: [],
        isDeleted: false,
      },
      timestamps: {
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }

    const result = await this.db.messages.insertOne(message as Message)

    // Update thread and node statistics
    await Promise.all([
      this.db.chatThreads.updateOne(
        { threadId },
        {
          $inc: { "statistics.messageCount": 1 },
          $set: {
            "statistics.lastActivity": new Date(),
            "timestamps.lastMessageAt": new Date(),
            "timestamps.updatedAt": new Date(),
          },
        },
      ),
      this.db.nodes.updateOne(
        { nodeId },
        {
          $inc: { "chatThread.messageCount": 1 },
          $set: {
            "chatThread.lastMessageAt": new Date(),
            "metadata.updatedAt": new Date(),
          },
        },
      ),
      this.db.canvases.updateOne(
        { canvasId },
        {
          $inc: { "statistics.messageCount": 1 },
          $set: {
            "statistics.lastActivity": new Date(),
            "timestamps.lastModified": new Date(),
          },
        },
      ),
    ])

    return { ...message, _id: result.insertedId }
  }

  // ============================================================================
  // SEARCH QUERIES
  // ============================================================================

  async searchCanvases(
    userId: string,
    query: string,
    filters: {
      tags?: string[]
      isPublic?: boolean
      collaborators?: string[]
    } = {},
  ) {
    const searchQuery: any = {
      $and: [
        {
          $or: [{ userId }, { "permissions.collaborators.userId": userId }, { "metadata.isPublic": true }],
        },
        {
          $or: [
            { "metadata.name": { $regex: query, $options: "i" } },
            { "metadata.description": { $regex: query, $options: "i" } },
            { "metadata.tags": { $in: [new RegExp(query, "i")] } },
          ],
        },
      ],
    }

    if (filters.tags?.length) {
      searchQuery.$and.push({ "metadata.tags": { $in: filters.tags } })
    }

    if (filters.isPublic !== undefined) {
      searchQuery.$and.push({ "metadata.isPublic": filters.isPublic })
    }

    return await this.db.canvases.find(searchQuery).sort({ "timestamps.lastModified": -1 }).limit(50).toArray()
  }

  async searchMessages(userId: string, query: string, canvasId?: string) {
    const searchQuery: any = {
      $and: [{ "content.text": { $regex: query, $options: "i" } }, { "status.isDeleted": { $ne: true } }],
    }

    if (canvasId) {
      searchQuery.$and.push({ canvasId })
    }

    // Only search in canvases the user has access to
    const accessibleCanvases = await this.db.canvases
      .find({
        $or: [{ userId }, { "permissions.collaborators.userId": userId }, { "metadata.isPublic": true }],
      })
      .project({ canvasId: 1 })
      .toArray()

    const canvasIds = accessibleCanvases.map((c) => c.canvasId)
    searchQuery.$and.push({ canvasId: { $in: canvasIds } })

    return await this.db.messages.find(searchQuery).sort({ "timestamps.createdAt": -1 }).limit(100).toArray()
  }
}
