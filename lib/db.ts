"use server" // Explicitly mark as a server module

import type {
  MongoClient,
  Db,
  Collection,
  FindOptions,
  Filter,
  UpdateFilter,
  OptionalUnlessRequiredId,
  Document,
} from "mongodb"
import clientPromise from "@/lib/mongodb"

console.log("LIB/DB: Module loaded. (Marked as 'use server')")

async function getConnectedClient(): Promise<MongoClient> {
  console.log("LIB/DB: getConnectedClient() - Awaiting clientPromise...")
  try {
    const client = await clientPromise
    console.log("LIB/DB: getConnectedClient() - clientPromise resolved. MongoDB client obtained.")
    return client
  } catch (error: any) {
    console.error("LIB/DB: getConnectedClient() - ❌ Error resolving clientPromise:", error.message, error.stack)
    throw new Error(`Failed to connect to MongoDB: ${error.message}`)
  }
}

async function getDatabase(dbName = "Conversationstore"): Promise<Db> {
  console.log(`LIB/DB: getDatabase('${dbName}') - Getting database instance.`)
  const client = await getConnectedClient()
  return client.db(dbName)
}

// Generic helper for collection operations to reduce boilerplate and centralize logging
async function performOperation<T extends Document, R>(
  collectionName: string,
  operation: (collection: Collection<T>) => Promise<R>,
): Promise<R> {
  console.log(`LIB/DB: performOperation('${collectionName}') - Starting operation.`)
  try {
    const dbInstance = await getDatabase()
    const collection = dbInstance.collection<T>(collectionName)
    const result = await operation(collection)
    console.log(`LIB/DB: performOperation('${collectionName}') - ✅ Operation successful.`)
    return result
  } catch (error: any) {
    console.error(
      `LIB/DB: performOperation('${collectionName}') - ❌ Error during operation:`,
      error.message,
      error.stack,
    )
    throw error // Re-throw to be handled by the caller
  }
}

