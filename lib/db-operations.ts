"use server"

import clientPromise from "@/lib/mongodb"
import { getUserSession } from "@/app/actions/auth"

// Interface for canvas data
interface CanvasData {
  userId: string
  conversations: any[]
  activeConversation: string
  nodes: any[]
  edges: any[]
  branchPoints: Record<string, string>
  connectionPoints: Record<string, { nodeId: string; type: string; direction: "incoming" | "outgoing" }>
  nodeNotes: Record<string, string>
  connectionEvents: any[]
  lastUpdated: Date
}

// Save canvas data to MongoDB
export async function saveCanvasData({
  conversations,
  activeConversation,
  nodes,
  edges,
  branchPoints,
  connectionPoints,
  nodeNotes,
  connectionEvents,
}: Omit<CanvasData, "userId" | "lastUpdated">) {
  try {
    const session = await getUserSession()
    if (!session || !session.user || !session.user.id) {
      console.error("No user session found")
      return { success: false, error: "Not authenticated" }
    }

    const userId = session.user.id

    const client = await clientPromise
    const db = client.db()
    const canvasCollection = db.collection("canvasData")

    // Check if user already has canvas data
    const existingData = await canvasCollection.findOne({ userId })

    const canvasData: CanvasData = {
      userId,
      conversations,
      activeConversation,
      nodes,
      edges,
      branchPoints,
      connectionPoints,
      nodeNotes,
      connectionEvents,
      lastUpdated: new Date(),
    }

    let result
    if (existingData) {
      // Update existing data
      result = await canvasCollection.updateOne({ userId }, { $set: canvasData })
    } else {
      // Insert new data
      result = await canvasCollection.insertOne(canvasData)
    }

    return { success: true, data: result }
  } catch (error) {
    console.error("Error saving canvas data:", error)
    return { success: false, error: "Failed to save canvas data" }
  }
}

// Get canvas data from MongoDB
export async function getCanvasData() {
  try {
    const session = await getUserSession()
    if (!session || !session.user || !session.user.id) {
      console.error("No user session found")
      return { success: false, error: "Not authenticated" }
    }

    const userId = session.user.id

    const client = await clientPromise
    const db = client.db()
    const canvasCollection = db.collection("canvasData")

    const canvasData = await canvasCollection.findOne({ userId })

    if (!canvasData) {
      return { success: false, error: "No canvas data found" }
    }

    return { success: true, data: canvasData }
  } catch (error) {
    console.error("Error getting canvas data:", error)
    return { success: false, error: "Failed to get canvas data" }
  }
}
