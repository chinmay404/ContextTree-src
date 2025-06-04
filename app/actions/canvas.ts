"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route" // Ensure this path is correct
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { v4 as uuidv4 } from "uuid"

interface SessionUserWithId {
  id?: string; // NextAuth session user might not always have an id, so make it optional
  email?: string | null;
}

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
    const database = await db()
    await database.collection("canvasSessions").insertOne({
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
    const database = await db()
    await database.collection("canvasSessions").updateOne({ sessionId, isActive: true }, { $set: { lastActivity: new Date() } })
    // console.log(`ACTION/CANVAS: updateSessionActivity() - ✅ Activity updated for session: ${sessionId}`)
    return true
  } catch (error: any) {
    console.error("ACTION/CANVAS: updateSessionActivity() - ❌ Error:", error.message)
    return false
  }
}

// Helper to clean nodes before saving (remove non-serializable properties like functions)
function cleanNodesForSave(nodes: any[]) {
  return nodes.map(node => {
    if (node.data) {
      const newData = { ...node.data };
      // Remove functions and other non-serializable properties
      delete newData.onNodeClick;
      delete newData.onLabelChange;
      delete newData.onToggleExpand;
      delete newData.onResize;
      delete newData.onStartConnection;
      delete newData.onDelete;
      delete newData.onModelChange;
      delete newData.onDimensionsChange;
      // Ensure messages are also cleaned if they contain non-serializable parts (though timestamp is handled)
      if (newData.messages && Array.isArray(newData.messages)) {
        newData.messages = newData.messages.map((msg: any) => ({
          id: msg.id,
          sender: msg.sender,
          content: msg.content,
          timestamp: msg.timestamp,
        }));
      }
      return { ...node, data: newData };
    }
    return node;
  });
}

// Helper to clean edges before saving (remove non-serializable properties)
function cleanEdgesForSave(edges: any[]) {
  return edges.map(edge => {
    if (edge.data) {
      const newData = { ...edge.data };
      // Add any non-serializable properties of edge.data to be deleted if they exist
      // delete newData.someFunctionOnEdge;
      return { ...edge, data: newData };
    }
    return edge;
  });
}

