"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

export default function AuthDebugPage() {
  const { data: session, status } = useSession()
  const [envVars, setEnvVars] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check for environment variables (client-side only)
    const checkEnvVars = async () => {
      try {
        const response = await fetch("/api/auth/debug")
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setEnvVars(data.env || {})
      } catch (err) {
        console.error("Failed to fetch environment info:", err)
        setError(err instanceof Error ? err.message : String(err))
      }
    }

    checkEnvVars()
  }, [])

  return (
    <div className="container mx-auto py-10 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Debug Information</CardTitle>
          <CardDescription>Use this page to diagnose authentication issues</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Session Status</h3>
            <p className="text-sm text-muted-foreground">
              Current authentication status: <strong>{status}</strong>
            </p>

            {status === "authenticated" && session && (
              <div className="mt-2 p-4 bg-muted rounded-md">
                <pre className="text-xs overflow-auto">{JSON.stringify(session, null, 2)}</pre>
              </div>
            )}

            {status === "unauthenticated" && (
              <Alert className="mt-2">
                <AlertDescription>You are not currently authenticated. Try signing in again.</AlertDescription>
              </Alert>
            )}
          </div>

          <div>
            <h3 className="text-lg font-medium">Environment Check</h3>
            <p className="text-sm text-muted-foreground">Checking for required environment variables</p>

            {error && (
              <Alert variant="destructive" className="mt-2">
                <AlertDescription>Error fetching environment data: {error}</AlertDescription>
              </Alert>
            )}

            {Object.keys(envVars).length > 0 && (
              <div className="mt-2 space-y-2">
                {Object.entries(envVars).map(([key, value]) => (
                  <div key={key} className="flex items-center">
                    <span className="font-mono text-sm">{key}:</span>
                    <span className="ml-2 text-sm">{value === true ? "✅ Set" : "❌ Missing"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex space-x-4 pt-4">
            <Button asChild>
              <Link href="/auth/login">Try Sign In Again</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Return to Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
