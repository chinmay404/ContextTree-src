"use client"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import ConversationCanvas from "@/components/conversation-canvas"
import { ReactFlowProvider } from "reactflow"
import { Loader2 } from "lucide-react"

export default function CanvasPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // If not authenticated, the middleware will handle the redirect
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    )
  }

  if (status === "unauthenticated") {
    router.push("/login?callbackUrl=/canvas")
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Not authenticated. Redirecting to login...</p>
        </div>
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
