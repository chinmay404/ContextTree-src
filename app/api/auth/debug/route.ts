import { NextResponse } from "next/server"

export async function GET() {
  // Check for required environment variables
  const envCheck = {
    NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    MONGODB_URI: !!process.env.MONGODB_URI,
    VERCEL_URL: !!process.env.VERCEL_URL,
  }

  // Don't expose actual values, just whether they're set
  return NextResponse.json({
    env: envCheck,
    baseUrl: process.env.NEXTAUTH_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  })
}
