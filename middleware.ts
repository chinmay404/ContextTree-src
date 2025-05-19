import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  const isAuthPage = request.nextUrl.pathname.startsWith("/auth")

  // Redirect authenticated users away from auth pages
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/canvas", request.url))
  }

  // Protect the canvas page
  if (request.nextUrl.pathname.startsWith("/canvas") && !token) {
    return NextResponse.redirect(new URL("/auth/signin", request.url))
  }

  // Protect profile and settings pages
  if ((request.nextUrl.pathname === "/profile" || request.nextUrl.pathname === "/settings") && !token) {
    return NextResponse.redirect(new URL("/auth/signin", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/canvas/:path*", "/auth/:path*", "/profile", "/settings"],
}
