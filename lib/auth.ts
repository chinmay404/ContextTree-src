import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "./mongodb"

// This file is for client-side auth utilities
// Server-side auth utilities are in auth-server.ts

// Re-export the getUserSessionId function for backward compatibility
// but make it a client-side wrapper that calls the server function
export async function getUserSessionId() {
  try {
    const response = await fetch("/api/auth/session")
    const session = await response.json()
    return session?.user?.id || null
  } catch (error) {
    console.error("Error getting user session ID:", error)
    return null
  }
}

// Add the NextAuth configuration
export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  callbacks: {
    async session({ session, token, user }) {
      if (session.user) {
        session.user.id = token?.sub || user?.id
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}
