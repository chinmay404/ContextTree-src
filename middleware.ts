import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Get the token from the request
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Log for debugging
  console.log(`Middleware checking path: ${pathname}, authenticated: ${!!token}`)

  // Define protected routes
  const protectedRoutes = ["/canvas"]
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

  // Define auth routes
  const authRoutes = ["/auth/login", "/auth/register"]
  const isAuthRoute = authRoutes.some((route) => pathname === route)

  // Redirect logic
  if (isProtectedRoute && !token) {
    // Redirect to login if trying to access protected route without auth
    const url = new URL("/auth/login", request.url)
    url.searchParams.set("callbackUrl", encodeURI(request.url))
    return NextResponse.redirect(url)
  }

  if (isAuthRoute && token) {
    // Redirect to canvas if already authenticated
    return NextResponse.redirect(new URL("/canvas", request.url))
  }

  return NextResponse.next()
}

// Configure which paths the middleware runs on
export const config = {
  matcher: ["/canvas/:path*", "/auth/login", "/auth/register"],
}
