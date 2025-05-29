"use server"

import { MongoClient } from "mongodb"

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"')
}

// Clean the URI to remove duplicate parameters
function cleanMongoUri(uri: string): string {
  try {
    const url = new URL(uri)
    const params = new URLSearchParams(url.search)

    // Remove duplicate 'w' parameters if they exist
    const wValues = params.getAll("w")
    if (wValues.length > 1) {
      params.delete("w")
      // Keep the last 'w' value or default to 'majority'
      params.set("w", wValues[wValues.length - 1] || "majority")
    }

    url.search = params.toString()
    return url.toString()
  } catch (error) {
    console.warn("Failed to parse MongoDB URI, using as-is:", error)
    return uri
  }
}

const uri = cleanMongoUri(process.env.MONGODB_URI)
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options)
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

// Add a runtime check to ensure the resolved value is a MongoClient
const checkedClientPromise: Promise<MongoClient> = clientPromise
  .then((resolved) => {
    if (typeof resolved?.db !== "function") {
      throw new Error(
        "MongoDB clientPromise did not resolve to a MongoClient instance. Check your MongoDB URI and client initialization.",
      )
    }
    return resolved
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error)
    throw error
  })

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default checkedClientPromise
