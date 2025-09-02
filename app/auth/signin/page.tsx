"use client";

import { signIn, getProviders } from "next-auth/react";
import { useEffect, useState, Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSearchParams } from "next/navigation";

interface Provider {
  id: string;
  name: string;
  type: string;
  signinUrl: string;
  callbackUrl: string;
}

function SignInContent() {
  const [providers, setProviders] = useState<Record<string, Provider> | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    const setProvidersData = async () => {
      const res = await getProviders();
      setProviders(res);
    };
    setProvidersData();
  }, []);

  const handleSignIn = async (providerId: string) => {
    setLoading(true);
    try {
      await signIn(providerId, { callbackUrl: "/" });
    } catch (error) {
      console.error("Sign in error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (error: string) => {
    switch (error) {
      case "OAuthSignin":
        return "Error in constructing an authorization URL.";
      case "OAuthCallback":
        return "Error in handling the response from an OAuth provider.";
      case "OAuthCreateAccount":
        return "Could not create OAuth account in the database.";
      case "EmailCreateAccount":
        return "Could not create email account in the database.";
      case "Callback":
        return "Error in the OAuth callback handler route";
      case "OAuthAccountNotLinked":
        return "Another account with the same email address already exists.";
      case "EmailSignin":
        return "Check your email address.";
      case "CredentialsSignin":
        return "Sign in failed. Check the details you provided are correct.";
      case "SessionRequired":
        return "Please sign in to access this page.";
      default:
        return "Unable to sign in.";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Welcome to ContextTree - Your AI Conversation Flow Builder
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{getErrorMessage(error)}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Choose your sign-in method</CardTitle>
            <CardDescription>
              Sign in with your preferred provider to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {providers &&
              Object.values(providers).map((provider) => (
                <div key={provider.name}>
                  <Button
                    type="button"
                    onClick={() => handleSignIn(provider.id)}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2"
                    variant="outline"
                  >
                    {provider.id === "google" && (
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    )}
                    {loading
                      ? "Signing in..."
                      : `Sign in with ${provider.name}`}
                  </Button>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-8">Loading sign in...</div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
