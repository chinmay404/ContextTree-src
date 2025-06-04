"use server"

import { v4 as uuidv4 } from "uuid"
import getMongoClientPromise from "@/lib/mongodb"
import type { CanvasSession } from "@/lib/models/canvas"
import { cookies } from "next/headers"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

interface SessionUserWithId {
  id?: string; // NextAuth session user might not always have an id, so make it optional
  email?: string | null;
}

// Create a new canvas session
export async function createCanvasSession(conversationId: string): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return null
    }

    const userId = (session.user as SessionUserWithId).id || session.user.email || ""

    // Generate a unique session ID
    const sessionId = uuidv4()

    // Get browser and device info from headers
    const userAgent = (await cookies()).get("user-agent")?.value || "Unknown"

    const client = await getMongoClientPromise()
    const db = client.db("Conversationstore")
    const sessionsCollection = db.collection("canvasSessions")

    // Mark any existing active sessions as inactive
    await sessionsCollection.updateMany(
      { userId, conversationId, isActive: true },
      { $set: { isActive: false, lastActivity: new Date() } },
    )

    // Create a new session
    const canvasSession: CanvasSession = {
      id: sessionId,
      userId,
      conversationId,
      startTime: new Date(),
      lastActivity: new Date(),
      deviceInfo: userAgent,
      isActive: true,
    }

    await sessionsCollection.insertOne(canvasSession)

    // Update the user's active session in userCanvas
    const userCanvasCollection = db.collection("userCanvas")
    await userCanvasCollection.updateOne({ userId }, { $set: { sessionId } }, { upsert: true })

    return sessionId
  } catch (error) {
    console.error("Error creating canvas session:", error)
    return null
  }
}

// Update session activity
export async function updateSessionActivity(sessionId: string): Promise<boolean> {
  try {
    const client = await getMongoClientPromise()
    const db = client.db("Conversationstore")
    const sessionsCollection = db.collection("canvasSessions")

    await sessionsCollection.updateOne({ id: sessionId }, { $set: { lastActivity: new Date() } })

    return true
  } catch (error) {
    console.error("Error updating session activity:", error)
    return false
  }
}

// End a canvas session
export async function endCanvasSession(sessionId: string): Promise<boolean> {
  try {
    const client = await getMongoClientPromise()
    const db = client.db("Conversationstore")
    const sessionsCollection = db.collection("canvasSessions")

    await sessionsCollection.updateOne({ id: sessionId }, { $set: { isActive: false, lastActivity: new Date() } })

    return true
  } catch (error) {
    console.error("Error ending canvas session:", error)
    return false
  }
}

// Get active sessions for a user
export async function getUserActiveSessions(): Promise<CanvasSession[]> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return []
    }

    const userId = (session.user as SessionUserWithId).id || session.user.email || ""

    const client = await getMongoClientPromise()
    const db = client.db("Conversationstore")
    const sessionsCollection = db.collection("canvasSessions")

    const activeSessions = await sessionsCollection
      .find({ userId, isActive: true })
      .sort({ lastActivity: -1 })
      .toArray()

    return activeSessions as unknown as CanvasSession[]
  } catch (error) {
    console.error("Error getting user active sessions:", error)
    return []
  }
}
