import { NextResponse } from "next/server"
import { checkDatabaseConnection } from "@/lib/init-db"

export async function GET() {
  try {
    const status = await checkDatabaseConnection()
    return NextResponse.json(status)
  } catch (error) {
    console.error("Error checking database status:", error)
    return NextResponse.json(
      {
        connected: false,
        message: `Failed to check database status: ${(error as Error).message}`,
      },
      { status: 500 },
    )
  }
}
