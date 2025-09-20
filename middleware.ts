import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here
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
