import { NextResponse } from "next/server"

export async function GET() {
  // Check if required environment variables are set
  const envCheck = {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || null,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    MONGODB_URI: !!process.env.MONGODB_URI,
  }

  return NextResponse.json({
    env: envCheck,
    nodeEnv: process.env.NODE_ENV,
  })
}
