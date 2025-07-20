"use server";

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
  IndexSpecification,
} from "mongodb";
import getMongoClientPromise from "@/lib/mongodb";

console.log(
  "LIB/DB: Module loaded. (Marked as 'use server', exporting async functions)"
);

// Exported helper functions
export async function getConnectedClient(): Promise<MongoClient> {
  try {
    const client = await getMongoClientPromise();
    return client;
  } catch (error: any) {
    console.error(
      "LIB/DB: getConnectedClient() - ❌ Error resolving getMongoClientPromise:",
      error.message
    );
    throw new Error(`Failed to connect to MongoDB: ${error.message}`);
  }
}

export async function getDatabase(dbName = "Conversationstore"): Promise<Db> {
  const client = await getConnectedClient();
  return client.db(dbName);
}

// Define 'db' as an explicit async function that wraps getDatabase
// This ensures 'db' is clearly an async function defined in this module.
export const db = async (dbName?: string): Promise<Db> => {
  return getDatabase(dbName);
};

// Internal performOperation, not exported
async function performOperation<T extends Document, R>(
  collectionName: string,
  operationName: string, // For logging
  operation: (collection: Collection<T>) => Promise<R>,
  logParams: any = {} // Parameters to log
): Promise<R> {
  console.log(
    `LIB/DB: ${collectionName}.${operationName}() - Starting. Params: ${JSON.stringify(
      logParams
    )}`
  );
  try {
    const dbInstance = await getDatabase(); // Uses the exported getDatabase
    const collection = dbInstance.collection<T>(collectionName);
    const result = await operation(collection);
    console.log(`LIB/DB: ${collectionName}.${operationName}() - ✅ Success.`);
    return result;
  } catch (error: any) {
    console.error(
      `LIB/DB: ${collectionName}.${operationName}() - ❌ Error:`,
      error.message
    );
    throw error;
  }
}

// --- Collection Specific Functions ---

export async function createIndexes(
  collectionName: string,
  indexes: { key: IndexSpecification; name?: string; unique?: boolean }[]
): Promise<void> {
  console.log(
    `LIB/DB: createIndexes() for ${collectionName} - Starting. Indexes:`,
    JSON.stringify(indexes.map((idx) => idx.name || JSON.stringify(idx.key)))
  );
  try {
    const dbInstance = await getDatabase();
    const collection = dbInstance.collection(collectionName);
    for (const index of indexes) {
      await collection.createIndex(index.key, {
        name: index.name,
        unique: index.unique,
      });
      console.log(
        `LIB/DB: createIndexes() for ${collectionName} - ✅ Index created/ensured: ${
          index.name || JSON.stringify(index.key)
        }`
      );
    }
  } catch (error: any) {
    console.error(
      `LIB/DB: createIndexes() for ${collectionName} - ❌ Error:`,
      error.message
    );
    throw error;
  }
}

// --- Conversations Collection Functions ---
export async function findOneConversation(
  filter: Filter<any>
): Promise<any | null> {
  return performOperation(
    "conversations",
    "findOne",
    (col) => col.findOne(filter),
    { filter }
  );
}

export async function findConversations(
  filter: Filter<any>,
  options?: FindOptions<any>
): Promise<any[]> {
  return performOperation(
    "conversations",
    "find",
    (col) => col.find(filter, options).toArray(),
    { filter, options }
  );
}

export async function insertOneConversation(
  doc: OptionalUnlessRequiredId<any>
): Promise<InsertOneResult<any>> {
  const result = await performOperation(
    "conversations",
    "insertOne",
    (col) => col.insertOne(doc),
    {
      doc: { id: doc.conversationId, name: doc.name },
    }
  );
  console.log(
    "LIB/DB: conversations.insertOne() - InsertedId:",
    result.insertedId
  );
  return result;
}

export async function updateOneConversation(
  filter: Filter<any>,
  update: UpdateFilter<any> | Partial<any>
): Promise<UpdateResult> {
  const result = await performOperation(
    "conversations",
    "updateOne",
    (col) => col.updateOne(filter, update),
    {
      filter,
      update: update.$set ? "partial" : "full",
    }
  );
  console.log("LIB/DB: conversations.updateOne() - Result:", {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  });
  return result;
}

export async function upsertOneConversation(
  filter: Filter<any>,
  update: UpdateFilter<any> | Partial<any>
): Promise<UpdateResult> {
  const result = await performOperation(
    "conversations",
    "upsertOne",
    (col) => col.updateOne(filter, update, { upsert: true }),
    { filter, update: update.$set ? "partial" : "full" }
  );
  console.log("LIB/DB: conversations.upsertOne() - Result:", {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    upsertedId: result.upsertedId,
  });
  return result;
}

export async function deleteOneConversation(
  filter: Filter<any>
): Promise<DeleteResult> {
  const result = await performOperation(
    "conversations",
    "deleteOne",
    (col) => col.deleteOne(filter),
    { filter }
  );
  console.log(
    "LIB/DB: conversations.deleteOne() - DeletedCount:",
    result.deletedCount
  );
  return result;
}

