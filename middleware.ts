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
          pathname.startsWith("/.well-known/") ||
          pathname === "/" ||
          pathname === "/landing" || // Direct marketing URL, no auth check
          pathname === "/privacy" || // Legal pages must be public
          pathname === "/terms" ||
          pathname.startsWith("/_next/") ||
          pathname.startsWith("/favicon.ico")
        ) {
          return true;
        }

        // Sessions use strategy "database" (pg adapter), so next-auth's
        // middleware `token` (JWT-only) is ALWAYS null — checking it alone
        // bounced signed-in users straight back to the login screen in a
        // loop (e.g. /admin). Treat the presence of the session cookie as
        // signed-in; pages and APIs still validate the session server-side.
        const hasDbSession = Boolean(
          req.cookies.get("__Secure-next-auth.session-token")?.value ||
            req.cookies.get("next-auth.session-token")?.value
        );
        return !!token || hasDbSession;
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
     * - static assets (.svg, .png, .jpg, etc.)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|\\.well-known|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.ico|.*\\.webp|public/).*)",
  ],
};