export async function saveConversation(conversationData: any, sessionId?: string) {
  // console.log("ACTION/CANVAS: saveConversation() - ConversationId:", conversationData.id, "SessionId:", sessionId)
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      // console.warn("ACTION/CANVAS: saveConversation() - Authentication required.")
      throw new Error("Authentication required")
    }
    const userId = (session.user as SessionUserWithId).id || session.user.email || "" // Ensure user.id or user.email exists
    // console.log("ACTION/CANVAS: saveConversation() - User:", userId)

    const database = await db()
    const existingConversation = await database.collection("conversations").findOne({
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

    // Clean nodes and edges before saving
    const cleanedNodes = cleanNodesForSave(conversationData.nodes);
    const cleanedEdges = cleanEdgesForSave(conversationData.edges);

    const canvasData: any = {
      userId,
      conversationId: conversationData.id,
      name: conversationData.name,
      nodes: cleanedNodes, // Use cleaned nodes
      edges: cleanedEdges, // Use cleaned edges
      lastModified: new Date(),
      createdAt: existingConversation ? existingConversation.createdAt : new Date(),
      version: existingConversation ? (existingConversation.version || 0) + 1 : 1,
    }

    // console.log("ACTION/CANVAS: saveConversation() - Attempting to upsert conversation. Version:", canvasData.version)
    const updateResult = await database.collection("conversations").updateOne(
      { userId, conversationId: conversationData.id, version: canvasData.version - 1 },
      { $set: canvasData },
      { upsert: true }
    )

    if (updateResult.matchedCount === 0 && !updateResult.upsertedId && existingConversation) {
      // console.warn("ACTION/CANVAS: saveConversation() - Optimistic lock conflict. Current:", existingConversation.version, "Attempted:", canvasData.version - 1)
      const latestVersion = await database.collection("conversations").findOne({ userId, conversationId: conversationData.id })
      if (latestVersion) {
        // console.log("ACTION/CANVAS: saveConversation() - Merging with latest version:", latestVersion.version)
        canvasData.nodes = mergeArraysById(latestVersion.nodes, conversationData.nodes)
        canvasData.edges = mergeArraysById(latestVersion.edges, conversationData.edges)
        canvasData.version = latestVersion.version + 1
        // console.log("ACTION/CANVAS: saveConversation() - Retrying upsert. New version:", canvasData.version)
        await database.collection("conversations").updateOne(
          { userId, conversationId: conversationData.id, version: latestVersion.version },
          { $set: canvasData },
          { upsert: true }
        )
      } else {
        // console.error("ACTION/CANVAS: saveConversation() - ❌ Conflict but latest version not found.")
        canvasData.version = (existingConversation.version || 0) + 2 // Ensure higher version
        await database.collection("conversations").updateOne({ userId, conversationId: conversationData.id }, { $set: canvasData }, { upsert: true })
      }
    } else if (updateResult.upsertedId) {
      // console.log("ACTION/CANVAS: saveConversation() - ✅ Conversation upserted with new ID:", updateResult.upsertedId)
    } else {
      // console.log("ACTION/CANVAS: saveConversation() - ✅ Conversation updated. Matched:", updateResult.matchedCount, "Modified:", updateResult.modifiedCount)
    }

    // console.log("ACTION/CANVAS: saveConversation() - Updating userCanvas for active conversation.")
    await database.collection("userCanvas").updateOne(
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
    const userId = (session.user as SessionUserWithId).id || session.user.email || ""
    // console.log("ACTION/CANVAS: getUserConversations() - User:", userId)

    const database = await db()
    const conversationsFromDb = await database.collection("conversations").find({ userId }, { sort: { lastModified: -1 }})
    const userCanvas = await database.collection("userCanvas").findOne({ userId })
    let currentSessionId = userCanvas?.sessionId

    if (userCanvas?.activeConversationId && (!currentSessionId || currentSessionId === "")) {
      // console.log("ACTION/CANVAS: getUserConversations() - No active session, creating new one.")
      currentSessionId = await createCanvasSession(userCanvas.activeConversationId, userId)
      if (currentSessionId) {
        await database.collection("userCanvas").updateOne({ userId }, { $set: { sessionId: currentSessionId } }, { upsert: true })
      }
    }

    const resultData = {
      success: true,
      conversations: (await conversationsFromDb.toArray()).map((conv: any) => ({
        id: conv.conversationId,
        name: conv.name,
        nodes: cleanNodesForSave(conv.nodes),
        edges: cleanEdgesForSave(conv.edges),
        lastModified: conv.lastModified ? conv.lastModified.toISOString() : null, // Convert Date to ISO string
        createdAt: conv.createdAt ? conv.createdAt.toISOString() : null, // Convert Date to ISO string
        version: conv.version || 1,
      })),
      activeConversationId: userCanvas?.activeConversationId,
      sessionId: currentSessionId,
      userCanvasLastAccessed: userCanvas?.lastAccessed ? userCanvas.lastAccessed.toISOString() : null,
    };

    console.log("Data returned by getUserConversations:", JSON.stringify(resultData, null, 2));
    return resultData;
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
    const userId = (session.user as SessionUserWithId).id || session.user.email || ""
    const database = await db()
    await database.collection("conversations").deleteOne({ userId, conversationId })
    revalidatePath("/canvas")
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
    const userId = (session.user as SessionUserWithId).id || session.user.email || ""
    const database = await db()
    await database.collection("userCanvas").updateOne(
      { userId },
      {
        $set: { activeConversationId: conversationId, lastAccessed: new Date() },
      },
      { upsert: true },
    )

    // Create a new session for the active conversation if none exists
    const userCanvas = await database.collection("userCanvas").findOne({ userId })
    let currentSessionId = userCanvas?.sessionId
    if (!currentSessionId || currentSessionId === "") {
      currentSessionId = await createCanvasSession(conversationId, userId)
      if (currentSessionId) {
        await database.collection("userCanvas").updateOne({ userId }, { $set: { sessionId: currentSessionId } }, { upsert: true })
      }
    }
    revalidatePath("/canvas")
    return { success: true }
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
  // console.log("ACTION/CANVAS: trackInteraction() - ConversationId:", conversationId, "Action:", actionType)
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      // console.warn("ACTION/CANVAS: trackInteraction() - Authentication required.")
      throw new Error("Authentication required")
    }
    const userId = (session.user as SessionUserWithId).id || session.user.email || ""
    const database = await db()
    await database.collection("canvasInteractions").insertOne({
      userId,
      conversationId,
      actionType,
      entityId,
      metadata,
      timestamp: new Date(),
      sessionId,
    })
    return { success: true }
  } catch (error: any) {
    console.error("ACTION/CANVAS: trackInteraction() - ❌ Error:", error.message, error.stack)
    return { success: false, error: error.message }
  }
}

export async function getInteractionHistory(conversationId: string, limit = 100) {
  // console.log("ACTION/CANVAS: getInteractionHistory() - ConversationId:", conversationId)
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      // console.warn("ACTION/CANVAS: getInteractionHistory() - Authentication required.")
      throw new Error("Authentication required")
    }
    const userId = (session.user as SessionUserWithId).id || session.user.email || ""
    const database = await db()
    const history = await database.collection("canvasInteractions").find({ userId, conversationId }).sort({ timestamp: -1 }).limit(limit).toArray()
    
    // Convert Date objects to ISO strings for serialization
    const serializableHistory = history.map((item: any) => ({
      ...item,
      timestamp: item.timestamp ? item.timestamp.toISOString() : null,
    }));

    return { success: true, history: serializableHistory }
  } catch (error: any) {
    console.error("ACTION/CANVAS: getInteractionHistory() - ❌ Error:", error.message, error.stack)
    return { success: false, error: error.message, history: [] }
  }
}
