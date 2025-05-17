import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  const isAuthenticated = !!token

  // Path the user is trying to access
  const path = request.nextUrl.pathname

  // Public paths that don't require authentication
  const isPublicPath = path === "/" || path.startsWith("/auth/") || path.startsWith("/api/auth/")

  // Protected paths that require authentication
  const isProtectedPath = path === "/canvas" || path.startsWith("/canvas/")

  // If trying to access a protected path without being authenticated
  if (isProtectedPath && !isAuthenticated) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  // If trying to access auth pages while already authenticated
  if (isPublicPath && path.startsWith("/auth/") && isAuthenticated) {
    return NextResponse.redirect(new URL("/canvas", request.url))
  }

  return NextResponse.next()
}

// Configure which paths the middleware runs on
export const config = {
  matcher: ["/", "/canvas", "/canvas/:path*", "/auth/:path*"],
}
