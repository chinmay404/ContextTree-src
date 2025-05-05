import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Check if the path is one that requires authentication
  const isProtectedPath = ["/dashboard", "/canvas"].some((path) => request.nextUrl.pathname.startsWith(path))

  // If it's a protected path and the user is not authenticated, redirect to login
  if (isProtectedPath && !token) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If the user is already authenticated and trying to access login page, redirect to dashboard
  if (token && request.nextUrl.pathname === "/login") {
    const callbackUrl = request.nextUrl.searchParams.get("callbackUrl")
    if (callbackUrl && callbackUrl.startsWith("/")) {
      return NextResponse.redirect(new URL(callbackUrl, request.url))
    }
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: ["/dashboard/:path*", "/canvas/:path*", "/login"],
}
