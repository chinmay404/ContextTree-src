"use client"

import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function DebugPage() {
  const { data: session, status } = useSession()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Auth Debug Information</CardTitle>
          <CardDescription>Use this page to debug authentication issues</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Session Status</h3>
            <pre className="mt-2 rounded-md bg-muted p-4 overflow-auto">{status}</pre>
          </div>

          {status === "authenticated" ? (
            <div>
              <h3 className="text-lg font-medium">Session Data</h3>
              <pre className="mt-2 rounded-md bg-muted p-4 overflow-auto">{JSON.stringify(session, null, 2)}</pre>
            </div>
          ) : status === "loading" ? (
            <Alert>
              <AlertDescription>Loading session data...</AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertDescription>No active session found. You are not authenticated.</AlertDescription>
            </Alert>
          )}

          <div>
            <h3 className="text-lg font-medium">Environment Check</h3>
            <pre className="mt-2 rounded-md bg-muted p-4 overflow-auto">
              {`NEXTAUTH_URL: ${process.env.NEXT_PUBLIC_VERCEL_URL || "Not set"}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
