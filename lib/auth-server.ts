"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function getServerAuthSession() {
  return await getServerSession(authOptions)
}

export async function getUserSessionId() {
  const session = await getServerSession(authOptions)
  return session?.user?.id || null
}
