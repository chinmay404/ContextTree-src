"use server"

import { connectToDatabase } from "./mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import { revalidatePath } from "next/cache"

// Save user canvas data to the database
export async function saveUserCanvasData(canvasData: any) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      throw new Error("User not authenticated")
    }

    const userId = session.user.id
    const { db } = await connectToDatabase()

    // Update or insert the canvas data for this user
    await db.collection("userCanvasData").updateOne(
      { userId },
      {
        $set: {
          userId,
          canvasData,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    )

    revalidatePath("/canvas")
    return { success: true }
  } catch (error) {
    console.error("Failed to save canvas data:", error)
    return { success: false, error: (error as Error).message }
  }
}

// Load user canvas data from the database
export async function loadUserCanvasData() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      throw new Error("User not authenticated")
    }

    const userId = session.user.id
    const { db } = await connectToDatabase()

    // Find the canvas data for this user
    const userData = await db.collection("userCanvasData").findOne({ userId })

    if (!userData) {
      return { success: true, data: null }
    }

    return { success: true, data: userData.canvasData }
  } catch (error) {
    console.error("Failed to load canvas data:", error)
    return { success: false, error: (error as Error).message, data: null }
  }
}
