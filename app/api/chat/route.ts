import { NextResponse } from "next/server"
import { getUserSessionId } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    // Check if user is authenticated
    const userId = getUserSessionId()
    if (!userId) {
      return new NextResponse(JSON.stringify({ error: "User not authenticated" }), {
        status: 401,
      })
    }

    if (!process.env.CHAT_API_ENDPOINT) {
      return new NextResponse(JSON.stringify({ error: "CHAT_API_ENDPOINT environment variable is not set" }), {
        status: 500,
      })
    }
    const body = await request.json()

    // Add user ID to the request body
    const enrichedBody = {
      ...body,
      user_id: userId,
    }

    const response = await fetch(process.env.CHAT_API_ENDPOINT || "", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(enrichedBody),
    })

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    const data = await response.text()
    return new NextResponse(data)
  } catch (error) {
    console.error("Proxy API error:", error)
    return new NextResponse(JSON.stringify({ error: "Failed to fetch from external API" }), { status: 500 })
  }
}
