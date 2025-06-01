"use server"

import type {
  MongoClient,
  Db,
  Collection,
  FindOptions,
  Filter,
  UpdateFilter,
  OptionalUnlessRequiredId,
  Document,
  UpdateResult,
  DeleteResult,
  InsertOneResult,
} from "mongodb"
import clientPromise from "@/lib/mongodb"

console.log("LIB/DB: Module loaded. (Marked as 'use server', exporting async functions)")

// Internal helper functions (not exported directly if not needed by other server modules)
async function getConnectedClient(): Promise<MongoClient> {
  // console.log("LIB/DB: getConnectedClient() - Awaiting clientPromise...")
  try {
    const client = await clientPromise
    // console.log("LIB/DB: getConnectedClient() - clientPromise resolved.")
    return client
  } catch (error: any) {
    console.error("LIB/DB: getConnectedClient() - ❌ Error resolving clientPromise:", error.message)
    throw new Error(`Failed to connect to MongoDB: ${error.message}`)
  }
}

async function getDatabase(dbName = "Conversationstore"): Promise<Db> {
  // console.log(`LIB/DB: getDatabase('${dbName}') - Getting database instance.`)
  const client = await getConnectedClient()
  return client.db(dbName)
}

async function performOperation<T extends Document, R>(
  collectionName: string,
  operationName: string, // For logging
  operation: (collection: Collection<T>) => Promise<R>,
  logParams: any = {}, // Parameters to log
): Promise<R> {
  console.log(`LIB/DB: ${collectionName}.${operationName}() - Starting. Params: ${JSON.stringify(logParams)}`)
  try {
    const dbInstance = await getDatabase()
    const collection = dbInstance.collection<T>(collectionName)
    const result = await operation(collection)
    console.log(`LIB/DB: ${collectionName}.${operationName}() - ✅ Success.`)
    return result
  } catch (error: any) {
    console.error(
      `LIB/DB: ${collectionName}.${operationName}() - ❌ Error:`,
      error.message,
      // error.stack // Optional: for more detailed stack trace
    )
    throw error
  }
}

// --- Conversations Collection Functions ---
export async function findOneConversation(filter: Filter<any>): Promise<any | null> {
  return performOperation("conversations", "findOne", (col) => col.findOne(filter), { filter })
}

export async function findConversations(filter: Filter<any>, options?: FindOptions<any>): Promise<any[]> {
  return performOperation("conversations", "find", (col) => col.find(filter, options).toArray(), { filter, options })
}

export async function insertOneConversation(doc: OptionalUnlessRequiredId<any>): Promise<InsertOneResult<any>> {
  const result = await performOperation(
    "conversations",
    "insertOne",
    (col) => col.insertOne(doc),
    { doc: { id: doc.conversationId, name: doc.name } }, // Log summary
  )
  // The performOperation itself doesn't know about constructing { ...doc, _id: result.insertedId }
  // The raw InsertOneResult is returned. Callers might need to adjust.
  // Or, adjust performOperation to allow transforming result, but that adds complexity.
  // For now, returning raw result.
  console.log("LIB/DB: conversations.insertOne() - InsertedId:", result.insertedId)
  return result
}

export async function updateOneConversation(
  filter: Filter<any>,
  update: UpdateFilter<any> | Partial<any>,
): Promise<UpdateResult> {
  const result = await performOperation("conversations", "updateOne", (col) => col.updateOne(filter, update), {
    filter,
    update: update.$set ? "partial" : "full",
  })
  console.log("LIB/DB: conversations.updateOne() - Result:", {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  })
  return result
}

export async function upsertOneConversation(
  filter: Filter<any>,
  update: UpdateFilter<any> | Partial<any>,
): Promise<UpdateResult> {
  const result = await performOperation(
    "conversations",
    "upsertOne",
    (col) => col.updateOne(filter, update, { upsert: true }),
    { filter, update: update.$set ? "partial" : "full" },
  )
  console.log("LIB/DB: conversations.upsertOne() - Result:", {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    upsertedId: result.upsertedId,
  })
  return result
}

export async function deleteOneConversation(filter: Filter<any>): Promise<DeleteResult> {
  const result = await performOperation("conversations", "deleteOne", (col) => col.deleteOne(filter), { filter })
  console.log("LIB/DB: conversations.deleteOne() - DeletedCount:", result.deletedCount)
  return result
}

