"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import clientPromise from "@/lib/mongodb"
import type { UserProfile, UserPreferences } from "@/lib/models/canvas"
import { revalidatePath } from "next/cache"

// Get or create user profile
export async function getUserProfile() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      throw new Error("Authentication required")
    }

    const userId = session.user.id || session.user.email
    const client = await clientPromise
    const db = client.db("Conversationstore")
    const profilesCollection = db.collection("userProfiles")

    let userProfile = await profilesCollection.findOne({ userId })

    // Create default profile if it doesn't exist
    if (!userProfile) {
      const defaultProfile: UserProfile = {
        userId,
        email: session.user.email!,
        name: session.user.name || undefined,
        avatar: session.user.image || undefined,
        preferences: {
          theme: "system",
          autoSave: true,
          autoSaveInterval: 30,
          defaultModel: "gpt-4",
          canvasSettings: {
            snapToGrid: false,
            showMinimap: true,
            animateEdges: true,
          },
          notifications: {
            email: true,
            browser: true,
          },
        },
        createdAt: new Date(),
        lastLogin: new Date(),
      }

      await profilesCollection.insertOne(defaultProfile)
      userProfile = defaultProfile
    } else {
      // Update last login
      await profilesCollection.updateOne({ userId }, { $set: { lastLogin: new Date() } })
    }

    return { success: true, profile: userProfile }
  } catch (error) {
    console.error("Error getting user profile:", error)
    return { success: false, error: (error as Error).message }
  }
}

// Update user preferences
export async function updateUserPreferences(preferences: Partial<UserPreferences>) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      throw new Error("Authentication required")
    }

    const userId = session.user.id || session.user.email
    const client = await clientPromise
    const db = client.db("Conversationstore")
    const profilesCollection = db.collection("userProfiles")

    await profilesCollection.updateOne(
      { userId },
      {
        $set: {
          preferences: preferences,
          lastLogin: new Date(),
        },
      },
      { upsert: true },
    )

    revalidatePath("/canvas")
    return { success: true }
  } catch (error) {
    console.error("Error updating user preferences:", error)
    return { success: false, error: (error as Error).message }
  }
}

// Update user profile
export async function updateUserProfile(profileData: Partial<UserProfile>) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      throw new Error("Authentication required")
    }

    const userId = session.user.id || session.user.email
    const client = await clientPromise
    const db = client.db("Conversationstore")
    const profilesCollection = db.collection("userProfiles")

    const updateData = {
      ...profileData,
      lastLogin: new Date(),
    }

    await profilesCollection.updateOne({ userId }, { $set: updateData }, { upsert: true })

    revalidatePath("/canvas")
    return { success: true }
  } catch (error) {
    console.error("Error updating user profile:", error)
    return { success: false, error: (error as Error).message }
  }
}
