"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import clientPromise from "@/lib/mongodb"
import type { CanvasData, UserCanvasData } from "@/lib/models/canvas"
import { revalidatePath } from "next/cache"

// Save a conversation to MongoDB
export async function saveConversation(conversationData: any) {
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

    const canvasData: CanvasData = {
      userId,
      conversationId: conversationData.id,
      name: conversationData.name,
      nodes: conversationData.nodes,
      edges: conversationData.edges,
      lastModified: new Date(),
      createdAt: existingConversation ? existingConversation.createdAt : new Date(),
    }

    // Update or insert the conversation
    await conversationsCollection.updateOne(
      { userId, conversationId: conversationData.id },
      { $set: canvasData },
      { upsert: true },
    )

    // Update user's active conversation
    const userCanvasCollection = db.collection("userCanvas")
    await userCanvasCollection.updateOne(
      { userId },
      {
        $set: {
          userId,
          activeConversationId: conversationData.id,
          lastAccessed: new Date(),
        },
      },
      { upsert: true },
    )

    revalidatePath("/canvas")
    return { success: true }
  } catch (error) {
    console.error("Error saving conversation:", error)
    return { success: false, error: (error as Error).message }
  }
}

// Save all conversations to MongoDB
export async function saveAllConversations(conversations: any[]) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      throw new Error("Authentication required")
    }

    const userId = session.user.id || session.user.email

    const client = await clientPromise
    const db = client.db("Conversationstore")
    const conversationsCollection = db.collection("conversations")

    // Get existing conversations to preserve creation dates
    const existingConversations = await conversationsCollection.find({ userId }).toArray()

    const existingMap = new Map(existingConversations.map((conv) => [conv.conversationId, conv.createdAt]))

    // Prepare bulk operations
    const operations = conversations.map((conversation) => {
      const createdAt = existingMap.get(conversation.id) || new Date()

      return {
        updateOne: {
          filter: { userId, conversationId: conversation.id },
          update: {
            $set: {
              userId,
              conversationId: conversation.id,
              name: conversation.name,
              nodes: conversation.nodes,
              edges: conversation.edges,
              lastModified: new Date(),
              createdAt,
            },
          },
          upsert: true,
        },
      }
    })

    if (operations.length > 0) {
      await conversationsCollection.bulkWrite(operations)
    }

    revalidatePath("/canvas")
    return { success: true }
  } catch (error) {
    console.error("Error saving all conversations:", error)
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
    const userCanvas = (await userCanvasCollection.findOne({ userId })) as UserCanvasData | null

    return {
      success: true,
      conversations: conversations.map((conv) => ({
        id: conv.conversationId,
        name: conv.name,
        nodes: conv.nodes,
        edges: conv.edges,
        lastModified: conv.lastModified,
      })),
      activeConversationId: userCanvas?.activeConversationId,
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

    // If this was the active conversation, update the user's active conversation
    const userCanvasCollection = db.collection("userCanvas")
    const userCanvas = (await userCanvasCollection.findOne({ userId })) as UserCanvasData | null

    if (userCanvas && userCanvas.activeConversationId === conversationId) {
      // Find another conversation to set as active
      const anotherConversation = await conversationsCollection
        .find({ userId })
        .sort({ lastModified: -1 })
        .limit(1)
        .toArray()

      if (anotherConversation.length > 0) {
        await userCanvasCollection.updateOne(
          { userId },
          { $set: { activeConversationId: anotherConversation[0].conversationId } },
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
        },
      },
      { upsert: true },
    )

    revalidatePath("/canvas")
    return { success: true }
  } catch (error) {
    console.error("Error setting active conversation:", error)
    return { success: false, error: (error as Error).message }
  }
}
