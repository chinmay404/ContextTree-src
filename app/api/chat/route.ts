import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    if (!process.env.CHAT_API_ENDPOINT) {
      return new NextResponse(JSON.stringify({ error: "CHAT_API_ENDPOINT environment variable is not set" }), {
        status: 500,
      })
    }
    const body = await request.json()

    const response = await fetch(process.env.CHAT_API_ENDPOINT || "", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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
