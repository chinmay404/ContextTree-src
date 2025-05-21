"use client"

import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"

export default function DebugPage() {
  const { data: session, status } = useSession()
  const [envVars, setEnvVars] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkEnvVars = async () => {
      try {
        const res = await fetch("/api/auth/debug")
        if (res.ok) {
          const data = await res.json()
          setEnvVars(data)
        }
      } catch (error) {
        console.error("Failed to fetch environment variables:", error)
      } finally {
        setLoading(false)
      }
    }

    checkEnvVars()
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 p-4">
      <Card className="w-full max-w-2xl bg-gray-950 text-white border-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl">Authentication Debug</CardTitle>
          <CardDescription className="text-gray-400">This page helps diagnose authentication issues</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Session Status</h3>
            <div className="bg-gray-900 p-4 rounded-md">
              <p>
                Status:{" "}
                <span className={status === "authenticated" ? "text-green-500" : "text-yellow-500"}>{status}</span>
              </p>
              {session && (
                <pre className="mt-2 overflow-auto p-2 bg-gray-800 rounded text-sm">
                  {JSON.stringify(session, null, 2)}
                </pre>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Environment Variables</h3>
            <div className="bg-gray-900 p-4 rounded-md">
              {loading ? (
                <p>Loading environment variables...</p>
              ) : (
                <div>
                  <p>
                    NEXTAUTH_URL:{" "}
                    <span className={envVars.NEXTAUTH_URL ? "text-green-500" : "text-red-500"}>
                      {envVars.NEXTAUTH_URL || "Not set"}
                    </span>
                  </p>
                  <p>
                    NEXTAUTH_SECRET:{" "}
                    <span className={envVars.NEXTAUTH_SECRET ? "text-green-500" : "text-red-500"}>
                      {envVars.NEXTAUTH_SECRET ? "Set" : "Not set"}
                    </span>
                  </p>
                  <p>
                    GOOGLE_CLIENT_ID:{" "}
                    <span className={envVars.GOOGLE_CLIENT_ID ? "text-green-500" : "text-red-500"}>
                      {envVars.GOOGLE_CLIENT_ID ? "Set" : "Not set"}
                    </span>
                  </p>
                  <p>
                    GOOGLE_CLIENT_SECRET:{" "}
                    <span className={envVars.GOOGLE_CLIENT_SECRET ? "text-green-500" : "text-red-500"}>
                      {envVars.GOOGLE_CLIENT_SECRET ? "Set" : "Not set"}
                    </span>
                  </p>
                  <p>
                    MONGODB_URI:{" "}
                    <span className={envVars.MONGODB_URI ? "text-green-500" : "text-red-500"}>
                      {envVars.MONGODB_URI ? "Set" : "Not set"}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Troubleshooting Steps</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-300">
              <li>Make sure all environment variables are set correctly</li>
              <li>
                Verify that the Google OAuth redirect URI is set to{" "}
                <code className="bg-gray-800 px-1 rounded">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/api/auth/callback/google`
                    : "[your-domain]/api/auth/callback/google"}
                </code>
              </li>
              <li>Check that your MongoDB connection string is correct and the database is accessible</li>
              <li>Clear browser cookies and try signing in again</li>
              <li>Try using an incognito/private browser window</li>
            </ul>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => (window.location.href = "/auth/login")}>
              Return to Login
            </Button>
            <Button onClick={() => window.location.reload()}>Refresh Debug Info</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
