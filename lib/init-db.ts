import clientPromise from "@/lib/mongodb"

export async function initializeDatabase() {
  try {
    const client = await clientPromise
    const db = client.db("Conversationstore")

    // Check if collections exist, create them if they don't
    const collections = await db.listCollections().toArray()
    const collectionNames = collections.map((c) => c.name)

    if (!collectionNames.includes("conversations")) {
      await db.createCollection("conversations")
      // Create indexes for better performance
      await db.collection("conversations").createIndex({ userId: 1, conversationId: 1 }, { unique: true })
      await db.collection("conversations").createIndex({ userId: 1, lastModified: -1 })
    }

    if (!collectionNames.includes("userCanvas")) {
      await db.createCollection("userCanvas")
      await db.collection("userCanvas").createIndex({ userId: 1 }, { unique: true })
    }

    // Add new collections for enhanced persistence
    if (!collectionNames.includes("canvasInteractions")) {
      await db.createCollection("canvasInteractions")
      await db.collection("canvasInteractions").createIndex({ userId: 1, conversationId: 1, timestamp: -1 })
      await db.collection("canvasInteractions").createIndex({ sessionId: 1 })
    }

    if (!collectionNames.includes("canvasSessions")) {
      await db.createCollection("canvasSessions")
      await db.collection("canvasSessions").createIndex({ userId: 1, isActive: 1 })
      await db.collection("canvasSessions").createIndex({ userId: 1, conversationId: 1 })
    }

    return { success: true }
  } catch (error) {
    console.error("Error initializing database:", error)
    return { success: false, error: (error as Error).message }
  }
}
