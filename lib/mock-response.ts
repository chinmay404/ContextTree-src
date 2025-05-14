// This provides a fallback when the API is unavailable
export const getMockResponse = (message: string): string => {
  // Simple responses based on message content
  if (message.toLowerCase().includes("hello") || message.toLowerCase().includes("hi")) {
    return "Hello! I'm a fallback response since the API is currently unavailable. How can I help you today?"
  }

  if (message.toLowerCase().includes("help")) {
    return "I'd be happy to help, but I'm currently running in fallback mode due to API connectivity issues. Please try again later for full functionality."
  }

  if (message.toLowerCase().includes("weather")) {
    return "I'm sorry, I can't check the weather right now as I'm running in fallback mode due to API connectivity issues."
  }

  // Default response
  return "I'm currently running in fallback mode due to API connectivity issues. Your message has been received, but I can only provide limited responses until the connection is restored."
}
