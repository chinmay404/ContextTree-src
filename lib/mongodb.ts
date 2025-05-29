"use server"

import { MongoClient } from "mongodb"

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"')
}

if (!process.env.MONGODB_DB) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_DB"')
}

// Comprehensive URI cleaning function
function cleanMongoUri(uri: string): string {
  try {
    const url = new URL(uri)
    const originalParams = url.search

    // Get all parameter names that appear in the URI
    const allParams = new URLSearchParams(url.search)
    const paramNames = Array.from(allParams.keys())

    // Create a new URLSearchParams to rebuild clean parameters
    const cleanParams = new URLSearchParams()

    // For each unique parameter name, keep only the last value
    paramNames.forEach((paramName) => {
      const values = allParams.getAll(paramName)
      if (values.length > 0) {
        // Always use the last value to avoid duplicates
        cleanParams.set(paramName, values[values.length - 1])
      }
    })

    url.search = cleanParams.toString()
    const cleanedUri = url.toString()

    // Log the cleaning process (without credentials) for debugging
    if (originalParams !== cleanParams.toString()) {
      console.log("MongoDB URI cleaned - removed duplicate parameters")
    }

    return cleanedUri
  } catch (error) {
    console.warn("Failed to parse MongoDB URI with URL constructor, attempting manual cleanup:", error)

    // More robust fallback: split by ? and & then rebuild
    try {
      const [baseUri, queryString] = uri.split("?")
      if (!queryString) return uri

      const params = queryString.split("&")
      const paramMap = new Map<string, string>()

      // Process each parameter
      params.forEach((param) => {
        const [key, value] = param.split("=")
        if (key && value !== undefined) {
          // Always keep the last occurrence of each parameter
          paramMap.set(key, value)
        }
      })

      // Rebuild the query string
      const cleanQueryString = Array.from(paramMap.entries())
        .map(([key, value]) => `${key}=${value}`)
        .join("&")

      return cleanQueryString ? `${baseUri}?${cleanQueryString}` : baseUri
    } catch (fallbackError) {
      console.error("Manual URI cleanup also failed:", fallbackError)
      return uri // Return original URI as last resort
    }
  }
}

const uri = cleanMongoUri(process.env.MONGODB_URI)
const dbName = process.env.MONGODB_DB

// Minimal options to avoid conflicts with URI parameters
const options = {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
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
    console.log("MongoDB connection established successfully")
    return resolved
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error)
    throw error
  })

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default checkedClientPromise

// Export database connection helper
export async function getDatabase() {
  const client = await checkedClientPromise
  return client.db(dbName)
}