// --- UserCanvas Collection Functions ---
export async function findOneUserCanvas(filter: Filter<any>): Promise<any | null> {
  return performOperation("userCanvas", "findOne", (col) => col.findOne(filter), { filter })
}

export async function upsertOneUserCanvas(
  filter: Filter<any>,
  update: UpdateFilter<any> | Partial<any>,
): Promise<UpdateResult> {
  const result = await performOperation(
    "userCanvas",
    "upsertOne",
    (col) => col.updateOne(filter, update, { upsert: true }),
    { filter, update },
  )
  console.log("LIB/DB: userCanvas.upsertOne() - Result:", {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    upsertedId: result.upsertedId,
  })
  return result
}

// --- CanvasInteractions Collection Functions ---
export async function insertOneCanvasInteraction(doc: OptionalUnlessRequiredId<any>): Promise<InsertOneResult<any>> {
  const result = await performOperation("canvasInteractions", "insertOne", (col) => col.insertOne(doc), {
    doc: { actionType: doc.actionType, entityId: doc.entityId },
  })
  console.log("LIB/DB: canvasInteractions.insertOne() - InsertedId:", result.insertedId)
  return result
}

export async function findCanvasInteractions(filter: Filter<any>, options?: FindOptions<any>): Promise<any[]> {
  return performOperation("canvasInteractions", "find", (col) => col.find(filter, options).toArray(), {
    filter,
    options,
  })
}

export async function deleteManyCanvasInteractions(filter: Filter<any>): Promise<DeleteResult> {
  const result = await performOperation("canvasInteractions", "deleteMany", (col) => col.deleteMany(filter), { filter })
  console.log("LIB/DB: canvasInteractions.deleteMany() - DeletedCount:", result.deletedCount)
  return result
}

// --- CanvasSessions Collection Functions ---
export async function insertOneCanvasSession(doc: OptionalUnlessRequiredId<any>): Promise<InsertOneResult<any>> {
  const result = await performOperation("canvasSessions", "insertOne", (col) => col.insertOne(doc), {
    doc: { sessionId: doc.sessionId },
  })
  console.log("LIB/DB: canvasSessions.insertOne() - InsertedId:", result.insertedId)
  return result
}

export async function updateOneCanvasSession(
  filter: Filter<any>,
  update: UpdateFilter<any> | Partial<any>,
): Promise<UpdateResult> {
  const result = await performOperation("canvasSessions", "updateOne", (col) => col.updateOne(filter, update), {
    filter,
  })
  console.log("LIB/DB: canvasSessions.updateOne() - Result:", {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  })
  return result
}

export async function updateManyCanvasSessions(
  filter: Filter<any>,
  update: UpdateFilter<any> | Partial<any>,
): Promise<UpdateResult> {
  const result = await performOperation("canvasSessions", "updateMany", (col) => col.updateMany(filter, update), {
    filter,
  })
  console.log("LIB/DB: canvasSessions.updateMany() - Result:", {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  })
  return result
}

// --- UserProfiles Collection Functions ---
export async function findOneUserProfile(filter: Filter<any>): Promise<any | null> {
  return performOperation("userProfiles", "findOne", (col) => col.findOne(filter), { filter })
}

export async function insertOneUserProfile(doc: OptionalUnlessRequiredId<any>): Promise<InsertOneResult<any>> {
  const result = await performOperation("userProfiles", "insertOne", (col) => col.insertOne(doc), {
    doc: { userId: doc.userId },
  })
  console.log("LIB/DB: userProfiles.insertOne() - InsertedId:", result.insertedId)
  return result
}

export async function upsertOneUserProfile(
  // Changed from updateOne to upsertOne for consistency
  filter: Filter<any>,
  update: UpdateFilter<any> | Partial<any>,
): Promise<UpdateResult> {
  const result = await performOperation(
    "userProfiles",
    "upsertOne", // Changed name
    (col) => col.updateOne(filter, update, { upsert: true }),
    { filter },
  )
  console.log("LIB/DB: userProfiles.upsertOne() - Result:", {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    upsertedId: result.upsertedId,
  })
  return result
}
