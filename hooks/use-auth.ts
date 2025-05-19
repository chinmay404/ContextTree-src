"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"

export function useAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const isAuthenticated = status === "authenticated"
  const isLoading = status === "loading"
  const user = session?.user

  const loginWithGoogle = () => {
    signIn("google", { callbackUrl: "/canvas" })
  }

  const logout = () => {
    signOut({ callbackUrl: "/" })
  }

  const requireAuth = () => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login")
    }
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    loginWithGoogle,
    logout,
    requireAuth,
  }
}
