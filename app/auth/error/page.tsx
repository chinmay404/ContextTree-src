"use client"

import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  let errorMessage = "An unknown error occurred during authentication."
  let errorDescription = "Please try again or contact support if the problem persists."

  // Map error codes to user-friendly messages
  switch (error) {
    case "Configuration":
      errorMessage = "Server configuration error"
      errorDescription = "There is a problem with the server configuration. Please contact support."
      break
    case "AccessDenied":
      errorMessage = "Access denied"
      errorDescription = "You do not have permission to sign in."
      break
    case "Verification":
      errorMessage = "Verification error"
      errorDescription = "The verification link may have expired or already been used."
      break
    case "OAuthSignin":
    case "OAuthCallback":
    case "OAuthCreateAccount":
    case "EmailCreateAccount":
    case "Callback":
    case "OAuthAccountNotLinked":
    case "EmailSignin":
    case "CredentialsSignin":
      errorMessage = "Sign in error"
      errorDescription = "There was a problem signing you in. Please try again with different credentials."
      break
    case "SessionRequired":
      errorMessage = "Authentication required"
      errorDescription = "You must be signed in to access this page."
      break
    default:
      // Use default error message
      break
  }

  return (
    <div className="container flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-destructive">{errorMessage}</CardTitle>
          <CardDescription>{errorDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">You can try the following:</p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li>Check your credentials and try again</li>
            <li>Use a different authentication method</li>
            <li>Clear your browser cookies and try again</li>
            <li>Contact support if the issue persists</li>
          </ul>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" asChild>
            <Link href="/">Return Home</Link>
          </Button>
          <Button asChild>
            <Link href="/auth/login">Try Again</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
