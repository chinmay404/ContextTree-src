"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { UserNav } from "@/components/user-nav"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      setIsLoading(false)
    }
  }, [status, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-border">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Conversation Canvas</h1>
          </div>
          <UserNav user={session?.user || { name: "", email: "", image: "" }} />
        </div>
      </header>

      <main className="flex-1 container py-10">
        <h1 className="text-3xl font-bold mb-6">Welcome, {session?.user?.name}</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Your Conversations</h2>
            <p className="text-muted-foreground mb-4">
              You haven't created any conversations yet. Get started by creating your first conversation.
            </p>
            <Link href="/canvas">
              <Button>Create New Conversation</Button>
            </Link>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <p className="text-muted-foreground">No recent activity to display.</p>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-6">
        <div className="container">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Conversation Canvas. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
