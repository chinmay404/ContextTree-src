"use client"

import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

// Simple client-side implementation of getUserSessionId
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

// Server-side auth options - this will be used in a separate server file
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Always redirect to canvas after successful login
      if (url.startsWith("/api/auth/callback") || url.startsWith("/auth/login")) {
        return `${baseUrl}/canvas`
      }

      // Handle relative URLs
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`
      }

      // Handle same-origin URLs
      if (new URL(url).origin === baseUrl) {
        return url
      }

      // Default to canvas
      return `${baseUrl}/canvas`
    },
  },
}
