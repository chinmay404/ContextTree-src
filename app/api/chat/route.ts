import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    // Hardcode the API endpoint URL directly
    const API_ENDPOINT = "http://18.234.147.188/api/v1/chat/"

    const body = await request.json()
    console.log("Sending request to:", API_ENDPOINT)
    console.log("Request payload:", JSON.stringify(body))

    // Ensure context is an array
    if (typeof body.context === "string") {
      body.context = body.context.split(",").filter(Boolean)
    }

    const response = await fetch(API_ENDPOINT, {
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
