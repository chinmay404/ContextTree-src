"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route" // Ensure this path is correct
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { v4 as uuidv4 } from "uuid"

// console.log("ACTION/CANVAS: Module loaded.") // Keep or remove logging as preferred

// Helper function (internal, not exported, not necessarily async)
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

// Internal async helper
async function createCanvasSession(conversationId: string, userId: string): Promise<string> {
  // console.log(`ACTION/CANVAS: createCanvasSession() - ConversationId: ${conversationId}, UserId: ${userId}`)
  const sessionId = uuidv4()
  try {
    await db.canvasSessions.insertOne({
      sessionId,
      userId,
      conversationId,
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
    })
    // console.log(`ACTION/CANVAS: createCanvasSession() - ✅ Session created: ${sessionId}`)
    return sessionId
  } catch (error: any) {
    console.error("ACTION/CANVAS: createCanvasSession() - ❌ Error:", error.message)
    // Depending on desired error handling, you might want to throw the error
    // or return a specific value indicating failure. For now, returning empty string.
    return ""
  }
}

// Internal async helper
async function updateSessionActivity(sessionId: string): Promise<boolean> {
  // console.log(`ACTION/CANVAS: updateSessionActivity() - SessionId: ${sessionId}`)
  if (!sessionId) return false
  try {
    await db.canvasSessions.updateOne({ sessionId, isActive: true }, { $set: { lastActivity: new Date() } })
    // console.log(`ACTION/CANVAS: updateSessionActivity() - ✅ Activity updated for session: ${sessionId}`)
    return true
  } catch (error: any) {
    console.error("ACTION/CANVAS: updateSessionActivity() - ❌ Error:", error.message)
    return false
  }
}

export async function saveConversation(conversationData: any, sessionId?: string) {
  // console.log("ACTION/CANVAS: saveConversation() - ConversationId:", conversationData.id, "SessionId:", sessionId)
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      // console.warn("ACTION/CANVAS: saveConversation() - Authentication required.")
      throw new Error("Authentication required")
    }
    const userId = session.user.id || session.user.email! // Ensure user.id or user.email exists
    // console.log("ACTION/CANVAS: saveConversation() - User:", userId)

    const existingConversation = await db.conversations.findOne({
      userId,
      conversationId: conversationData.id,
    })
    // console.log("ACTION/CANVAS: saveConversation() - Existing conversation found:", !!existingConversation)

    let currentSessionId = sessionId
    if (!currentSessionId) {
      // console.log("ACTION/CANVAS: saveConversation() - No sessionId provided, creating new one.")
      currentSessionId = await createCanvasSession(conversationData.id, userId)
    } else {
      await updateSessionActivity(currentSessionId)
    }

    const canvasData: any = {
      userId,
      conversationId: conversationData.id,
      name: conversationData.name,
      nodes: conversationData.nodes,
      edges: conversationData.edges,
      lastModified: new Date(),
      createdAt: existingConversation ? existingConversation.createdAt : new Date(),
      version: existingConversation ? (existingConversation.version || 0) + 1 : 1,
    }

    // console.log("ACTION/CANVAS: saveConversation() - Attempting to upsert conversation. Version:", canvasData.version)
    const updateResult = await db.conversations.upsertOne(
      { userId, conversationId: conversationData.id, version: canvasData.version - 1 },
      { $set: canvasData },
    )

    if (updateResult.matchedCount === 0 && !updateResult.upsertedId && existingConversation) {
      // console.warn("ACTION/CANVAS: saveConversation() - Optimistic lock conflict. Current:", existingConversation.version, "Attempted:", canvasData.version - 1)
      const latestVersion = await db.conversations.findOne({ userId, conversationId: conversationData.id })
      if (latestVersion) {
        // console.log("ACTION/CANVAS: saveConversation() - Merging with latest version:", latestVersion.version)
        canvasData.nodes = mergeArraysById(latestVersion.nodes, conversationData.nodes)
        canvasData.edges = mergeArraysById(latestVersion.edges, conversationData.edges)
        canvasData.version = latestVersion.version + 1
        // console.log("ACTION/CANVAS: saveConversation() - Retrying upsert. New version:", canvasData.version)
        await db.conversations.upsertOne(
          { userId, conversationId: conversationData.id, version: latestVersion.version },
          { $set: canvasData },
        )
      } else {
        // console.error("ACTION/CANVAS: saveConversation() - ❌ Conflict but latest version not found.")
        canvasData.version = (existingConversation.version || 0) + 2 // Ensure higher version
        await db.conversations.upsertOne({ userId, conversationId: conversationData.id }, { $set: canvasData })
      }
    } else if (updateResult.upsertedId) {
      // console.log("ACTION/CANVAS: saveConversation() - ✅ Conversation upserted with new ID:", updateResult.upsertedId)
    } else {
      // console.log("ACTION/CANVAS: saveConversation() - ✅ Conversation updated. Matched:", updateResult.matchedCount, "Modified:", updateResult.modifiedCount)
    }

    // console.log("ACTION/CANVAS: saveConversation() - Updating userCanvas for active conversation.")
    await db.userCanvas.updateOne(
      { userId },
      {
        $set: {
          userId,
          activeConversationId: conversationData.id,
          lastAccessed: new Date(),
          sessionId: currentSessionId,
        },
      },
      { upsert: true }, // Ensure userCanvas document is created if it doesn't exist
    )

    revalidatePath("/canvas")
    // console.log("ACTION/CANVAS: saveConversation() - ✅ Successfully saved. SessionId:", currentSessionId)
    return { success: true, sessionId: currentSessionId }
  } catch (error: any) {
    console.error("ACTION/CANVAS: saveConversation() - ❌ Error:", error.message, error.stack)
    return { success: false, error: error.message }
  }
}

