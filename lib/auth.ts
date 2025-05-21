export function getUserSessionId(): string {
  // In a client component, we can't directly access the session
  // This is a simplified version that works with both client and server components

  // For client components, we'll use a fallback mechanism
  // In a real implementation, you might want to use a more robust solution
  // like storing the user ID in localStorage after authentication

  // Check if we're in a browser environment
  if (typeof window !== "undefined") {
    // Try to get the user ID from localStorage
    const userId = localStorage.getItem("userId")
    if (userId) return userId

    // Generate a temporary ID if none exists
    // This is just for demo purposes - in a real app, you'd want proper authentication
    const tempId = `temp-${Math.random().toString(36).substring(2, 15)}`
    localStorage.setItem("userId", tempId)
    return tempId
  }

  // For server components, we'd normally use the session
  // But since this can be called from client components too,
  // we'll return a placeholder
  return "anonymous-user"
}
