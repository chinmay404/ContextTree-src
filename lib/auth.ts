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

// Add the missing authOptions export
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
}
