import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip Next.js internal routes and public files
  if (pathname.startsWith("/_next") || pathname.startsWith("/api/") || pathname.includes(".") || pathname === "/") {
    return NextResponse.next()
  }

  // Check if the path is for authentication
  const isAuthPage = pathname.startsWith("/auth")

  // Get the token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Redirect logic
  if (!token && !isAuthPage && pathname.startsWith("/canvas")) {
    // Redirect to login if not authenticated and trying to access canvas
    const url = new URL("/auth/login", request.url)
    url.searchParams.set("callbackUrl", encodeURI(request.url))
    return NextResponse.redirect(url)
  }

  if (token && isAuthPage) {
    // Redirect to canvas if already authenticated and trying to access auth pages
    return NextResponse.redirect(new URL("/canvas", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except static files, api routes, and the root path
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
}
