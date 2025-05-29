import clientPromise from "@/lib/mongodb"

// Database utility functions for better data management

export class DatabaseUtils {
  private static async getDb() {
    const client = await clientPromise
    return client.db("Conversationstore")
  }

  // Bulk operations for better performance
  static async bulkUpdateConversations(userId: string, updates: any[]) {
    try {
      const db = await this.getDb()
      const collection = db.collection("conversations")

      const operations = updates.map((update) => ({
        updateOne: {
          filter: { userId, conversationId: update.conversationId },
          update: { $set: update.data },
          upsert: true,
        },
      }))

      const result = await collection.bulkWrite(operations)
      return { success: true, result }
    } catch (error) {
      console.error("Error in bulk update:", error)
      return { success: false, error: (error as Error).message }
    }
  }

  // Data cleanup utilities
  static async cleanupOldSessions(daysOld = 7) {
    try {
      const db = await this.getDb()
      const collection = db.collection("canvasSessions")

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const result = await collection.deleteMany({
        isActive: false,
        lastActivity: { $lt: cutoffDate },
      })

      return { success: true, deletedCount: result.deletedCount }
    } catch (error) {
      console.error("Error cleaning up old sessions:", error)
      return { success: false, error: (error as Error).message }
    }
  }

  // Data export utilities
  static async exportUserData(userId: string) {
    try {
      const db = await this.getDb()

      const [conversations, profile, interactions, sessions] = await Promise.all([
        db.collection("conversations").find({ userId }).toArray(),
        db.collection("userProfiles").findOne({ userId }),
        db.collection("canvasInteractions").find({ userId }).toArray(),
        db.collection("canvasSessions").find({ userId }).toArray(),
      ])

      return {
        success: true,
        data: {
          conversations,
          profile,
          interactions,
          sessions,
          exportedAt: new Date(),
        },
      }
    } catch (error) {
      console.error("Error exporting user data:", error)
      return { success: false, error: (error as Error).message }
    }
  }

  // Health check
  static async healthCheck() {
    try {
      const db = await this.getDb()
      const collections = await db.listCollections().toArray()

      const stats = await Promise.all(
        collections.map(async (col) => ({
          name: col.name,
          count: await db.collection(col.name).estimatedDocumentCount(),
        })),
      )

      return { success: true, collections: stats }
    } catch (error) {
      console.error("Database health check failed:", error)
      return { success: false, error: (error as Error).message }
    }
  }
}
