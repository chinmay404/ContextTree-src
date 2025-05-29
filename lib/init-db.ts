import clientPromise, { getConnectionStatus } from "@/lib/mongodb"

export async function initializeDatabase() {
  console.log("🔄 Initializing database...")

  try {
    // Check connection status first
    const { isConnected, connectionError } = getConnectionStatus()
    if (!isConnected && connectionError) {
      console.error(`❌ Cannot initialize database: MongoDB connection failed: ${connectionError}`)
      return {
        success: false,
        error: `MongoDB connection failed: ${connectionError}`,
        connectionStatus: "failed",
      }
    }

    // Wait for client promise to resolve
    const client = await clientPromise
    console.log("✅ MongoDB client connected, initializing database...")

    const db = client.db("Conversationstore")

    // Check if collections exist, create them if they don't
    console.log("🔄 Checking collections...")
    const collections = await db.listCollections().toArray()
    const collectionNames = collections.map((c) => c.name)

    // Existing collections
    if (!collectionNames.includes("conversations")) {
      console.log("📦 Creating conversations collection...")
      await db.createCollection("conversations")
      // Enhanced indexes for better performance
      await db.collection("conversations").createIndex({ userId: 1, conversationId: 1 }, { unique: true })
      await db.collection("conversations").createIndex({ userId: 1, lastModified: -1 })
      await db.collection("conversations").createIndex({ userId: 1, createdAt: -1 })
      await db.collection("conversations").createIndex({ name: "text" }) // Text search on conversation names
    }

    if (!collectionNames.includes("userCanvas")) {
      console.log("📦 Creating userCanvas collection...")
      await db.createCollection("userCanvas")
      await db.collection("userCanvas").createIndex({ userId: 1 }, { unique: true })
    }

    if (!collectionNames.includes("canvasInteractions")) {
      console.log("📦 Creating canvasInteractions collection...")
      await db.createCollection("canvasInteractions")
      await db.collection("canvasInteractions").createIndex({ userId: 1, conversationId: 1, timestamp: -1 })
      await db.collection("canvasInteractions").createIndex({ sessionId: 1 })
      await db.collection("canvasInteractions").createIndex({ actionType: 1, timestamp: -1 })
    }

    if (!collectionNames.includes("canvasSessions")) {
      console.log("📦 Creating canvasSessions collection...")
      await db.createCollection("canvasSessions")
      await db.collection("canvasSessions").createIndex({ userId: 1, isActive: 1 })
      await db.collection("canvasSessions").createIndex({ userId: 1, conversationId: 1 })
      await db.collection("canvasSessions").createIndex({ lastActivity: -1 })
    }

    // New collections for enhanced functionality
    if (!collectionNames.includes("userProfiles")) {
      console.log("📦 Creating userProfiles collection...")
      await db.createCollection("userProfiles")
      await db.collection("userProfiles").createIndex({ userId: 1 }, { unique: true })
      await db.collection("userProfiles").createIndex({ email: 1 }, { unique: true })
      await db.collection("userProfiles").createIndex({ lastLogin: -1 })
    }

    if (!collectionNames.includes("conversationMetadata")) {
      console.log("📦 Creating conversationMetadata collection...")
      await db.createCollection("conversationMetadata")
      await db.collection("conversationMetadata").createIndex({ userId: 1, conversationId: 1 }, { unique: true })
      await db.collection("conversationMetadata").createIndex({ userId: 1, "analytics.lastActivity": -1 })
      await db.collection("conversationMetadata").createIndex({ tags: 1 })
      await db.collection("conversationMetadata").createIndex({ isPublic: 1 })
    }

    if (!collectionNames.includes("conversationBackups")) {
      console.log("📦 Creating conversationBackups collection...")
      await db.createCollection("conversationBackups")
      await db.collection("conversationBackups").createIndex({ userId: 1, conversationId: 1, createdAt: -1 })
      await db.collection("conversationBackups").createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 }) // 30 days TTL
    }

    console.log("✅ Database initialization completed successfully")
    return {
      success: true,
      connectionStatus: "connected",
      collections: collectionNames,
    }
  } catch (error) {
    console.error("❌ Error initializing database:", error)
    return {
      success: false,
      error: (error as Error).message,
      connectionStatus: "error",
    }
  }
}

// Function to check database connection status
export async function checkDatabaseConnection() {
  try {
    const client = await clientPromise
    await client.db("admin").command({ ping: 1 })
    return {
      connected: true,
      message: "Database connection successful",
    }
  } catch (error) {
    console.error("Database connection check failed:", error)
    return {
      connected: false,
      message: `Database connection failed: ${(error as Error).message}`,
    }
  }
}
