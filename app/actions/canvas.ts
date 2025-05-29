"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import clientPromise from "@/lib/mongodb"
import { revalidatePath } from "next/cache"
import { v4 as uuidv4 } from "uuid"

// Helper function to merge arrays by ID
function mergeArraysById(arr1: any[], arr2: any[]): any[] {
  const merged = [...arr1]
  const ids = new Set(arr1.map((item) => item.id))

  arr2.forEach((item) => {
    if (!ids.has(item.id)) {
      merged.push(item)
      ids.add(item.id)
    }
  })

  return merged
}

// Create a new canvas session
async function createCanvasSession(conversationId: string): Promise<string> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      throw new Error("Authentication required")
    }

    const userId = session.user.id || session.user.email
    const sessionId = uuidv4()

    const client = await clientPromise
    const db = client.db("Conversationstore")
    const sessionsCollection = db.collection("canvasSessions")

    await sessionsCollection.insertOne({
      sessionId,
      userId,
      conversationId,
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
    })

    return sessionId
  } catch (error) {
    console.error("Error creating canvas session:", error)
    return ""
  }
}

// Update session activity
async function updateSessionActivity(sessionId: string): Promise<boolean> {
  try {
    if (!sessionId) return false

    const client = await clientPromise
    const db = client.db("Conversationstore")
    const sessionsCollection = db.collection("canvasSessions")

    await sessionsCollection.updateOne({ sessionId, isActive: true }, { $set: { lastActivity: new Date() } })

    return true
  } catch (error) {
    console.error("Error updating session activity:", error)
    return false
  }
}

// Save a conversation to MongoDB with optimistic concurrency control
export async function saveConversation(conversationData: any, sessionId?: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      throw new Error("Authentication required")
    }

    const userId = session.user.id || session.user.email

    const client = await clientPromise
    const db = client.db("Conversationstore")
    const conversationsCollection = db.collection("conversations")

    // Check if conversation already exists
    const existingConversation = await conversationsCollection.findOne({
      userId,
      conversationId: conversationData.id,
    })

    // If session ID is not provided, create a new one
    if (!sessionId) {
      sessionId = await createCanvasSession(conversationData.id)
    } else {
      // Update session activity
      await updateSessionActivity(sessionId)
    }

    const canvasData = {
      userId,
      conversationId: conversationData.id,
      name: conversationData.name,
      nodes: conversationData.nodes,
      edges: conversationData.edges,
      lastModified: new Date(),
      createdAt: existingConversation ? existingConversation.createdAt : new Date(),
      version: existingConversation ? (existingConversation.version || 0) + 1 : 1,
    }

    // Use optimistic concurrency control to prevent conflicts
    const updateResult = await conversationsCollection.updateOne(
      {
        userId,
        conversationId: conversationData.id,
        ...(existingConversation ? { version: existingConversation.version || 0 } : {}),
      },
      { $set: canvasData },
      { upsert: true },
    )

    // If no document was modified and it wasn't an upsert, we have a conflict
    if (updateResult.modifiedCount === 0 && updateResult.upsertedCount === 0 && existingConversation) {
      // Handle conflict - fetch the latest version and merge changes
      const latestVersion = await conversationsCollection.findOne({
        userId,
        conversationId: conversationData.id,
      })

      if (latestVersion) {
        // Implement a simple merge strategy - keep both sets of nodes and edges
        // A more sophisticated merge would compare timestamps of individual nodes/edges
        const mergedNodes = mergeArraysById(latestVersion.nodes, conversationData.nodes)
        const mergedEdges = mergeArraysById(latestVersion.edges, conversationData.edges)

        canvasData.nodes = mergedNodes
        canvasData.edges = mergedEdges
        canvasData.version = latestVersion.version + 1

        await conversationsCollection.updateOne({ userId, conversationId: conversationData.id }, { $set: canvasData })
      }
    }

    // Update user's active conversation
    const userCanvasCollection = db.collection("userCanvas")
    await userCanvasCollection.updateOne(
      { userId },
      {
        $set: {
          userId,
          activeConversationId: conversationData.id,
          lastAccessed: new Date(),
          sessionId,
        },
      },
      { upsert: true },
    )

    revalidatePath("/canvas")
    return { success: true, sessionId }
  } catch (error) {
    // Enhanced error logging
    console.error("Error saving conversation (full details):", error)
    if (error instanceof Error) {
      console.error("Error stack:", error.stack)
      if ((error as any).digest) {
        console.error("Error digest:", (error as any).digest)
      }
    }
    return { success: false, error: (error as Error).message }
  }
}

