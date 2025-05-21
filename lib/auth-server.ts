import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"

// Import the authOptions from the route handler
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function getServerAuthSession() {
  return await getServerSession(authOptions)
}

export async function requireAuth() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  return session
}
