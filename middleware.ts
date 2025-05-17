import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  const isAuthenticated = !!token

  // Define protected routes that require authentication
  const isProtectedRoute = request.nextUrl.pathname.startsWith("/canvas")

  // Define auth routes (login, signup, etc.)
  const isAuthRoute = request.nextUrl.pathname.startsWith("/auth")

  // If trying to access a protected route without being authenticated
  if (isProtectedRoute && !isAuthenticated) {
    const url = new URL("/auth/login", request.url)
    url.searchParams.set("callbackUrl", request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // If trying to access auth routes while already authenticated
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/canvas", request.url))
  }

  return NextResponse.next()
}

// Configure which paths the middleware runs on
export const config = {
  matcher: ["/canvas/:path*", "/auth/:path*"],
}