export async function getUserConversations() {
  // console.log("ACTION/CANVAS: getUserConversations() called.")
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      // console.warn("ACTION/CANVAS: getUserConversations() - Authentication required.")
      throw new Error("Authentication required")
    }
    const userId = session.user.id || session.user.email!
    // console.log("ACTION/CANVAS: getUserConversations() - User:", userId)

    const conversationsFromDb = await db.conversations.find({ userId }, { sort: { lastModified: -1 } })
    const userCanvas = await db.userCanvas.findOne({ userId })
    let currentSessionId = userCanvas?.sessionId

    if (userCanvas?.activeConversationId && (!currentSessionId || currentSessionId === "")) {
      // console.log("ACTION/CANVAS: getUserConversations() - No active session, creating new one.")
      currentSessionId = await createCanvasSession(userCanvas.activeConversationId, userId)
      if (currentSessionId) {
        await db.userCanvas.updateOne({ userId }, { $set: { sessionId: currentSessionId } }, { upsert: true })
      }
    }
    // console.log("ACTION/CANVAS: getUserConversations() - ✅ Found conversations:", conversationsFromDb.length)
    return {
      success: true,
      conversations: conversationsFromDb.map((conv: any) => ({
        id: conv.conversationId,
        name: conv.name,
        nodes: conv.nodes,
        edges: conv.edges,
        lastModified: conv.lastModified,
        version: conv.version || 1,
      })),
      activeConversationId: userCanvas?.activeConversationId,
      sessionId: currentSessionId,
    }
  } catch (error: any) {
    console.error("ACTION/CANVAS: getUserConversations() - ❌ Error:", error.message, error.stack)
    return { success: false, error: error.message, conversations: [] }
  }
}

