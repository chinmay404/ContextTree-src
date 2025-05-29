import clientPromise from "@/lib/mongodb" // Ensure this path is correct
import type { MongoClient, Db } from "mongodb"

console.log("LIB/DB.TS: Module loaded.")

// Export the MongoDB client promise and a helper to get the DB instance
export const getMongoClient = async (): Promise<MongoClient> => {
  console.log("LIB/DB.TS: getMongoClient called. Awaiting clientPromise...")
  try {
    const client = await clientPromise
    console.log("LIB/DB.TS: getMongoClient - clientPromise resolved.")
    return client
  } catch (error) {
    console.error("LIB/DB.TS: getMongoClient - Error awaiting clientPromise:", error)
    throw error
  }
}

export const getDb = async (dbName: string = "Conversationstore"): Promise<Db> => {
  console.log(`LIB/DB.TS: getDb called for database: "${dbName}".`)
  try {
    const client = await getMongoClient()
    console.log(`LIB/DB.TS: getDb - MongoClient obtained. Returning db instance for "${dbName}".`)
    return client.db(dbName)
  } catch (error) {
    console.error(`LIB/DB.TS: getDb - Error obtaining MongoClient for "${dbName}":`, error)
    throw error
  }
}

// Re-exporting the db object structure you had for compatibility,
// but ensuring it uses the robust getDb/getMongoClient.
export const db = {
  getClient: getMongoClient,
  getDb: getDb,
  canvas: { // Example collection helper
    async findUnique({ where }: { where: any }) {
      console.log("LIB/DB.TS: db.canvas.findUnique called with where:", where)
      const database = await getDb()
      return database.collection("conversations").findOne(where)
    },
    async create({ data }: { data: any }) {
      console.log("LIB/DB.TS: db.canvas.create called with data:", data)
      const database = await getDb()
      const result = await database.collection("conversations").insertOne({
        ...data,
        createdAt: new Date(),
        lastModified: new Date(),
        nodes: data.nodes || [], // Ensure defaults
        edges: data.edges || [], // Ensure defaults
      })
      return { _id: result.insertedId, ...data } // Return _id as well
    },
    async update({ where, data }: { where: any; data: any }) {
      console.log("LIB/DB.TS: db.canvas.update called with where:", where, "data:", data)
      const database = await getDb()
      // Ensure $set is used for updates to avoid replacing the whole document unintentionally
      const updateResult = await database.collection("conversations").updateOne(where, { $set: { ...data, lastModified: new Date() } })
      console.log("LIB/DB.TS: db.canvas.update result:", updateResult)
      // Fetch and return the updated document to reflect changes
      return database.collection("conversations").findOne(where)
    },
    async delete({ where }: { where: any }) {
      console.log("LIB/DB.TS: db.canvas.delete called with where:", where)
      const database = await getDb()
      return database.collection("conversations").deleteOne(where)
    },
  },
  // Add other collection helpers here if needed (userProfiles, etc.)
  userProfiles: {
    async findOne({ where }: { where: any }) {
      const database = await getDb();
      return database.collection("userProfiles").findOne(where);
    },
    // ... other userProfiles methods
  },
  conversations: { // Alias for canvas or more specific conversation methods
     async findOne({ where }: { where: any }) {
      const database = await getDb();
      return database.collection("conversations").findOne(where);
    },
    async find({ where, options }: { where: any, options?: any }) {
      const database = await getDb();
      return database.collection("conversations").find(where, options).toArray();
    }
    // ... other conversation methods
  }
}
