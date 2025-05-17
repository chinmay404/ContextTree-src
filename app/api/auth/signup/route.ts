import { NextResponse } from "next/server"
import bcryptjs from "bcryptjs" // Changed from bcrypt to bcryptjs
import { v4 as uuidv4 } from "uuid"

// In a real app, you would use a database
// For this example, we'll use a simple in-memory store
const users = new Map()

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if user already exists
    if (users.has(email)) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 })
    }

    // Hash password with bcryptjs (10 rounds is standard)
    const hashedPassword = await bcryptjs.hash(password, 10)

    // Create user
    const userId = uuidv4()
    const user = {
      id: userId,
      name,
      email,
      password: hashedPassword,
      createdAt: new Date(),
    }

    // Save user
    users.set(email, user)

    // Return success without exposing sensitive data
    return NextResponse.json(
      {
        id: userId,
        name,
        email,
        createdAt: user.createdAt,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
