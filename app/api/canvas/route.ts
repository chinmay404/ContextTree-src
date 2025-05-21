import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"

// GET handler to retrieve canvas data for a user
export async function GET(request: NextRequest) {
  try {
    // Get the user session
    const session = await getServerSession(authOptions)

    // Check if the user is authenticated
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the user ID from the query parameters
    const userId = request.nextUrl.searchParams.get("userId")

    // Verify that the requested userId matches the authenticated user
    if (userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Connect to MongoDB
    const client = await clientPromise
    const db = client.db()

    // Find the canvas data for the user
    const canvasData = await db.collection("canvases").findOne({ userId })

    if (!canvasData) {
      return NextResponse.json({ error: "Canvas not found" }, { status: 404 })
    }

    return NextResponse.json(canvasData)
  } catch (error) {
    console.error("Error retrieving canvas data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST handler to save canvas data for a user
export async function POST(request: NextRequest) {
  try {
    // Get the user session
    const session = await getServerSession(authOptions)

    // Check if the user is authenticated
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the canvas data from the request body
    const canvasData = await request.json()

    // Verify that the userId in the data matches the authenticated user
    if (canvasData.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Connect to MongoDB
    const client = await clientPromise
    const db = client.db()

    // Add a timestamp to the canvas data
    const dataToSave = {
      ...canvasData,
      updatedAt: new Date(),
    }

    // Upsert the canvas data (update if exists, insert if not)
    await db.collection("canvases").updateOne({ userId: canvasData.userId }, { $set: dataToSave }, { upsert: true })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving canvas data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
