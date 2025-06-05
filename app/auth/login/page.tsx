"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/canvas";
  const error = searchParams?.get("error");

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("google", { callbackUrl });
    } catch (error) {
      console.error("Sign in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl bg-white p-8 shadow-lg">
        <div className="flex flex-col items-center space-y-4">
          <Image
            src="/contexttree-logo.png"
            alt="ContextTree"
            width={48}
            height={48}
          />
          <h2 className="text-2xl font-bold text-foreground">
            Sign in to ContextTree
          </h2>
          <p className="text-sm text-muted-foreground">
            Continue with Google to access your account
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-500/10 p-4">
            <p className="text-center text-sm text-red-500">
              There was an issue with the Google sign-in. Please try again.
            </p>
          </div>
        )}

        <div>
          <Button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            size="lg"
            className="w-full"
          >
            {isLoading ? "Signing in..." : "Continue with Google"}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <a href="/terms" className="text-primary underline">
            Terms of Service
          </a>{" "}
          &{" "}
          <a href="/privacy" className="text-primary underline">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
