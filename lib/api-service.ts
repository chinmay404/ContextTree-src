import { getUserSessionId } from "@/lib/auth"
import { getMockResponse } from "@/lib/mock-response"

interface ChatRequestPayload {
  message: string
  conversation_id: string
  model_name: string
  temperature: number
  context: string[] // Changed to string array
  user_id: string
}

export const getChatResponse = async (
  message: string,
  nodeId: string,
  modelName: string,
  parentNodeIds: string[],
): Promise<string> => {
  const userId = getUserSessionId()

  const payload: ChatRequestPayload = {
    message,
    conversation_id: nodeId,
    model_name: modelName,
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
