import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  // Skip Next.js internal routes and public files
  if (
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.includes("/api/") ||
    request.nextUrl.pathname.includes(".") ||
    request.nextUrl.pathname === "/"
  ) {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl
  const isAuthPage = pathname.startsWith("/auth")
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  // Redirect to login if accessing canvas without authentication
  if (!token && pathname.startsWith("/canvas")) {
    const url = new URL("/auth/login", request.url)
    url.searchParams.set("callbackUrl", encodeURI(request.url))
    return NextResponse.redirect(url)
  }

  // Redirect to canvas if accessing auth pages while authenticated
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/canvas", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)", "/canvas/:path*"],
}
