"use server"

import { MongoClient } from "mongodb"

// Connection status for debugging
let isConnected = false
let connectionError: Error | null = null

console.log("LIB/MONGODB: Module loaded.")

if (!process.env.MONGODB_URI) {
  console.error("LIB/MONGODB: FATAL ERROR - MONGODB_URI environment variable is not defined.")
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"')
}

// Log only a part of the URI for security, but confirm it's being read
console.log(
  "LIB/MONGODB: MONGODB_URI found (partially):",
  process.env.MONGODB_URI.substring(
    0,
    process.env.MONGODB_URI.indexOf("@") > 0 ? process.env.MONGODB_URI.indexOf("@") : 30,
  ),
)

const uri ="mongodb+srv://chinmaypisal:Sirius17188@contexttree.4g4brxh.mongodb.net/?retryWrites=true&w=majority&appName=ContextTree"
const options = {} // Add any specific MongoClient options here if needed

let client: MongoClient
let clientPromise: Promise<MongoClient>

const createClient = (): Promise<MongoClient> => {
  try {
    console.log("LIB/MONGODB: createClient() - Attempting to create new MongoDB client...")
    client = new MongoClient(uri, options)

    console.log("LIB/MONGODB: createClient() - Calling client.connect()...")
    const promise = client
      .connect()
      .then((connectedClient) => {
        console.log("LIB/MONGODB: createClient() - ✅ MongoDB connected successfully!")
        isConnected = true
        connectionError = null
        return connectedClient
      })
      .catch((err) => {
        console.error("LIB/MONGODB: createClient() - ❌ MongoDB connection failed:", err.message, err.stack)
        isConnected = false
        connectionError = err
        // Propagate the error so it can be caught by callers
        throw err
      })

    return promise
  } catch (err: any) {
    console.error("LIB/MONGODB: createClient() - ❌ Error creating MongoDB client instance:", err.message, err.stack)
    // Propagate the error
    throw err
  }
}

if (process.env.NODE_ENV === "development") {
  console.log("LIB/MONGODB: Development mode - managing clientPromise globally.")
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    console.log("LIB/MONGODB: No existing global clientPromise found, creating new one.")
    globalWithMongo._mongoClientPromise = createClient()
  } else {
    console.log("LIB/MONGODB: Reusing existing global clientPromise.")
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  console.log("LIB/MONGODB: Production mode - creating new clientPromise.")
  clientPromise = createClient()
}

// Export connection status function (must be async due to "use server")
export async function getConnectionStatus() {
  console.log("LIB/MONGODB: getConnectionStatus() called.")
  return {
    isConnected,
    connectionError: connectionError ? connectionError.message : null,
  }
}

// Export a module-scoped MongoClient promise through an async function.
export default async function getMongoClientPromise(): Promise<MongoClient> {
  return clientPromise
}
