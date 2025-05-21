"use client"

// Client-side implementation of getUserSessionId that doesn't use MongoDB
export const getUserSessionId = (): string => {
  // Check if we already have a session ID in localStorage
  const existingSessionId = localStorage.getItem("user_session_id")

  if (existingSessionId) {
    return existingSessionId
  }

  // Generate a new session ID
  const newSessionId = `user_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`
  localStorage.setItem("user_session_id", newSessionId)

  return newSessionId
}

// Client-side function to check if user is logged in
export const isUserLoggedIn = async (): Promise<boolean> => {
  try {
    const response = await fetch("/api/auth/session")
    const session = await response.json()
    return !!session?.user
  } catch (error) {
    console.error("Error checking authentication status:", error)
    return false
  }
}
