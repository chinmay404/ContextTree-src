"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import clientPromise from "@/lib/mongodb"
import type { CanvasData, UserCanvasData, CanvasInteraction } from "@/lib/models/canvas"
import { revalidatePath } from "next/cache"
import { v4 as uuidv4 } from "uuid"
import { createCanvasSession, updateSessionActivity } from "@/lib/session-manager"

// Save a conversation to MongoDB with normalized schema
export async function saveConversation(conversationData: any, sessionId?: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      throw new Error("Authentication required")
    }

    // Use email as userId for all DB operations
    const userId = session.user.email
    const client = await clientPromise
    const db = client.db("Conversationstore")

    // --- 1. Upsert ChatThread ---
    // Find or create a chat thread for this conversation
    let chatThread = await db.collection("chatThreads").findOne({ userId, title: conversationData.name })
    let chatThreadId: any
    if (!chatThread) {
      const chatThreadDoc = {
        userId,
        title: conversationData.name,
        description: "",
        canvasId: null, // will set after canvas is created
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const result = await db.collection("chatThreads").insertOne(chatThreadDoc)
      chatThreadId = result.insertedId
      chatThread = { ...chatThreadDoc, _id: chatThreadId }
    } else {
      chatThreadId = chatThread._id
      await db.collection("chatThreads").updateOne(
        { _id: chatThreadId },
        { $set: { title: conversationData.name, updatedAt: new Date() } }
      )
    }

    // --- 2. Upsert Canvas ---
    let canvas = await db.collection("canvases").findOne({ chatThreadId })
    let canvasId: any
    if (!canvas) {
      const canvasDoc = {
        chatThreadId,
        name: conversationData.name,
        nodes: [],
        edges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      }
      const result = await db.collection("canvases").insertOne(canvasDoc)
      canvasId = result.insertedId
      canvas = { ...canvasDoc, _id: canvasId }
      // Update chatThread with canvasId
      await db.collection("chatThreads").updateOne({ _id: chatThreadId }, { $set: { canvasId } })
    } else {
      canvasId = canvas._id
      await db.collection("canvases").updateOne(
        { _id: canvasId },
        { $set: { name: conversationData.name, updatedAt: new Date(), version: (canvas.version || 1) + 1 } }
      )
    }

    // --- 3. Upsert Nodes ---
    const nodeIds: any[] = []
    for (const node of conversationData.nodes) {
      // Use node.id as a stable identifier if present
      let nodeDoc = await db.collection("nodes").findOne({ canvasId, "data.label": node.data.label })
      let nodeId: any
      if (!nodeDoc) {
        const nodeInsert = {
          canvasId,
          type: node.type,
          position: node.position,
          data: node.data,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        const result = await db.collection("nodes").insertOne(nodeInsert)
        nodeId = result.insertedId
        nodeDoc = { ...nodeInsert, _id: nodeId }
      } else {
        nodeId = nodeDoc._id
        await db.collection("nodes").updateOne(
          { _id: nodeId },
          { $set: { type: node.type, position: node.position, data: node.data, updatedAt: new Date() } }
        )
      }
      nodeIds.push(nodeId)

      // --- 4. Upsert Messages for this node ---
      if (node.data && node.data.messages && Array.isArray(node.data.messages)) {
        const messageIds: any[] = []
        for (const msg of node.data.messages) {
          // Try to find by content and timestamp
          let msgDoc = await db.collection("messages").findOne({ nodeId, content: msg.content, timestamp: msg.timestamp })
          let msgId: any
          if (!msgDoc) {
            const msgInsert = {
              nodeId,
              sender: msg.sender,
              content: msg.content,
              timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
            }
            const result = await db.collection("messages").insertOne(msgInsert)
            msgId = result.insertedId
          } else {
            msgId = msgDoc._id
          }
          messageIds.push(msgId)
        }
        // Update node with message ids
        await db.collection("nodes").updateOne({ _id: nodeId }, { $set: { messages: messageIds } })
      }
    }
    // Update canvas with node ids
    await db.collection("canvases").updateOne({ _id: canvasId }, { $set: { nodes: nodeIds, edges: conversationData.edges || [] } })

    // --- 5. Session and userCanvas logic (unchanged) ---
    if (!sessionId) {
      sessionId = await createCanvasSession(conversationData.id) || undefined
    } else {
      await updateSessionActivity(sessionId)
    }
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
    console.error("Error saving conversation:", error)
    return { success: false, error: (error as Error).message }
  }
}

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

