"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import clientPromise from "@/lib/mongodb"
import { revalidatePath } from "next/cache"

// Create conversation backup
export async function createConversationBackup(conversationId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      throw new Error("Authentication required")
    }

    const userId = session.user.id || session.user.email
    const client = await clientPromise
    const db = client.db("Conversationstore")
    const conversationsCollection = db.collection("conversations")
    const backupsCollection = db.collection("conversationBackups")

    // Get the current conversation
    const conversation = await conversationsCollection.findOne({ userId, conversationId })

    if (!conversation) {
      throw new Error("Conversation not found")
    }

    // Create backup
    const backup = {
      userId,
      conversationId,
      conversationData: conversation,
      createdAt: new Date(),
      backupType: "manual",
    }

    await backupsCollection.insertOne(backup)

    // Update metadata
    const metadataCollection = db.collection("conversationMetadata")
    await metadataCollection.updateOne(
      { userId, conversationId },
      {
        $set: {
          "backup.lastBackup": new Date(),
        },
        $inc: {
          "backup.backupCount": 1,
        },
      },
      { upsert: true },
    )

    return { success: true }
  } catch (error) {
    console.error("Error creating conversation backup:", error)
    return { success: false, error: (error as Error).message }
  }
}

// Get conversation backups
export async function getConversationBackups(conversationId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      throw new Error("Authentication required")
    }

    const userId = session.user.id || session.user.email
    const client = await clientPromise
    const db = client.db("Conversationstore")
    const backupsCollection = db.collection("conversationBackups")

    const backups = await backupsCollection.find({ userId, conversationId }).sort({ createdAt: -1 }).limit(10).toArray()

    return { success: true, backups }
  } catch (error) {
    console.error("Error getting conversation backups:", error)
    return { success: false, error: (error as Error).message, backups: [] }
  }
}

// Restore conversation from backup
export async function restoreConversationFromBackup(conversationId: string, backupId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      throw new Error("Authentication required")
    }

    const userId = session.user.id || session.user.email
    const client = await clientPromise
    const db = client.db("Conversationstore")
    const conversationsCollection = db.collection("conversations")
    const backupsCollection = db.collection("conversationBackups")

    // Get the backup
    const backup = await backupsCollection.findOne({
      _id: backupId,
      userId,
      conversationId,
    })

    if (!backup) {
      throw new Error("Backup not found")
    }

    // Restore the conversation
    await conversationsCollection.updateOne(
      { userId, conversationId },
      {
        $set: {
          ...backup.conversationData,
          lastModified: new Date(),
          version: (backup.conversationData.version || 0) + 1,
        },
      },
    )

    revalidatePath("/canvas")
    return { success: true }
  } catch (error) {
    console.error("Error restoring conversation from backup:", error)
    return { success: false, error: (error as Error).message }
  }
}
