"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Network, AlertTriangle } from "lucide-react"
import Link from "next/link"

export default function AuthError() {
  const searchParams = useSearchParams()
  const [errorMessage, setErrorMessage] = useState<string>("")

  useEffect(() => {
    const error = searchParams.get("error")

    if (error === "CredentialsSignin") {
      setErrorMessage("Invalid email or password. Please try again.")
    } else if (error === "OAuthAccountNotLinked") {
      setErrorMessage(
        "This email is already associated with another account. Please sign in using the original provider.",
      )
    } else if (error === "OAuthSignin" || error === "OAuthCallback") {
      setErrorMessage("There was a problem with the OAuth sign-in. Please try again.")
    } else if (error === "AccessDenied") {
      setErrorMessage("Access denied. You do not have permission to sign in.")
    } else if (error === "Verification") {
      setErrorMessage("The verification token is invalid or has expired.")
    } else {
      setErrorMessage("An unexpected authentication error occurred. Please try again.")
    }
  }, [searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="flex items-center gap-2">
              <Network className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">ContextTree</span>
            </div>
          </div>
          <div className="flex justify-center mb-4">
            <div className="bg-red-100 p-3 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Authentication Error</CardTitle>
          <CardDescription>{errorMessage}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>Please try signing in again or contact support if the problem persists.</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          <Button asChild variant="outline">
            <Link href="/">Go Home</Link>
          </Button>
          <Button asChild>
            <Link href="/auth/signin">Try Again</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