// Save all conversations to MongoDB
export async function saveAllConversations(conversations: any[], sessionId?: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      throw new Error("Authentication required")
    }

    // Use email as userId for all DB operations
    const userId = session.user.email

    const client = await clientPromise
    const db = client.db("Conversationstore")
    const conversationsCollection = db.collection("conversations")

    // Get existing conversations to preserve creation dates and versions
    const existingConversations = await conversationsCollection.find({ userId }).toArray()

    const existingMap = new Map(
      existingConversations.map((conv) => [
        conv.conversationId,
        { createdAt: conv.createdAt, version: conv.version || 0 },
      ]),
    )

    // Prepare bulk operations
    const operations = conversations.map((conversation) => {
      const existing = existingMap.get(conversation.id)
      const createdAt = existing ? existing.createdAt : new Date()
      const version = existing ? existing.version + 1 : 1

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
              version,
            },
          },
          upsert: true,
        },
      }
    })

    if (operations.length > 0) {
      await conversationsCollection.bulkWrite(operations)
    }

    // If session ID is provided, update its activity
    if (sessionId) {
      await updateSessionActivity(sessionId)
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

    // Use email as userId for all DB operations
    const userId = session.user.email
    const userName = session.user.name || "User"
    const userAvatar = session.user.image || ""

    const client = await clientPromise
    const db = client.db("Conversationstore")
    const usersCollection = db.collection("users")
    const conversationsCollection = db.collection("conversations")
    const userCanvasCollection = db.collection("userCanvas")

    // Ensure user exists
    let user = await usersCollection.findOne({ userId })
    if (!user) {
      await usersCollection.insertOne({
        userId,
        name: userName,
        avatar: userAvatar,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    // Get all conversations for this user
    let conversations = await conversationsCollection.find({ userId }).sort({ lastModified: -1 }).toArray()

    // If no conversations, create a default one
    if (conversations.length === 0) {
      const { v4: uuidv4 } = await import("uuid")
      const defaultConversationId = uuidv4()
      const defaultConversation = {
        userId,
        conversationId: defaultConversationId,
        name: "New Context",
        nodes: [
          {
            id: uuidv4(),
            type: "mainNode",
            position: { x: 250, y: 100 },
            data: {
              label: "Start",
              messages: [
                { id: uuidv4(), sender: "ai", content: "Hello!", timestamp: Date.now() },
              ],
              isEditing: false,
              expanded: true,
              style: { width: 250 },
              model: "gpt-4",
              parents: [],
            },
          },
        ],
        edges: [],
        lastModified: new Date(),
        createdAt: new Date(),
        version: 1,
      }
      await conversationsCollection.insertOne(defaultConversation)
      conversations = [defaultConversation]
      // Set as active conversation in userCanvas
      await userCanvasCollection.updateOne(
        { userId },
        {
          $set: {
            userId,
            activeConversationId: defaultConversationId,
            lastAccessed: new Date(),
            sessionId: "",
          },
        },
        { upsert: true },
      )
    }

    // Get user's active conversation
    const userCanvas = (await userCanvasCollection.findOne({ userId })) as UserCanvasData | null

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
      activeConversationId: userCanvas?.activeConversationId || conversations[0].conversationId,
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

    // Use email as userId for all DB operations
    const userId = session.user.email

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
    const userCanvas = (await userCanvasCollection.findOne({ userId })) as UserCanvasData | null

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

    // Use email as userId for all DB operations
    const userId = session.user.email

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

    // Use email as userId for all DB operations
    const userId = session.user.email

    const client = await clientPromise
    const db = client.db("Conversationstore")
    const interactionsCollection = db.collection("canvasInteractions")

    const interaction: CanvasInteraction = {
      id: uuidv4(),
      userId,
      conversationId,
      actionType: actionType as any,
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

    // Use email as userId for all DB operations
    const userId = session.user.email

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
