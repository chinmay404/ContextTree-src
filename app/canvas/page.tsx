import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getUserConversations } from "@/app/actions/canvas"
import { redirect } from "next/navigation"
import CanvasClient from "./canvas-client"

export default async function CanvasPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  // Fetch initial data on the server
  let initialData = {
    conversations: [],
    activeConversationId: null,
    sessionId: null,
  }

  try {
    const result = await getUserConversations()
    if (result.success) {
      initialData = {
        conversations: result.conversations,
        activeConversationId: result.activeConversationId,
        sessionId: result.sessionId,
      }
    }
  } catch (error) {
    console.error("Error fetching initial data:", error)
    // Continue with empty data - the client will handle creating default conversation
  }

  return <CanvasClient initialData={initialData} />
}