export const db = {
  // General client/db access if needed, though performOperation is preferred
  getClient: getConnectedClient,
  getDb: getDatabase,

  // Collection-specific helpers
  conversations: {
    async findOne(filter: Filter<any>): Promise<any | null> {
      console.log("LIB/DB: conversations.findOne() - Filter:", JSON.stringify(filter))
      return performOperation("conversations", (col) => col.findOne(filter))
    },
    async find(filter: Filter<any>, options?: FindOptions<any>): Promise<any[]> {
      console.log("LIB/DB: conversations.find() - Filter:", JSON.stringify(filter), "Options:", JSON.stringify(options))
      return performOperation("conversations", (col) => col.find(filter, options).toArray())
    },
    async insertOne(doc: OptionalUnlessRequiredId<any>): Promise<any> {
      console.log("LIB/DB: conversations.insertOne() - Document (summary):", { id: doc.conversationId, name: doc.name })
      return performOperation("conversations", async (col) => {
        const result = await col.insertOne(doc)
        console.log("LIB/DB: conversations.insertOne() - InsertedId:", result.insertedId)
        return { ...doc, _id: result.insertedId }
      })
    },
    async updateOne(filter: Filter<any>, update: UpdateFilter<any> | Partial<any>): Promise<any> {
      console.log(
        "LIB/DB: conversations.updateOne() - Filter:",
        JSON.stringify(filter),
        "Update (summary):",
        update.$set ? { name: (update.$set as any).name, version: (update.$set as any).version } : "Full update",
      )
      return performOperation("conversations", async (col) => {
        const result = await col.updateOne(filter, update)
        console.log("LIB/DB: conversations.updateOne() - Result:", {
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
          upsertedId: result.upsertedId,
        })
        return result
      })
    },
    async upsertOne(filter: Filter<any>, update: UpdateFilter<any> | Partial<any>): Promise<any> {
      console.log(
        "LIB/DB: conversations.upsertOne() - Filter:",
        JSON.stringify(filter),
        "Update (summary):",
        update.$set ? { name: (update.$set as any).name, version: (update.$set as any).version } : "Full update",
      )
      return performOperation("conversations", async (col) => {
        const result = await col.updateOne(filter, update, { upsert: true })
        console.log("LIB/DB: conversations.upsertOne() - Result:", {
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
          upsertedId: result.upsertedId,
        })
        return result
      })
    },
    async deleteOne(filter: Filter<any>): Promise<any> {
      console.log("LIB/DB: conversations.deleteOne() - Filter:", JSON.stringify(filter))
      return performOperation("conversations", (col) => col.deleteOne(filter))
    },
  },

  userCanvas: {
    // For managing user's active conversation, etc.
    async findOne(filter: Filter<any>): Promise<any | null> {
      console.log("LIB/DB: userCanvas.findOne() - Filter:", JSON.stringify(filter))
      return performOperation("userCanvas", (col) => col.findOne(filter))
    },
    async updateOne(filter: Filter<any>, update: UpdateFilter<any> | Partial<any>): Promise<any> {
      console.log("LIB/DB: userCanvas.updateOne() - Filter:", JSON.stringify(filter), "Update:", JSON.stringify(update))
      return performOperation("userCanvas", (col) => col.updateOne(filter, update, { upsert: true }))
    },
  },

  canvasInteractions: {
    async insertOne(doc: OptionalUnlessRequiredId<any>): Promise<any> {
      console.log("LIB/DB: canvasInteractions.insertOne() - ActionType:", doc.actionType, "EntityId:", doc.entityId)
      return performOperation("canvasInteractions", (col) => col.insertOne(doc))
    },
    async find(filter: Filter<any>, options?: FindOptions<any>): Promise<any[]> {
      console.log(
        "LIB/DB: canvasInteractions.find() - Filter:",
        JSON.stringify(filter),
        "Options:",
        JSON.stringify(options),
      )
      return performOperation("canvasInteractions", (col) => col.find(filter, options).toArray())
    },
    async deleteMany(filter: Filter<any>): Promise<any> {
      console.log("LIB/DB: canvasInteractions.deleteMany() - Filter:", JSON.stringify(filter))
      return performOperation("canvasInteractions", (col) => col.deleteMany(filter))
    },
  },

  canvasSessions: {
    async insertOne(doc: OptionalUnlessRequiredId<any>): Promise<any> {
      console.log("LIB/DB: canvasSessions.insertOne() - SessionId:", doc.sessionId)
      return performOperation("canvasSessions", (col) => col.insertOne(doc))
    },
    async updateOne(filter: Filter<any>, update: UpdateFilter<any> | Partial<any>): Promise<any> {
      console.log("LIB/DB: canvasSessions.updateOne() - Filter:", JSON.stringify(filter))
      return performOperation("canvasSessions", (col) => col.updateOne(filter, update))
    },
    async updateMany(filter: Filter<any>, update: UpdateFilter<any> | Partial<any>): Promise<any> {
      console.log("LIB/DB: canvasSessions.updateMany() - Filter:", JSON.stringify(filter))
      return performOperation("canvasSessions", (col) => col.updateMany(filter, update))
    },
  },

  userProfiles: {
    async findOne(filter: Filter<any>): Promise<any | null> {
      console.log("LIB/DB: userProfiles.findOne() - Filter:", JSON.stringify(filter))
      return performOperation("userProfiles", (col) => col.findOne(filter))
    },
    async insertOne(doc: OptionalUnlessRequiredId<any>): Promise<any> {
      console.log("LIB/DB: userProfiles.insertOne() - UserId:", doc.userId)
      return performOperation("userProfiles", (col) => col.insertOne(doc))
    },
    async updateOne(filter: Filter<any>, update: UpdateFilter<any> | Partial<any>): Promise<any> {
      console.log("LIB/DB: userProfiles.updateOne() - Filter:", JSON.stringify(filter))
      return performOperation("userProfiles", (col) => col.updateOne(filter, update, { upsert: true }))
    },
  },
}
