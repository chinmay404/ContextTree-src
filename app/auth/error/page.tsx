"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Network } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  // Map error codes to user-friendly messages
  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case "Configuration":
        return "There is a problem with the server configuration. Please contact support."
      case "AccessDenied":
        return "You do not have permission to sign in."
      case "Verification":
        return "The verification link may have expired or already been used."
      case "OAuthSignin":
      case "OAuthCallback":
      case "OAuthCreateAccount":
      case "EmailCreateAccount":
      case "Callback":
      case "OAuthAccountNotLinked":
      case "EmailSignin":
      case "CredentialsSignin":
        return "There was a problem with your sign in attempt. Please try again."
      case "SessionRequired":
        return "You must be signed in to access this page."
      default:
        return "An unexpected error occurred. Please try again later."
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2">
        <Network className="h-6 w-6 text-primary" />
        <span className="font-semibold text-lg tracking-tight">ContextTree</span>
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Authentication Error</CardTitle>
          <CardDescription className="text-center">There was a problem with your authentication</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-destructive/15 text-destructive p-4 rounded-md">
            <p className="font-medium">Error: {error || "Unknown"}</p>
            <p className="mt-2">{getErrorMessage(error)}</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          <Button asChild variant="outline">
            <Link href="/">Return Home</Link>
          </Button>
          <Button asChild>
            <Link href="/auth/signin">Try Again</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
