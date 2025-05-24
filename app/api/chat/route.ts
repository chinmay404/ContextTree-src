import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    // Use hardcoded API endpoint as fallback if environment variable is not set
    const apiEndpoint = process.env.CHAT_API_ENDPOINT || "http://18.234.147.188/api/v1/chat/"

    const body = await request.json()

    // Format the request payload according to the expected format
    const formattedBody = {
      message: body.message,
      message_id: body.message_id || String(Date.now()),
      conversation_id: body.conversation_id,
      model_name: body.model_name || "",
      temperature: body.temperature || 0,
      context: Array.isArray(body.context) ? body.context : [body.context],
      user_id: body.user_id || "user_" + Date.now(),
    }

    console.log("Sending request to API:", apiEndpoint)
    console.log("Request payload:", JSON.stringify(formattedBody, null, 2))

    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formattedBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API responded with status: ${response.status}, message: ${errorText}`)
      throw new Error(`API responded with status: ${response.status}`)
    }

    const data = await response.text()
    console.log("API response received, length:", data.length)
    return new NextResponse(data)
  } catch (error) {
    console.error("Proxy API error:", error)
    return new NextResponse(JSON.stringify({ error: "Failed to fetch from external API", details: error.message }), {
      status: 500,
    })
  }
}
