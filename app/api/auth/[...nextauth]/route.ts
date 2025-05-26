import NextAuth from "next-auth"
import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Ensure baseUrl is properly formatted
      const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl

      // Handle callback URLs from OAuth providers
      if (url.startsWith("/api/auth/callback")) {
        return `${base}/canvas`
      }

      // Handle sign-in redirects
      if (url.startsWith("/auth/login") || url === "/auth/signin") {
        return `${base}/canvas`
      }

      // Handle relative URLs
      if (url.startsWith("/")) {
        return `${base}${url}`
      }

      // Validate same-origin URLs
      try {
        const urlObj = new URL(url)
        const baseObj = new URL(base)

        if (urlObj.origin === baseObj.origin) {
          return url
        }
      } catch (error) {
        // Invalid URL, fallback to canvas
        console.warn("Invalid redirect URL:", url)
      }

      // Default fallback
      return `${base}/canvas`
    },
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