// Get all conversations for the current user
export async function getUserConversations() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      throw new Error("Authentication required")
    }

    const userId = session.user.id || session.user.email

    const client = await clientPromise
    const db = client.db("Conversationstore")
    const conversationsCollection = db.collection("conversations")

    // Get all conversations for this user
    const conversations = await conversationsCollection.find({ userId }).sort({ lastModified: -1 }).toArray()

    // Get user's active conversation
    const userCanvasCollection = db.collection("userCanvas")
    const userCanvas = await userCanvasCollection.findOne({ userId })

    // Create a new session for the active conversation
    let sessionId = userCanvas?.sessionId
    if (userCanvas?.activeConversationId && (!sessionId || sessionId === "")) {
      sessionId = await createCanvasSession(userCanvas.activeConversationId)

      // Update the user canvas with the new session ID
      if (sessionId) {
        await userCanvasCollection.updateOne({ userId }, { $set: { sessionId } })
      }
    }

    return {
      success: true,
      conversations: conversations.map((conv) => ({
        id: conv.conversationId,
        name: conv.name,
        nodes: conv.nodes,
        edges: conv.edges,
        lastModified: conv.lastModified,
        version: conv.version || 1,
      })),
      activeConversationId: userCanvas?.activeConversationId,
      sessionId,
    }
  } catch (error) {
    console.error("Error getting user conversations:", error)
    return { success: false, error: (error as Error).message, conversations: [] }
  }
}

// Delete a conversation
export async function deleteConversation(conversationId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      throw new Error("Authentication required")
    }

    const userId = session.user.id || session.user.email

    const client = await clientPromise
    const db = client.db("Conversationstore")
    const conversationsCollection = db.collection("conversations")

    await conversationsCollection.deleteOne({ userId, conversationId })

    // Delete all interactions for this conversation
    const interactionsCollection = db.collection("canvasInteractions")
    await interactionsCollection.deleteMany({ userId, conversationId })

    // End all sessions for this conversation
    const sessionsCollection = db.collection("canvasSessions")
    await sessionsCollection.updateMany(
      { userId, conversationId, isActive: true },
      { $set: { isActive: false, lastActivity: new Date() } },
    )

    // If this was the active conversation, update the user's active conversation
    const userCanvasCollection = db.collection("userCanvas")
    const userCanvas = await userCanvasCollection.findOne({ userId })

    if (userCanvas && userCanvas.activeConversationId === conversationId) {
      // Find another conversation to set as active
      const anotherConversation = await conversationsCollection
        .find({ userId })
        .sort({ lastModified: -1 })
        .limit(1)
        .toArray()

      if (anotherConversation.length > 0) {
        const newSessionId = await createCanvasSession(anotherConversation[0].conversationId)

        await userCanvasCollection.updateOne(
          { userId },
          {
            $set: {
              activeConversationId: anotherConversation[0].conversationId,
              sessionId: newSessionId,
            },
          },
        )
      }
    }

    revalidatePath("/canvas")
    return { success: true }
  } catch (error) {
    console.error("Error deleting conversation:", error)
    return { success: false, error: (error as Error).message }
  }
}

// Set active conversation
export async function setActiveConversation(conversationId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      throw new Error("Authentication required")
    }

    const userId = session.user.id || session.user.email

    // Create a new session for this conversation
    const sessionId = await createCanvasSession(conversationId)

    const client = await clientPromise
    const db = client.db("Conversationstore")
    const userCanvasCollection = db.collection("userCanvas")

    await userCanvasCollection.updateOne(
      { userId },
      {
        $set: {
          userId,
          activeConversationId: conversationId,
          lastAccessed: new Date(),
          sessionId,
        },
      },
      { upsert: true },
    )

    revalidatePath("/canvas")
    return { success: true, sessionId }
  } catch (error) {
    console.error("Error setting active conversation:", error)
    return { success: false, error: (error as Error).message }
  }
}

// Track user interaction with the canvas
export async function trackInteraction(
  conversationId: string,
  actionType: string,
  entityId: string,
  metadata: any,
  sessionId: string,
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      throw new Error("Authentication required")
    }

    const userId = session.user.id || session.user.email

    const client = await clientPromise
    const db = client.db("Conversationstore")
    const interactionsCollection = db.collection("canvasInteractions")

    const interaction = {
      id: uuidv4(),
      userId,
      conversationId,
      actionType,
      entityId,
      timestamp: new Date(),
      metadata,
      sessionId,
    }

    await interactionsCollection.insertOne(interaction)

    // Update session activity
    await updateSessionActivity(sessionId)

    return { success: true }
  } catch (error) {
    console.error("Error tracking interaction:", error)
    return { success: false, error: (error as Error).message }
  }
}

// Get interaction history for a conversation
export async function getInteractionHistory(conversationId: string, limit = 100) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      throw new Error("Authentication required")
    }

    const userId = session.user.id || session.user.email

    const client = await clientPromise
    const db = client.db("Conversationstore")
    const interactionsCollection = db.collection("canvasInteractions")

    const interactions = await interactionsCollection
      .find({ userId, conversationId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray()

    return { success: true, interactions }
  } catch (error) {
    console.error("Error getting interaction history:", error)
    return { success: false, error: (error as Error).message, interactions: [] }
  }
}
