import { getUserSessionId } from "@/lib/auth"
import { getMockResponse } from "@/lib/mock-response"

interface ChatRequestPayload {
  message: string
  message_id: string
  conversation_id: string
  model_name: string
  temperature: number
  context: string[] // String array
  user_id: string
}

// Simple function to generate a unique message ID
const generateMessageId = (): string => {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9)
}

// Generate a unique ID for use in conversation_id
const generateUniqueId = (): string => {
  return Math.random().toString(36).substring(2, 15)
}

export const getChatResponse = async (
  message: string,
  nodeId: string,
  modelName: string,
  parentNodeIds: string[],
): Promise<string> => {
  const userId = getUserSessionId()

  // Create conversation_id by combining userId and a unique identifier
  const conversationId = `${userId}_${nodeId}`

  const payload: ChatRequestPayload = {
    message,
    message_id: generateMessageId(), // Generate a unique message ID
    conversation_id: conversationId, // Combined user ID and node ID
    model_name: modelName, // User selected model
    temperature: 0,
    context: parentNodeIds, // Send as array directly
    user_id: userId,
  }

  try {
    console.log("Sending chat request with payload:", JSON.stringify(payload))

    // Use our proxy API route instead of calling the external API directly
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error(`API request failed with status ${response.status}: ${response.statusText}`)
      throw new Error(`API request failed with status ${response.status}: ${response.statusText}`)
    }

    const data = await response.text()
    console.log("API response received:", data.substring(0, 100) + "...") // Log first 100 chars of response
    return data
  } catch (error) {
    console.error("Error fetching chat response:", error)

    // Provide a fallback response with more detailed error information
    let errorMessage = "Sorry, I couldn't process your request at the moment."

    if (error instanceof Error) {
      console.error(`API Error details: ${error.message}`)

      if (error.message.includes("Failed to fetch")) {
        errorMessage = "Network error: Unable to connect to the AI service. Please try again later."
      }
    }

    // Use the mock response as fallback
    return getMockResponse(message)
  }
}
