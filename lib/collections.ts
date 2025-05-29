import clientPromise from "@/lib/mongodb"
import type {
  User,
  Canvas,
  Node,
  ChatThread,
  Message,
  Edge,
  Session,
  Analytics,
  Notification,
  Backup,
} from "@/lib/database-schema"

export class DatabaseCollections {
  private static instance: DatabaseCollections
  private db: any

  private constructor() {}

  public static async getInstance(): Promise<DatabaseCollections> {
    if (!DatabaseCollections.instance) {
      DatabaseCollections.instance = new DatabaseCollections()
      try {
        const client = await clientPromise
        DatabaseCollections.instance.db = client.db("ContextTreeDB")

        // Test the connection
        await DatabaseCollections.instance.db.admin().ping()
      } catch (error) {
        console.error("Failed to connect to MongoDB:", error)
        throw new Error(`Database connection failed: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }
    return DatabaseCollections.instance
  }

  // Collection getters
  get users() {
    return this.db.collection<User>("users")
  }

  get canvases() {
    return this.db.collection<Canvas>("canvases")
  }

  get nodes() {
    return this.db.collection<Node>("nodes")
  }

  get chatThreads() {
    return this.db.collection<ChatThread>("chatThreads")
  }

  get messages() {
    return this.db.collection<Message>("messages")
  }

  get edges() {
    return this.db.collection<Edge>("edges")
  }

  get sessions() {
    return this.db.collection<Session>("sessions")
  }

  get analytics() {
    return this.db.collection<Analytics>("analytics")
  }

  get notifications() {
    return this.db.collection<Notification>("notifications")
  }

  get backups() {
    return this.db.collection<Backup>("backups")
  }

  // Initialize database with indexes
  async initializeDatabase() {
    try {
      // Create indexes for optimal performance
      await this.createIndexes()
      console.log("Database initialized successfully")
      return { success: true }
    } catch (error) {
      console.error("Error initializing database:", error)
      return { success: false, error: (error as Error).message }
    }
  }

  private async createIndexes() {
    const { DatabaseIndexes } = await import("@/lib/models/database-schema")

    // Create indexes for each collection
    for (const [collectionName, indexes] of Object.entries(DatabaseIndexes)) {
      const collection = this.db.collection(collectionName)

      for (const index of indexes) {
        try {
          await collection.createIndex(index)
        } catch (error) {
          console.warn(`Failed to create index for ${collectionName}:`, error)
        }
      }
    }
  }

  // Utility methods for common operations
  async getUserCanvases(
    userId: string,
    options: {
      includeShared?: boolean
      limit?: number
      offset?: number
      sortBy?: string
      sortOrder?: 1 | -1
    } = {},
  ) {
    const { includeShared = true, limit = 50, offset = 0, sortBy = "timestamps.lastModified", sortOrder = -1 } = options

    const query: any = includeShared
      ? {
          $or: [{ userId }, { "permissions.collaborators.userId": userId }],
        }
      : { userId }

    return await this.canvases
      .find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(offset)
      .limit(limit)
      .toArray()
  }

  async getCanvasWithNodes(canvasId: string, userId: string) {
    const canvas = await this.canvases.findOne({
      canvasId,
      $or: [{ userId }, { "permissions.collaborators.userId": userId }, { "metadata.isPublic": true }],
    })

    if (!canvas) return null

    const nodes = await this.nodes.find({ canvasId }).sort({ "metadata.createdAt": 1 }).toArray()

    const edges = await this.edges.find({ canvasId }).toArray()

    return {
      canvas,
      nodes,
      edges,
    }
  }

  async getThreadMessages(
    threadId: string,
    options: {
      limit?: number
      offset?: number
      includeDeleted?: boolean
    } = {},
  ) {
    const { limit = 100, offset = 0, includeDeleted = false } = options

    const query: any = { threadId }
    if (!includeDeleted) {
      query["status.isDeleted"] = { $ne: true }
    }

    return await this.messages
      .find(query)
      .sort({ "relationships.threadPosition": 1 })
      .skip(offset)
      .limit(limit)
      .toArray()
  }

  async getUserAnalytics(userId: string, period: "daily" | "weekly" | "monthly" = "monthly") {
    const endDate = new Date()
    const startDate = new Date()

    switch (period) {
      case "daily":
        startDate.setDate(endDate.getDate() - 1)
        break
      case "weekly":
        startDate.setDate(endDate.getDate() - 7)
        break
      case "monthly":
        startDate.setMonth(endDate.getMonth() - 1)
        break
    }

    return await this.analytics.findOne({
      userId,
      "period.type": period,
      "period.startDate": { $gte: startDate },
      "period.endDate": { $lte: endDate },
    })
  }
}
