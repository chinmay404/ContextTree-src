import clientPromise from "@/lib/mongodb"

export async function initializeDatabase() {
  try {
    const client = await clientPromise
    const db = client.db("Conversationstore")

    // Check if collections exist, create them if they don't
    const collections = await db.listCollections().toArray()
    const collectionNames = collections.map((c) => c.name)

    // Existing collections
    if (!collectionNames.includes("conversations")) {
      await db.createCollection("conversations")
      // Enhanced indexes for better performance
      await db.collection("conversations").createIndex({ userId: 1, conversationId: 1 }, { unique: true })
      await db.collection("conversations").createIndex({ userId: 1, lastModified: -1 })
      await db.collection("conversations").createIndex({ userId: 1, createdAt: -1 })
      await db.collection("conversations").createIndex({ name: "text" }) // Text search on conversation names
    }

    if (!collectionNames.includes("userCanvas")) {
      await db.createCollection("userCanvas")
      await db.collection("userCanvas").createIndex({ userId: 1 }, { unique: true })
    }

    if (!collectionNames.includes("canvasInteractions")) {
      await db.createCollection("canvasInteractions")
      await db.collection("canvasInteractions").createIndex({ userId: 1, conversationId: 1, timestamp: -1 })
      await db.collection("canvasInteractions").createIndex({ sessionId: 1 })
      await db.collection("canvasInteractions").createIndex({ actionType: 1, timestamp: -1 })
    }

    if (!collectionNames.includes("canvasSessions")) {
      await db.createCollection("canvasSessions")
      await db.collection("canvasSessions").createIndex({ userId: 1, isActive: 1 })
      await db.collection("canvasSessions").createIndex({ userId: 1, conversationId: 1 })
      await db.collection("canvasSessions").createIndex({ lastActivity: -1 })
    }

    // New collections for enhanced functionality
    if (!collectionNames.includes("userProfiles")) {
      await db.createCollection("userProfiles")
      await db.collection("userProfiles").createIndex({ userId: 1 }, { unique: true })
      await db.collection("userProfiles").createIndex({ email: 1 }, { unique: true })
      await db.collection("userProfiles").createIndex({ lastLogin: -1 })
    }

    if (!collectionNames.includes("conversationMetadata")) {
      await db.createCollection("conversationMetadata")
      await db.collection("conversationMetadata").createIndex({ userId: 1, conversationId: 1 }, { unique: true })
      await db.collection("conversationMetadata").createIndex({ userId: 1, "analytics.lastActivity": -1 })
      await db.collection("conversationMetadata").createIndex({ tags: 1 })
      await db.collection("conversationMetadata").createIndex({ isPublic: 1 })
    }

    if (!collectionNames.includes("conversationBackups")) {
      await db.createCollection("conversationBackups")
      await db.collection("conversationBackups").createIndex({ userId: 1, conversationId: 1, createdAt: -1 })
      await db.collection("conversationBackups").createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 }) // 30 days TTL
    }

    console.log("Database initialization completed successfully")
    return { success: true }
  } catch (error) {
    console.error("Error initializing database:", error)
    return { success: false, error: (error as Error).message }
  }
}
