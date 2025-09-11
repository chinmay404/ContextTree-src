import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // User limit checking is now handled via API routes
    // to maintain Edge Runtime compatibility
    // The actual limit checking happens in API endpoints
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Define which routes need authentication
        const { pathname } = req.nextUrl;

        // Allow public routes
        if (
          pathname.startsWith("/auth/") ||
          pathname.startsWith("/api/auth/") ||
          pathname.startsWith("/api/") || // Allow all API routes to handle their own auth
          pathname === "/" ||
          pathname === "/waitlist" || // Allow waitlist page
          pathname === "/profile" || // Allow profile page (it handles auth internally)
          pathname === "/user-limit-reached" || // Allow user limit page
          pathname.startsWith("/_next/") ||
          pathname.startsWith("/favicon.ico")
        ) {
          return true;
        }

        // Require authentication for all other routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