// --- UserCanvas Collection Functions ---
export async function findOneUserCanvas(
  filter: Filter<any>
): Promise<any | null> {
  return performOperation(
    "userCanvas",
    "findOne",
    (col) => col.findOne(filter),
    { filter }
  );
}

export async function upsertOneUserCanvas(
  filter: Filter<any>,
  update: UpdateFilter<any> | Partial<any>
): Promise<UpdateResult> {
  const result = await performOperation(
    "userCanvas",
    "upsertOne",
    (col) => col.updateOne(filter, update, { upsert: true }),
    { filter, update }
  );
  console.log("LIB/DB: userCanvas.upsertOne() - Result:", {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    upsertedId: result.upsertedId,
  });
  return result;
}

// --- CanvasInteractions Collection Functions ---
export async function insertOneCanvasInteraction(
  doc: OptionalUnlessRequiredId<any>
): Promise<InsertOneResult<any>> {
  const result = await performOperation(
    "canvasInteractions",
    "insertOne",
    (col) => col.insertOne(doc),
    {
      doc: { actionType: doc.actionType, entityId: doc.entityId },
    }
  );
  console.log(
    "LIB/DB: canvasInteractions.insertOne() - InsertedId:",
    result.insertedId
  );
  return result;
}

export async function findCanvasInteractions(
  filter: Filter<any>,
  options?: FindOptions<any>
): Promise<any[]> {
  return performOperation(
    "canvasInteractions",
    "find",
    (col) => col.find(filter, options).toArray(),
    {
      filter,
      options,
    }
  );
}

export async function deleteManyCanvasInteractions(
  filter: Filter<any>
): Promise<DeleteResult> {
  const result = await performOperation(
    "canvasInteractions",
    "deleteMany",
    (col) => col.deleteMany(filter),
    { filter }
  );
  console.log(
    "LIB/DB: canvasInteractions.deleteMany() - DeletedCount:",
    result.deletedCount
  );
  return result;
}

// --- CanvasSessions Collection Functions ---
export async function insertOneCanvasSession(
  doc: OptionalUnlessRequiredId<any>
): Promise<InsertOneResult<any>> {
  const result = await performOperation(
    "canvasSessions",
    "insertOne",
    (col) => col.insertOne(doc),
    {
      doc: { sessionId: doc.sessionId },
    }
  );
  console.log(
    "LIB/DB: canvasSessions.insertOne() - InsertedId:",
    result.insertedId
  );
  return result;
}

export async function updateOneCanvasSession(
  filter: Filter<any>,
  update: UpdateFilter<any> | Partial<any>
): Promise<UpdateResult> {
  const result = await performOperation(
    "canvasSessions",
    "updateOne",
    (col) => col.updateOne(filter, update),
    {
      filter,
    }
  );
  console.log("LIB/DB: canvasSessions.updateOne() - Result:", {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  });
  return result;
}

export async function updateManyCanvasSessions(
  filter: Filter<any>,
  update: UpdateFilter<any> | Partial<any>
): Promise<UpdateResult> {
  const result = await performOperation(
    "canvasSessions",
    "updateMany",
    (col) => col.updateMany(filter, update),
    {
      filter,
    }
  );
  console.log("LIB/DB: canvasSessions.updateMany() - Result:", {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  });
  return result;
}

// --- UserProfiles Collection Functions ---
export async function findOneUserProfile(
  filter: Filter<any>
): Promise<any | null> {
  return performOperation(
    "userProfiles",
    "findOne",
    (col) => col.findOne(filter),
    { filter }
  );
}

export async function insertOneUserProfile(
  doc: OptionalUnlessRequiredId<any>
): Promise<InsertOneResult<any>> {
  const result = await performOperation(
    "userProfiles",
    "insertOne",
    (col) => col.insertOne(doc),
    {
      doc: { userId: doc.userId },
    }
  );
  console.log(
    "LIB/DB: userProfiles.insertOne() - InsertedId:",
    result.insertedId
  );
  return result;
}

export async function upsertOneUserProfile(
  filter: Filter<any>,
  update: UpdateFilter<any> | Partial<any>
): Promise<UpdateResult> {
  const result = await performOperation(
    "userProfiles",
    "upsertOne",
    (col) => col.updateOne(filter, update, { upsert: true }),
    { filter }
  );
  console.log("LIB/DB: userProfiles.upsertOne() - Result:", {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    upsertedId: result.upsertedId,
  });
  return result;
}

// --- ConversationThreads Collection Functions ---
export async function findConversationThreads(
  filter: Filter<any>,
  options?: FindOptions<any>
): Promise<any[]> {
  return performOperation(
    "conversationThreads",
    "find",
    (col) => col.find(filter, options).toArray(),
    { filter }
  );
}

export async function findOneConversationThread(
  filter: Filter<any>
): Promise<any | null> {
  return performOperation(
    "conversationThreads",
    "findOne",
    (col) => col.findOne(filter),
    { filter }
  );
}

