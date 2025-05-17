import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    // Check if the user is trying to access the canvas page
    if (request.nextUrl.pathname.startsWith("/canvas")) {
      // If not authenticated, redirect to sign in
      if (!token) {
        const signInUrl = new URL("/auth/signin", request.url)
        signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname)
        return NextResponse.redirect(signInUrl)
      }
    }

    return NextResponse.next()
  } catch (error) {
    console.error("Middleware error:", error)

    // Redirect to error page with generic error
    const errorUrl = new URL("/auth/error", request.url)
    errorUrl.searchParams.set("error", "ServerError")
    return NextResponse.redirect(errorUrl)
  }
}

export const config = {
  matcher: ["/canvas/:path*"],
}
