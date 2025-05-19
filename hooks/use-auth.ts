"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"

export function useAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const isAuthenticated = status === "authenticated"
  const isLoading = status === "loading"
  const user = session?.user

  const login = async (email: string, password: string) => {
    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
    })
    return result
  }

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
    login,
    loginWithGoogle,
    logout,
    requireAuth,
  }
}
