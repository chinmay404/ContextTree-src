"use client"

import type React from "react"

import ContextTree from "@/components/conversation-canvas"
import { ThemeProvider } from "@/components/theme-provider"
import { ReactFlowProvider } from "reactflow"
import { useEffect } from "react"

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

export default function Home() {
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
