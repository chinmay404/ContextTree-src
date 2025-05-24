import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Get the API endpoint from environment variable or use default
    const apiEndpoint = process.env.CHAT_API_ENDPOINT || "http://18.234.147.188/api/v1/chat/"

    console.log(`Making API request to: ${apiEndpoint}`)
    console.log(`Request payload: ${JSON.stringify(body, null, 2)}`)

    // Format the context as an array if it's not already
    if (body.context && typeof body.context === "string") {
      body.context = body.context.split(",").filter(Boolean)
    }

    // Ensure we have a message_id
    if (!body.message_id) {
      body.message_id = `msg_${Date.now()}`
    }

    // Make the API request
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API Error: ${response.status} ${response.statusText}`)
      console.error(`Error response: ${errorText}`)
      return NextResponse.json(
        { error: `API request failed: ${response.status} ${response.statusText}` },
        { status: response.status },
      )
    }

    const data = await response.text()
    console.log(`API response received, length: ${data.length}`)

    return new NextResponse(data)
  } catch (error) {
    console.error("Error in chat API route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
