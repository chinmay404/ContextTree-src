import { getUserSessionId } from "@/lib/auth"

interface ChatRequestPayload {
  message: string
  message_id: string
  conversation_id: string
  model_name: string
  temperature: number
  context: string[] | string
  user_id: string
}

export const getChatResponse = async (
  message: string,
  nodeId: string,
  modelName: string,
  parentNodeIds: string[],
): Promise<string> => {
  const userId = getUserSessionId() || `user_${Date.now()}`
  const messageId = `msg_${Date.now()}`

  // Format the payload according to the API expectations
  const payload: ChatRequestPayload = {
    message,
    message_id: messageId,
    conversation_id: nodeId,
    model_name: modelName || "llama3-70b-8192", // Default model if none selected
    temperature: 0,
    context: parentNodeIds.length > 0 ? parentNodeIds : [""],
    user_id: userId,
  }

  try {
    console.log("Sending chat request:", JSON.stringify(payload, null, 2))

    // Check if we're online before making the request
    if (!navigator.onLine) {
      console.error("Browser is offline")
      return "You appear to be offline. Please check your internet connection and try again."
    }

    // Use our proxy API route instead of calling the external API directly
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API Error Response: ${errorText}`)
      throw new Error(`API request failed with status ${response.status}: ${response.statusText}`)
    }

    const data = await response.text()
    console.log("Received response, length:", data.length)

    // Check if we got a valid response
    if (!data || data.trim() === "") {
      console.error("Empty response received from API")
      return "I apologize, but I received an empty response. Please try again."
    }

    return data
  } catch (error) {
    console.error("Error fetching chat response:", error)

    // Log the full error details for debugging
    if (error instanceof Error) {
      console.error(`API Error details: ${error.message}`)
    }

    // Return a user-friendly error message
    return "I'm having trouble connecting to the AI service right now. Please check your internet connection and try again."
  }
}
