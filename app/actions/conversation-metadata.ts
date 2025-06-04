"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import getMongoClientPromise from "@/lib/mongodb"
import type { ConversationMetadata } from "@/lib/models/canvas"
import { revalidatePath } from "next/cache"

interface SessionUserWithId {
  id?: string; // NextAuth session user might not always have an id, so make it optional
  email?: string | null;
}

// Get conversation metadata
export async function getConversationMetadata(conversationId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      throw new Error("Authentication required")
    }

    const userId = (session.user as SessionUserWithId).id || session.user.email || ""
    const client = await getMongoClientPromise()
    const db = client.db("Conversationstore")
    const metadataCollection = db.collection("conversationMetadata")

    const metadata = await metadataCollection.findOne({ userId, conversationId })

    return { success: true, metadata }
  } catch (error) {
    console.error("Error getting conversation metadata:", error)
    return { success: false, error: (error as Error).message }
  }
}

// Update conversation metadata
export async function updateConversationMetadata(conversationId: string, updates: Partial<ConversationMetadata>) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      throw new Error("Authentication required")
    }

    const userId = (session.user as SessionUserWithId).id || session.user.email || ""
    const client = await getMongoClientPromise()
    const db = client.db("Conversationstore")
    const metadataCollection = db.collection("conversationMetadata")

    await metadataCollection.updateOne(
      { userId, conversationId },
      {
        $set: {
          ...updates,
          "analytics.lastActivity": new Date(),
        },
      },
      { upsert: true },
    )

    return { success: true }
  } catch (error) {
    console.error("Error updating conversation metadata:", error)
    return { success: false, error: (error as Error).message }
  }
}

// Add tags to conversation
export async function addConversationTags(conversationId: string, tags: string[]) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      throw new Error("Authentication required")
    }

    const userId = (session.user as SessionUserWithId).id || session.user.email || ""
    const client = await getMongoClientPromise()
    const db = client.db("Conversationstore")
    const metadataCollection = db.collection("conversationMetadata")

    await metadataCollection.updateOne(
      { userId, conversationId },
      {
        $addToSet: { tags: { $each: tags } },
        $set: { "analytics.lastActivity": new Date() },
      },
      { upsert: true },
    )

    revalidatePath("/canvas")
    return { success: true }
  } catch (error) {
    console.error("Error adding conversation tags:", error)
    return { success: false, error: (error as Error).message }
  }
}

// Search conversations by tags or content
export async function searchConversations(query: string, tags?: string[]) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      throw new Error("Authentication required")
    }

    const userId = (session.user as SessionUserWithId).id || session.user.email || ""
    const client = await getMongoClientPromise()
    const db = client.db("Conversationstore")
    const conversationsCollection = db.collection("conversations")
    const metadataCollection = db.collection("conversationMetadata")

    // Build search criteria
    const searchCriteria: any = { userId }

    if (query) {
      searchCriteria.$text = { $search: query }
    }

    if (tags && tags.length > 0) {
      const metadataResults = await metadataCollection
        .find({
          userId,
          tags: { $in: tags },
        })
        .toArray()

      const conversationIds = metadataResults.map((m) => m.conversationId)
      searchCriteria.conversationId = { $in: conversationIds }
    }

    const conversations = await conversationsCollection
      .find(searchCriteria)
      .sort({ lastModified: -1 })
      .limit(50)
      .toArray()

    return { success: true, conversations }
  } catch (error) {
    console.error("Error searching conversations:", error)
    return { success: false, error: (error as Error).message, conversations: [] }
  }
}
