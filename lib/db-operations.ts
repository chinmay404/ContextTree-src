"use server"

import clientPromise from "@/lib/mongodb"
import { getUserSessionId } from "@/lib/auth"

// Save canvas data to MongoDB
export async function saveCanvasData(canvasData: any) {
  try {
    const userId = getUserSessionId()
    if (!userId) {
      console.error("No user ID found")
      return { success: false, error: "User not authenticated" }
    }

    const client = await clientPromise
    const db = client.db("contextTree")
    const collection = db.collection("canvasData")

    // Update or insert canvas data for this user
    await collection.updateOne({ userId }, { $set: { userId, canvasData, updatedAt: new Date() } }, { upsert: true })

    return { success: true }
  } catch (error) {
    console.error("Error saving canvas data:", error)
    return { success: false, error: String(error) }
  }
}

// Load canvas data from MongoDB
export async function loadCanvasData() {
  try {
    const userId = getUserSessionId()
    if (!userId) {
      console.error("No user ID found")
      return { success: false, error: "User not authenticated" }
    }

    const client = await clientPromise
    const db = client.db("contextTree")
    const collection = db.collection("canvasData")

    const data = await collection.findOne({ userId })

    if (!data) {
      return { success: false, error: "No saved data found" }
    }

    return { success: true, data: data.canvasData }
  } catch (error) {
    console.error("Error loading canvas data:", error)
    return { success: false, error: String(error) }
  }
}