export async function insertOneConversationThread(
  doc: OptionalUnlessRequiredId<any>
): Promise<InsertOneResult<any>> {
  const result = await performOperation(
    "conversationThreads",
    "insertOne",
    (col) => col.insertOne(doc),
    {
      doc: { threadId: doc.threadId },
    }
  );
  console.log(
    "LIB/DB: conversationThreads.insertOne() - InsertedId:",
    result.insertedId
  );
  return result;
}

export async function updateOneConversationThread(
  filter: Filter<any>,
  update: UpdateFilter<any> | Partial<any>
): Promise<UpdateResult> {
  const result = await performOperation(
    "conversationThreads",
    "updateOne",
    (col) => col.updateOne(filter, update),
    {
      filter,
    }
  );
  console.log("LIB/DB: conversationThreads.updateOne() - Result:", {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  });
  return result;
}

export async function deleteOneConversationThread(
  filter: Filter<any>
): Promise<DeleteResult> {
  const result = await performOperation(
    "conversationThreads",
    "deleteOne",
    (col) => col.deleteOne(filter),
    { filter }
  );
  console.log(
    "LIB/DB: conversationThreads.deleteOne() - DeletedCount:",
    result.deletedCount
  );
  return result;
}

// --- ThreadCheckpoints Collection Functions ---
export async function findThreadCheckpoints(
  filter: Filter<any>,
  options?: FindOptions<any>
): Promise<any[]> {
  return performOperation(
    "threadCheckpoints",
    "find",
    (col) => col.find(filter, options).toArray(),
    { filter }
  );
}

export async function findOneThreadCheckpoint(
  filter: Filter<any>
): Promise<any | null> {
  return performOperation(
    "threadCheckpoints",
    "findOne",
    (col) => col.findOne(filter),
    { filter }
  );
}

export async function insertOneThreadCheckpoint(
  doc: OptionalUnlessRequiredId<any>
): Promise<InsertOneResult<any>> {
  const result = await performOperation(
    "threadCheckpoints",
    "insertOne",
    (col) => col.insertOne(doc),
    {
      doc: { checkpointId: doc.checkpointId },
    }
  );
  console.log(
    "LIB/DB: threadCheckpoints.insertOne() - InsertedId:",
    result.insertedId
  );
  return result;
}

export async function updateOneThreadCheckpoint(
  filter: Filter<any>,
  update: UpdateFilter<any> | Partial<any>
): Promise<UpdateResult> {
  const result = await performOperation(
    "threadCheckpoints",
    "updateOne",
    (col) => col.updateOne(filter, update),
    {
      filter,
    }
  );
  console.log("LIB/DB: threadCheckpoints.updateOne() - Result:", {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  });
  return result;
}

export async function deleteOneThreadCheckpoint(
  filter: Filter<any>
): Promise<DeleteResult> {
  const result = await performOperation(
    "threadCheckpoints",
    "deleteOne",
    (col) => col.deleteOne(filter),
    { filter }
  );
  console.log(
    "LIB/DB: threadCheckpoints.deleteOne() - DeletedCount:",
    result.deletedCount
  );
  return result;
}

// --- ThreadNodes Collection Functions ---
export async function findThreadNodes(
  filter: Filter<any>,
  options?: FindOptions<any>
): Promise<any[]> {
  return performOperation(
    "threadNodes",
    "find",
    (col) => col.find(filter, options).toArray(),
    { filter }
  );
}

export async function findOneThreadNode(
  filter: Filter<any>
): Promise<any | null> {
  return performOperation(
    "threadNodes",
    "findOne",
    (col) => col.findOne(filter),
    { filter }
  );
}

export async function insertOneThreadNode(
  doc: OptionalUnlessRequiredId<any>
): Promise<InsertOneResult<any>> {
  const result = await performOperation(
    "threadNodes",
    "insertOne",
    (col) => col.insertOne(doc),
    {
      doc: { nodeId: doc.nodeId },
    }
  );
  console.log(
    "LIB/DB: threadNodes.insertOne() - InsertedId:",
    result.insertedId
  );
  return result;
}

export async function updateOneThreadNode(
  filter: Filter<any>,
  update: UpdateFilter<any> | Partial<any>
): Promise<UpdateResult> {
  const result = await performOperation(
    "threadNodes",
    "updateOne",
    (col) => col.updateOne(filter, update),
    {
      filter,
    }
  );
  console.log("LIB/DB: threadNodes.updateOne() - Result:", {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  });
  return result;
}

export async function deleteOneThreadNode(
  filter: Filter<any>
): Promise<DeleteResult> {
  const result = await performOperation(
    "threadNodes",
    "deleteOne",
    (col) => col.deleteOne(filter),
    { filter }
  );
  console.log(
    "LIB/DB: threadNodes.deleteOne() - DeletedCount:",
    result.deletedCount
  );
  return result;
}

export async function deleteManyThreadNodes(
  filter: Filter<any>
): Promise<DeleteResult> {
  const result = await performOperation(
    "threadNodes",
    "deleteMany",
    (col) => col.deleteMany(filter),
    { filter }
  );
  console.log(
    "LIB/DB: threadNodes.deleteMany() - DeletedCount:",
    result.deletedCount
  );
  return result;
}
