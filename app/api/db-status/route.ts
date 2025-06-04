import { NextResponse } from "next/server"
import { checkDatabaseConnection, initializeDatabase } from "@/lib/init-db"

export async function GET() {
  try {
    const status = await checkDatabaseConnection()
    if (status.connected) {
      const initResult = await initializeDatabase()
      if (!initResult.success) {
        return NextResponse.json(
          {
            connected: false,
            message: `Database connection successful, but initialization failed: ${initResult.error}`,
          },
          { status: 500 },
        )
      }
    }
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
