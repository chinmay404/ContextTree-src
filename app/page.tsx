"use client"

import type React from "react"

import ConversationCanvas from "@/components/conversation-canvas"
import { ThemeProvider } from "@/components/theme-provider"
import { ReactFlowProvider } from "reactflow"
import { useEffect } from "react"

// Update imports to include session hooks
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"

// Error handler component to catch ResizeObserver errors
function ErrorHandler({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message.includes("ResizeObserver")) {
        // Prevent the error from being displayed in the console
        event.preventDefault()
      }
    }

    window.addEventListener("error", handleError)
    return () => window.removeEventListener("error", handleError)
  }, [])

  return <>{children}</>
}

// Update the Home component to check for session
export default function Home() {
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect("/auth/signin")
    },
  })

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ErrorHandler>
        <ReactFlowProvider>
          <main className="flex min-h-screen flex-col">
            <ConversationCanvas />
          </main>
        </ReactFlowProvider>
      </ErrorHandler>
    </ThemeProvider>
  )
}
