import { getServerSession } from "next-auth/next"
import { authOptions } from "../api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import ConversationCanvas from "@/components/conversation-canvas"
import { ReactFlowProvider } from "reactflow"

export default async function CanvasPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  return (
    <ReactFlowProvider>
      <main className="flex min-h-screen flex-col">
        <ConversationCanvas />
      </main>
    </ReactFlowProvider>
  )
}
