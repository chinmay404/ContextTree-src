import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "./mongodb"

// Keep the original getUserSessionId function that was in the file
export const getUserSessionId = (): string => {
  // Check if we already have a session ID in localStorage
  const existingSessionId = localStorage.getItem("user_session_id")

  if (existingSessionId) {
    return existingSessionId
  }

  // Generate a new session ID
  const newSessionId = `user_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`
  localStorage.setItem("user_session_id", newSessionId)

  return newSessionId
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
