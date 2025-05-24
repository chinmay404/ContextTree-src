import { getUserSessionId } from "@/lib/auth"

interface ChatRequestPayload {
  message: string
  conversation_id: string
  model_name: string
  temperature: number
  context: string
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
    context: parentNodeIds.join(","),
    user_id: userId,
  }

  try {
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

    // Check if we got a valid response
    if (!data || data.trim() === "") {
      throw new Error("Empty response from API")
    }

    return data
  } catch (error) {
    console.error("Error fetching chat response:", error)

    // Log the full error details for debugging
    if (error instanceof Error) {
      console.error(`API Error details: ${error.message}`)
      console.error(`Stack trace: ${error.stack}`)
    }

    // Throw the error instead of returning mock response
    // This will help identify the actual issue
    throw error
  }
}
