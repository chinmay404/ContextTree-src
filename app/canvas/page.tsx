"use client"

import type React from "react"

import ContextTree from "@/components/conversation-canvas"
import { ThemeProvider } from "@/components/theme-provider"
import { ReactFlowProvider } from "reactflow"
import { useEffect } from "react"
import { useSession } from "next-auth/react"

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

export default function CanvasPage() {
  const { status } = useSession({
    required: true,
  })

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading your canvas...</p>
        </div>
      </div>
    )
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ErrorHandler>
        <ReactFlowProvider>
          <main className="flex min-h-screen flex-col">
            <ContextTree />
          </main>
        </ReactFlowProvider>
      </ErrorHandler>
    </ThemeProvider>
  )
}