export async function deleteConversation(conversationId: string) {
  // console.log("ACTION/CANVAS: deleteConversation() - ConversationId:", conversationId)
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      // console.warn("ACTION/CANVAS: deleteConversation() - Authentication required.")
      throw new Error("Authentication required")
    }
    const userId = session.user.id || session.user.email!
    // console.log("ACTION/CANVAS: deleteConversation() - User:", userId)

    await db.conversations.deleteOne({ userId, conversationId })
    await db.canvasInteractions.deleteMany({ userId, conversationId })
    await db.canvasSessions.updateMany(
      { userId, conversationId, isActive: true },
      { $set: { isActive: false, lastActivity: new Date() } },
    )

    const userCanvas = await db.userCanvas.findOne({ userId })
    if (userCanvas && userCanvas.activeConversationId === conversationId) {
      // console.log("ACTION/CANVAS: deleteConversation() - Deleted conversation was active.")
      const otherConversations = await db.conversations.find({ userId }, { sort: { lastModified: -1 }, limit: 1 })
      if (otherConversations.length > 0) {
        const newActiveConv = otherConversations[0]
        // console.log("ACTION/CANVAS: deleteConversation() - Setting new active:", newActiveConv.conversationId)
        const newSessionId = await createCanvasSession(newActiveConv.conversationId, userId)
        await db.userCanvas.updateOne(
          { userId },
          { $set: { activeConversationId: newActiveConv.conversationId, sessionId: newSessionId } },
        )
      } else {
        // console.log("ACTION/CANVAS: deleteConversation() - No other conversations. Clearing active info.")
        await db.userCanvas.updateOne({ userId }, { $set: { activeConversationId: null, sessionId: null } })
      }
    }
    revalidatePath("/canvas")
    // console.log("ACTION/CANVAS: deleteConversation() - ✅ Conversation deleted successfully.")
    return { success: true }
  } catch (error: any) {
    console.error("ACTION/CANVAS: deleteConversation() - ❌ Error:", error.message, error.stack)
    return { success: false, error: error.message }
  }
}

export async function setActiveConversation(conversationId: string) {
  // console.log("ACTION/CANVAS: setActiveConversation() - ConversationId:", conversationId)
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      // console.warn("ACTION/CANVAS: setActiveConversation() - Authentication required.")
      throw new Error("Authentication required")
    }
    const userId = session.user.id || session.user.email!
    // console.log("ACTION/CANVAS: setActiveConversation() - User:", userId)

    const newSessionId = await createCanvasSession(conversationId, userId)
    await db.userCanvas.updateOne(
      { userId },
      { $set: { userId, activeConversationId: conversationId, lastAccessed: new Date(), sessionId: newSessionId } },
      { upsert: true }, // Ensure userCanvas document is created if it doesn't exist
    )
    revalidatePath("/canvas")
    // console.log("ACTION/CANVAS: setActiveConversation() - ✅ Active conversation set. New SessionId:", newSessionId)
    return { success: true, sessionId: newSessionId }
  } catch (error: any) {
    console.error("ACTION/CANVAS: setActiveConversation() - ❌ Error:", error.message, error.stack)
    return { success: false, error: error.message }
  }
}

export async function trackInteraction(
  conversationId: string,
  actionType: string,
  entityId: string,
  metadata: any,
  sessionId: string,
) {
  // console.log(`ACTION/CANVAS: trackInteraction() - ConvId: ${conversationId}, Action: ${actionType}, Entity: ${entityId}, Session: ${sessionId}`)
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      // console.warn("ACTION/CANVAS: trackInteraction() - Authentication required.")
      throw new Error("Authentication required")
    }
    const userId = session.user.id || session.user.email!

    await db.canvasInteractions.insertOne({
      id: uuidv4(),
      userId,
      conversationId,
      actionType,
      entityId,
      timestamp: new Date(),
      metadata,
      sessionId,
    })
    await updateSessionActivity(sessionId)
    // console.log("ACTION/CANVAS: trackInteraction() - ✅ Interaction tracked.")
    return { success: true }
  } catch (error: any) {
    console.error("ACTION/CANVAS: trackInteraction() - ❌ Error:", error.message, error.stack)
    return { success: false, error: error.message }
  }
}

export async function getInteractionHistory(conversationId: string, limit = 100) {
  // console.log("ACTION/CANVAS: getInteractionHistory() - ConversationId:", conversationId, "Limit:", limit)
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      // console.warn("ACTION/CANVAS: getInteractionHistory() - Authentication required.")
      throw new Error("Authentication required")
    }
    const userId = session.user.id || session.user.email!
    // console.log("ACTION/CANVAS: getInteractionHistory() - User:", userId)

    const interactionsFromDb = await db.canvasInteractions.find(
      { userId, conversationId },
      { sort: { timestamp: -1 }, limit },
    )
    // console.log("ACTION/CANVAS: getInteractionHistory() - ✅ Found interactions:", interactionsFromDb.length)
    return { success: true, interactions: interactionsFromDb } // Return the raw interactions
  } catch (error: any) {
    console.error("ACTION/CANVAS: getInteractionHistory() - ❌ Error:", error.message, error.stack)
    return { success: false, error: error.message, interactions: [] }
  }
}
