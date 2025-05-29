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

    // List of parameters that commonly get duplicated
    const duplicateProneParams = ["w", "tls", "ssl", "authSource", "retryWrites", "readPreference", "maxPoolSize"]

    // Remove duplicates for each parameter
    duplicateProneParams.forEach((param) => {
      const values = params.getAll(param)
      if (values.length > 1) {
        params.delete(param)
        // Keep the last value or use a sensible default
        let finalValue = values[values.length - 1]

        // Apply defaults for specific parameters if needed
        switch (param) {
          case "w":
            finalValue = finalValue || "majority"
            break
          case "tls":
          case "ssl":
            finalValue = finalValue || "true"
            break
          case "retryWrites":
            finalValue = finalValue || "true"
            break
          case "readPreference":
            finalValue = finalValue || "primary"
            break
          case "maxPoolSize":
            finalValue = finalValue || "10"
            break
        }

        if (finalValue) {
          params.set(param, finalValue)
        }
      }
    })

    url.search = params.toString()
    return url.toString()
  } catch (error) {
    console.warn("Failed to parse MongoDB URI, attempting manual cleanup:", error)

    // Fallback: manual string replacement for common duplicates
    let cleanedUri = uri

    // Remove duplicate tls parameters
    cleanedUri = cleanedUri.replace(/([?&])tls=([^&]*)/g, (match, separator, value, offset, string) => {
      const beforeMatch = string.substring(0, offset)
      const tlsCount = (beforeMatch.match(/[?&]tls=/g) || []).length
      return tlsCount === 0 ? match : ""
    })

    // Remove duplicate w parameters
    cleanedUri = cleanedUri.replace(/([?&])w=([^&]*)/g, (match, separator, value, offset, string) => {
      const beforeMatch = string.substring(0, offset)
      const wCount = (beforeMatch.match(/[?&]w=/g) || []).length
      return wCount === 0 ? match : ""
    })

    // Clean up any double separators
    cleanedUri = cleanedUri.replace(/[?&]{2,}/g, "&").replace(/[?]&/, "?")

    return cleanedUri
  }
}

const uri = cleanMongoUri(process.env.MONGODB_URI)
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  // Don't set these in options if they're in the URI to avoid conflicts
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
    console.error("Cleaned URI (without credentials):", uri.replace(/\/\/[^@]*@/, "//***:***@"))
    throw error
  })

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default checkedClientPromise
