"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import ConversationCanvas from "@/components/conversation-canvas"
import { ReactFlowProvider } from "reactflow"

export default function CanvasPage() {
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
    <ReactFlowProvider>
      <main className="flex min-h-screen flex-col">
        <ConversationCanvas />
      </main>
    </ReactFlowProvider>
  )
}
