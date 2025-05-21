// Re-export the client-side implementation
export { getUserSessionId, isUserLoggedIn } from "./auth-client"

// Note: NextAuth configuration is now only in app/api/auth/[...nextauth]/route.ts
// This file no longer imports MongoDB or NextAuth
