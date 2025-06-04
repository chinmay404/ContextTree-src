import getMongoClientPromise, { getConnectionStatus } from "@/lib/mongodb" // Assuming getConnectionStatus is async

console.log("LIB/INIT-DB: Module loaded.")

export async function initializeDatabase() {
  console.log("LIB/INIT-DB: initializeDatabase() - 🔄 Initializing database...")

  try {
    console.log("LIB/INIT-DB: initializeDatabase() - Checking MongoDB connection status...")
    const status = await getConnectionStatus() // getConnectionStatus is async
    if (!status.isConnected && status.connectionError) {
      console.error(
        `LIB/INIT-DB: initializeDatabase() - ❌ Cannot initialize database: MongoDB connection failed: ${status.connectionError}`,
      )
      return {
        success: false,
        error: `MongoDB connection failed: ${status.connectionError}`,
        connectionStatus: "failed",
      }
    }
    if (!status.isConnected) {
      console.warn(
        "LIB/INIT-DB: initializeDatabase() - MongoDB not connected yet, but no specific error. Proceeding to await getMongoClientPromise.",
      )
    } else {
      console.log("LIB/INIT-DB: initializeDatabase() - ✅ MongoDB connection status is good.")
    }

    console.log("LIB/INIT-DB: initializeDatabase() - Awaiting getMongoClientPromise...")
    const client = await getMongoClientPromise()
    console.log("LIB/INIT-DB: initializeDatabase() - ✅ MongoDB client obtained. Initializing collections...")

    const db = client.db("Conversationstore") // Default DB name

    const collectionsToEnsure = [
      {
        name: "conversations",
        indexes: [
          { key: { userId: 1, conversationId: 1 }, options: { unique: true } },
          { key: { userId: 1, lastModified: -1 } },
          { key: { userId: 1, createdAt: -1 } },
          { key: { name: "text" } },
        ],
      },
      { name: "userCanvas", indexes: [{ key: { userId: 1 }, options: { unique: true } }] },
      {
        name: "canvasInteractions",
        indexes: [
          { key: { userId: 1, conversationId: 1, timestamp: -1 } },
          { key: { sessionId: 1 } },
          { key: { actionType: 1, timestamp: -1 } },
        ],
      },
      {
        name: "canvasSessions",
        indexes: [
          { key: { userId: 1, isActive: 1 } },
          { key: { userId: 1, conversationId: 1 } },
          { key: { lastActivity: -1 } },
        ],
      },
      {
        name: "userProfiles",
        indexes: [
          { key: { userId: 1 }, options: { unique: true } },
          { key: { email: 1 }, options: { unique: true } },
          { key: { lastLogin: -1 } },
        ],
      },
      {
        name: "conversationMetadata",
        indexes: [
          { key: { userId: 1, conversationId: 1 }, options: { unique: true } },
          { key: { userId: 1, "analytics.lastActivity": -1 } },
          { key: { tags: 1 } },
          { key: { isPublic: 1 } },
        ],
      },
      {
        name: "conversationBackups",
        indexes: [
          { key: { userId: 1, conversationId: 1, createdAt: -1 } },
          { key: { createdAt: 1 }, options: { expireAfterSeconds: 2592000 } }, // 30 days TTL
        ],
      },
    ]

    console.log("LIB/INIT-DB: initializeDatabase() - 🔄 Checking and creating collections and indexes...")
    const existingCollections = (await db.listCollections().toArray()).map((c) => c.name)

    for (const colInfo of collectionsToEnsure) {
      if (!existingCollections.includes(colInfo.name)) {
        console.log(`LIB/INIT-DB: initializeDatabase() - 📦 Collection '${colInfo.name}' not found. Creating...`)
        await db.createCollection(colInfo.name)
        console.log(`LIB/INIT-DB: initializeDatabase() - ✅ Collection '${colInfo.name}' created.`)
      } else {
        console.log(`LIB/INIT-DB: initializeDatabase() - ℹ️ Collection '${colInfo.name}' already exists.`)
      }
      if (colInfo.indexes && colInfo.indexes.length > 0) {
        console.log(`LIB/INIT-DB: initializeDatabase() - 🔄 Ensuring indexes for '${colInfo.name}'...`)
        await db.collection(colInfo.name).createIndexes(colInfo.indexes as any) // Type assertion if needed
        console.log(`LIB/INIT-DB: initializeDatabase() - ✅ Indexes ensured for '${colInfo.name}'.`)
      }
    }

    console.log("LIB/INIT-DB: initializeDatabase() - ✅ Database initialization completed successfully.")
    return {
      success: true,
      connectionStatus: "connected",
    }
  } catch (error: any) {
    console.error(
      "LIB/INIT-DB: initializeDatabase() - ❌ Error during database initialization:",
      error.message,
      error.stack,
    )
    return {
      success: false,
      error: error.message,
      connectionStatus: "error",
    }
  }
}

// Function to check database connection status (can be called from an API route)
export async function checkDatabaseConnection() {
  console.log("LIB/INIT-DB: checkDatabaseConnection() - Pinging database...")
  try {
    const client = await getMongoClientPromise()
    await client.db("admin").command({ ping: 1 })
    console.log("LIB/INIT-DB: checkDatabaseConnection() - ✅ Ping successful.")
    return {
      connected: true,
      message: "Database connection successful",
    }
  } catch (error: any) {
    console.error("LIB/INIT-DB: checkDatabaseConnection() - ❌ Ping failed:", error.message)
    return {
      connected: false,
      message: `Database connection failed: ${error.message}`,
    }
  }
}
