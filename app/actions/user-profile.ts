"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { db } from "@/lib/db" // Use our new db utility
import type { UserProfile, UserPreferences } from "@/lib/models/canvas" // Assuming models are correctly defined
import { revalidatePath } from "next/cache"
import { serializeMongoDoc, safeSerializeForClient } from "@/lib/serialize-mongodb" // Import serialization utilities

console.log("ACTION/USER-PROFILE: Module loaded.")

export async function getUserProfile(): Promise<{ success: boolean; profile?: UserProfile; error?: string }> {
  console.log("ACTION/USER-PROFILE: getUserProfile() called.")
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      console.warn("ACTION/USER-PROFILE: getUserProfile() - Authentication required.")
      throw new Error("Authentication required")
    }
    const userId = session.user.id || session.user.email!
    console.log("ACTION/USER-PROFILE: getUserProfile() - User:", userId)

    let userProfileDoc = await db.userProfiles.findOne({ userId })

    if (!userProfileDoc) {
      console.log("ACTION/USER-PROFILE: getUserProfile() - No profile found, creating default for user:", userId)
      const defaultProfile: UserProfile = {
        userId,
        email: session.user.email!,
        name: session.user.name || undefined,
        avatar: session.user.image || undefined,
        preferences: {
          theme: "system",
          autoSave: true,
          autoSaveInterval: 30,
          defaultModel: "gpt-4", // Consider making this configurable
          canvasSettings: { snapToGrid: false, showMinimap: true, animateEdges: true },
          notifications: { email: true, browser: true },
        },
        createdAt: new Date(),
        lastLogin: new Date(),
      }
      // The insertOne in lib/db returns the document with _id, but here we expect UserProfile type
      const inserted = await db.userProfiles.insertOne(defaultProfile as any) // Cast if insertOne has different return
      userProfileDoc = { ...defaultProfile, _id: inserted._id } as any // Reconstruct if needed
      console.log("ACTION/USER-PROFILE: getUserProfile() - ✅ Default profile created for user:", userId)
    } else {
      console.log("ACTION/USER-PROFILE: getUserProfile() - Profile found for user:", userId, "Updating lastLogin.")
      await db.userProfiles.updateOne({ userId }, { $set: { lastLogin: new Date() } })
      console.log("ACTION/USER-PROFILE: getUserProfile() - ✅ lastLogin updated for user:", userId)
    }    // Ensure the returned profile matches the UserProfile interface, properly serialized
    const serializedProfile = serializeMongoDoc(userProfileDoc);
    // Exclude MongoDB _id if UserProfile doesn't have it
    const { _id, ...profileData } = serializedProfile;
    
    // Final safety check using safeSerializeForClient
    return safeSerializeForClient({ 
      success: true, 
      profile: profileData as UserProfile 
    });  } catch (error: any) {
    console.error("ACTION/USER-PROFILE: getUserProfile() - ❌ Error:", error.message, error.stack)
    return safeSerializeForClient({ success: false, error: error.message })
  }
}

export async function updateUserPreferences(
  preferences: Partial<UserPreferences>,
): Promise<{ success: boolean; error?: string }> {
  console.log("ACTION/USER-PROFILE: updateUserPreferences() called with:", JSON.stringify(preferences))
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      console.warn("ACTION/USER-PROFILE: updateUserPreferences() - Authentication required.")
      throw new Error("Authentication required")
    }
    const userId = session.user.id || session.user.email!
    console.log("ACTION/USER-PROFILE: updateUserPreferences() - User:", userId)

    // Construct the update object carefully to target nested fields in 'preferences'
    const updateFields: any = {}
    for (const key in preferences) {
      updateFields[`preferences.${key}`] = (preferences as any)[key]
    }
    updateFields.lastLogin = new Date()

    await db.userProfiles.updateOne({ userId }, { $set: updateFields })    revalidatePath("/canvas") // Or specific paths related to preferences
    console.log("ACTION/USER-PROFILE: updateUserPreferences() - ✅ Preferences updated for user:", userId)
    return safeSerializeForClient({ success: true })  } catch (error: any) {
    console.error("ACTION/USER-PROFILE: updateUserPreferences() - ❌ Error:", error.message, error.stack)
    return safeSerializeForClient({ success: false, error: error.message })
  }
}

export async function updateUserProfile(
  profileData: Partial<Omit<UserProfile, "preferences" | "userId" | "email" | "createdAt" | "lastLogin">>,
): Promise<{ success: boolean; error?: string }> {
  console.log("ACTION/USER-PROFILE: updateUserProfile() called with:", JSON.stringify(profileData))
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      console.warn("ACTION/USER-PROFILE: updateUserProfile() - Authentication required.")
      throw new Error("Authentication required")
    }
    const userId = session.user.id || session.user.email!
    console.log("ACTION/USER-PROFILE: updateUserProfile() - User:", userId)

    const updatePayload: any = { ...profileData, lastLogin: new Date() }

    await db.userProfiles.updateOne({ userId }, { $set: updatePayload })    revalidatePath("/canvas") // Or specific paths related to profile
    console.log("ACTION/USER-PROFILE: updateUserProfile() - ✅ Profile updated for user:", userId)
    return safeSerializeForClient({ success: true })  } catch (error: any) {
    console.error("ACTION/USER-PROFILE: updateUserProfile() - ❌ Error:", error.message, error.stack)
    return safeSerializeForClient({ success: false, error: error.message })
  }
}
