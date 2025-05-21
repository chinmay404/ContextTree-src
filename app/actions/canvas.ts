"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"

// Server action to save canvas data
export async function saveCanvasData(canvasData: any) {
  try {
    // Get the user session
    const session = await getServerSession(authOptions)

    // Check if the user is authenticated
    if (!session?.user?.id) {
      return { error: "Unauthorized", status: 401 }
    }

    // Verify that the userId in the data matches the authenticated user
    if (canvasData.userId !== session.user.id) {
      return { error: "Unauthorized", status: 401 }
    }

    // Connect to MongoDB
    const client = await clientPromise
    const db = client.db()

    // Add a timestamp to the canvas data
    const dataToSave = {
      ...canvasData,
      updatedAt: new Date(),
    }

    // Upsert the canvas data (update if exists, insert if not)
    await db.collection("canvases").updateOne({ userId: canvasData.userId }, { $set: dataToSave }, { upsert: true })

    return { success: true }
  } catch (error) {
    console.error("Error saving canvas data:", error)
    return { error: "Internal server error", status: 500 }
  }
}

// Server action to load canvas data
export async function loadCanvasData(userId: string) {
  try {
    // Get the user session
    const session = await getServerSession(authOptions)

    // Check if the user is authenticated
    if (!session?.user?.id) {
      return { error: "Unauthorized", status: 401 }
    }

    // Verify that the requested userId matches the authenticated user
    if (userId !== session.user.id) {
      return { error: "Unauthorized", status: 401 }
    }

    // Connect to MongoDB
    const client = await clientPromise
    const db = client.db()

    // Find the canvas data for the user
    const canvasData = await db.collection("canvases").findOne({ userId })

    if (!canvasData) {
      return { error: "Canvas not found", status: 404 }
    }

    return { data: canvasData }
  } catch (error) {
    console.error("Error retrieving canvas data:", error)
    return { error: "Internal server error", status: 500 }
  }
}
