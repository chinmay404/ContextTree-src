import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if the path is a protected route
  const isProtectedRoute = pathname.startsWith("/canvas")

  // Check if the path is an auth route
  const isAuthRoute = pathname.startsWith("/auth")

  // Get the token
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  // If the route is protected and the user is not authenticated, redirect to login
  if (isProtectedRoute && !token) {
    const url = new URL("/auth/login", request.url)
    url.searchParams.set("callbackUrl", encodeURI(request.url))
    return NextResponse.redirect(url)
  }

  // If the user is authenticated and trying to access an auth route, redirect to canvas
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL("/canvas", request.url))
  }

  return NextResponse.next()
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: ["/canvas/:path*", "/auth/:path*"],
}
