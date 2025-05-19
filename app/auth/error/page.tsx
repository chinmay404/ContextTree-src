"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Network, AlertTriangle, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function ErrorPage() {
  const searchParams = useSearchParams()
  const [errorDetails, setErrorDetails] = useState({
    title: "Authentication Error",
    description: "An error occurred during authentication.",
    action: "Please try again or contact support if the issue persists.",
  })

  useEffect(() => {
    const error = searchParams.get("error")

    if (error) {
      console.error("Auth error:", error)

      switch (error) {
        case "Configuration":
          setErrorDetails({
            title: "Server Configuration Error",
            description: "There is a problem with the server configuration.",
            action: "Please contact the administrator to resolve this issue.",
          })
          break
        case "AccessDenied":
          setErrorDetails({
            title: "Access Denied",
            description: "You do not have permission to sign in.",
            action: "Please contact support if you believe this is an error.",
          })
          break
        case "Verification":
          setErrorDetails({
            title: "Verification Error",
            description: "The verification link may have expired or already been used.",
            action: "Please try signing in again to receive a new verification link.",
          })
          break
        case "OAuthSignin":
          setErrorDetails({
            title: "OAuth Sign-in Error",
            description: "An error occurred while setting up the OAuth provider.",
            action: "Please try again or try a different sign-in method.",
          })
          break
        case "OAuthCallback":
          setErrorDetails({
            title: "OAuth Callback Error",
            description: "An error occurred while processing the authentication callback.",
            action: "This could be due to a misconfiguration or temporary issue with the authentication service.",
          })
          break
        case "OAuthCreateAccount":
          setErrorDetails({
            title: "Account Creation Error",
            description: "There was a problem creating your account.",
            action: "Please try again or contact support.",
          })
          break
        case "Callback":
          setErrorDetails({
            title: "Google Sign-in Error",
            description: "There was an issue with the Google authentication callback.",
            action: "This is often due to a configuration issue with the OAuth redirect URIs.",
          })
          break
        case "Default":
        default:
          setErrorDetails({
            title: "Authentication Error",
            description: `Error type: ${error}`,
            action: "Please try again or contact support if the issue persists.",
          })
      }
    }
  }, [searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <Network className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">{errorDetails.title}</CardTitle>
          <CardDescription>Authentication failed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {errorDetails.description}
              <p className="mt-2">{errorDetails.action}</p>
            </AlertDescription>
          </Alert>

          <div className="flex flex-col space-y-2">
            <Button asChild variant="outline">
              <Link href="/auth/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Sign In
              </Link>
            </Button>

            <Button asChild variant="link" className="mt-2">
              <Link href="/">Go to Homepage</Link>
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground mt-4">
            If you continue to experience issues, please contact{" "}
            <Link href="mailto:support@contexttree.com" className="text-primary hover:underline">
              support@contexttree.com
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
