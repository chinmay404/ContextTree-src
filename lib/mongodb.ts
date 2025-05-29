"use server"

import { MongoClient } from "mongodb"

// Connection status for debugging
let isConnected = false
let connectionError: Error | null = null

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI environment variable is not defined")
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"')
}

const uri = process.env.MONGODB_URI
const options = {}

let client: MongoClient
let clientPromise: Promise<MongoClient>

// Create a new MongoClient
const createClient = () => {
  try {
    console.log("Creating new MongoDB client...")
    client = new MongoClient(uri, options)

    // Create a promise that resolves with the connected client
    const promise = client
      .connect()
      .then((client) => {
        console.log("✅ MongoDB connected successfully")
        isConnected = true
        connectionError = null
        return client
      })
      .catch((err) => {
        console.error("❌ MongoDB connection failed:", err)
        isConnected = false
        connectionError = err
        throw err
      })

    return promise
  } catch (err) {
    console.error("❌ Error creating MongoDB client:", err)
    throw err
  }
}

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    globalWithMongo._mongoClientPromise = createClient()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable.
  clientPromise = createClient()
}

// Export connection status functions
export const getConnectionStatus = () => ({
  isConnected,
  connectionError: connectionError ? connectionError.message : null,
})

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise
