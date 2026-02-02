"use client";

import { signIn, getProviders } from "next-auth/react";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Network, AlertCircle } from "lucide-react";

interface Provider {
  id: string;
  name: string;
  type: string;
  signinUrl: string;
  callbackUrl: string;
}

function SignInContent() {
  const [providers, setProviders] = useState<Record<string, Provider> | null>(null);
  const [loading, setLoading] = useState(false);
  const [clickedProvider, setClickedProvider] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const router = useRouter();

  useEffect(() => {
    const setProvidersData = async () => {
      const res = await getProviders();
      setProviders(res);
    };
    setProvidersData();
  }, []);

  const handleSignIn = async (providerId: string) => {
    setLoading(true);
    setClickedProvider(providerId);
    try {
      await signIn(providerId, { callbackUrl });
    } catch (error) {
      console.error("Sign in error:", error);
    }
    // We don't set loading back to false because we're redirecting
  };

  const getErrorMessage = (error: string) => {
    switch (error) {
      case "OAuthSignin": return "Error in constructing an authorization URL.";
      case "OAuthCallback": return "Error handling response from provider.";
      case "OAuthCreateAccount": return "Could not create account.";
      case "EmailCreateAccount": return "Could not create email account.";
      case "Callback": return "Error in callback handler.";
      case "OAuthAccountNotLinked": return "Account exists with different provider.";
      case "EmailSignin": return "Check your email address.";
      case "CredentialsSignin": return "Sign in failed. Check your details.";
      case "SessionRequired": return "Please sign in to access this page.";
      default: return "Unable to sign in.";
    }
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white flex flex-col">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight absolute left-1/2 transform -translate-x-1/2">
            <Network className="w-5 h-5" />
            <span>ContextTree</span>
          </div>

          <div className="w-20"></div> {/* Spacer for alignment */}
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center p-6 pt-24">
        <div className="w-full max-w-md space-y-12">
          
          <div className="space-y-4 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-gray-500">Sign in to continue your session</p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-sm text-red-600">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <span className="font-medium block mb-1">Authentication Error</span>
                {getErrorMessage(error)}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {providers && Object.values(providers).map((provider) => (
              <Button
                key={provider.id}
                onClick={() => handleSignIn(provider.id)}
                disabled={loading}
                variant="outline"
                className="w-full h-12 text-base font-medium border-gray-200 hover:bg-gray-50 hover:text-black transition-all relative"
              >
                {/* Spinner when specific provider is clicked */}
                {loading && clickedProvider === provider.id ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80">
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : null}
                
                {provider.id === "google" && (
                   <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                {provider.id === "github" && (
                   <svg className="mr-2 h-5 w-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                   </svg>
                )}
                Continue with {provider.name}
              </Button>
            ))}

            {!providers && (
               <div className="space-y-3">
                  <div className="h-12 w-full bg-gray-100 rounded animate-pulse"></div>
                  <div className="h-12 w-full bg-gray-100 rounded animate-pulse"></div>
               </div>
            )}
          </div>

          <div className="text-center text-sm text-gray-400">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
       <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
       </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
