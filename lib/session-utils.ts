export function getUserSessionId(): string {
  // This is a fallback function that returns a unique ID for users without a session
  // In a real implementation, this would be more sophisticated
  let anonymousId = localStorage.getItem("anonymous-user-id")
  if (!anonymousId) {
    anonymousId = `anon-${Math.random().toString(36).substring(2, 15)}`
    localStorage.setItem("anonymous-user-id", anonymousId)
  }
  return anonymousId
}
