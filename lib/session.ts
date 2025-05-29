// Generate a random session ID for the user
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
