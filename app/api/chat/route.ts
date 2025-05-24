import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    // Check if the environment variable is set
    if (!process.env.CHAT_API_ENDPOINT) {
      console.error("CHAT_API_ENDPOINT environment variable is not set")
      return new NextResponse(JSON.stringify({ error: "CHAT_API_ENDPOINT environment variable is not set" }), {
        status: 500,
      })
    }

    const body = await request.json()
    console.log("Sending request to:", process.env.CHAT_API_ENDPOINT)
    console.log("Request payload:", JSON.stringify(body))

    const response = await fetch(process.env.CHAT_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      console.error(`API responded with status: ${response.status}`)
      throw new Error(`API responded with status: ${response.status}`)
    }

    const data = await response.text()
    return new NextResponse(data)
  } catch (error) {
    console.error("Proxy API error:", error)
    return new NextResponse(JSON.stringify({ error: "Failed to fetch from external API" }), { status: 500 })
  }
}
