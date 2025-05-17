"use client"

import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  let errorMessage = "An unknown error occurred during authentication."

  if (error === "OAuthAccountNotLinked") {
    errorMessage = "This email is already associated with another account. Please sign in using a different method."
  } else if (error === "AccessDenied") {
    errorMessage = "Access denied. You do not have permission to access this resource."
  } else if (error === "Verification") {
    errorMessage = "The verification link is invalid or has expired."
  } else if (error === "Configuration") {
    errorMessage = "There is a problem with the server configuration. Please contact support."
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Authentication Error</CardTitle>
          <CardDescription>There was a problem with your authentication</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" asChild>
            <Link href="/auth/login">Back to Login</Link>
          </Button>
          <Button asChild>
            <Link href="/">Go to Home</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
