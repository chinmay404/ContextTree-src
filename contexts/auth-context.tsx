"use client"

import type React from "react"

import { createContext, useContext, useState } from "react"
import { useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"

type AuthContextType = {
  user: any
  status: "loading" | "authenticated" | "unauthenticated"
  signIn: (provider: string, options?: any) => Promise<any>
  signOut: () => Promise<any>
  signUp: (name: string, email: string, password: string) => Promise<any>
  error: string | null
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const clearError = () => setError(null)

  const signUpUser = async (name: string, email: string, password: string) => {
    try {
      clearError()

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to sign up")
      }

      // After successful signup, sign in the user
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (signInResult?.error) {
        throw new Error(signInResult.error || "Failed to sign in after signup")
      }

      return signInResult
    } catch (error: any) {
      setError(error.message)
      throw error
    }
  }

  const value = {
    user: session?.user,
    status,
    signIn,
    signOut,
    signUp: signUpUser,
    error,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
