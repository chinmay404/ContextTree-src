"use client";

import { signIn, getProviders } from "next-auth/react";
import { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
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
import { ArrowLeft } from "lucide-react";
import LiquidEther from "@/components/LiquidEther";

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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100">
      {/* LiquidEther Background */}
      <div className="absolute inset-0 z-0">
        <LiquidEther 
          colors={["#F8FAFC", "#F1F5F9", "#E2E8F0"]}
          mouseForce={3}
          cursorSize={60}
          isViscous={true}
          viscous={50}
          iterationsViscous={16}
          iterationsPoisson={16}
          resolution={0.2}
          isBounce={false}
          autoDemo={true}
          autoSpeed={0.1}
          autoIntensity={0.3}
          takeoverDuration={1.0}
          autoResumeDelay={6000}
          autoRampDuration={2.0}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
      
      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="p-6 flex items-center justify-between"
        >
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to Home</span>
          </button>
          
          {/* Tree Logo */}
          <div className="flex items-center">
            <div className="w-8 h-8 text-slate-600">
              <svg width="32" height="32" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                {/* Root node (top) */}
                <rect x="35" y="10" width="30" height="20" rx="4" ry="4" fill="none" stroke="currentColor" strokeWidth="3"/>
                
                {/* Connection lines */}
                <path d="M50 30 L50 45 M35 55 L50 45 L65 55" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                
                {/* Left child node */}
                <rect x="15" y="65" width="25" height="20" rx="4" ry="4" fill="none" stroke="currentColor" strokeWidth="3"/>
                
                {/* Right child node */}
                <rect x="60" y="65" width="25" height="20" rx="4" ry="4" fill="none" stroke="currentColor" strokeWidth="3"/>
              </svg>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full max-w-md"
          >
            {/* Glass Card */}
            <div className="backdrop-blur-md bg-white/20 border border-white/30 rounded-2xl p-8 shadow-2xl">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-center mb-8"
              >
                <h1 className="text-3xl font-bold text-slate-800 mb-2">
                  Welcome Back
                </h1>
                <p className="text-slate-600">
                  Sign in to continue building your conversation trees
                </p>
              </motion.div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-xl"
                >
                  <Alert className="border-none bg-transparent">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <AlertDescription className="text-red-700">
                      {getErrorMessage(error)}
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}

              <div className="space-y-4">
                {providers &&
                  Object.values(providers).map((provider) => (
                    <motion.div
                      key={provider.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        variant="outline"
                        onClick={() => handleSignIn(provider.id)}
                        disabled={loading}
                        className="w-full h-12 bg-white/30 hover:bg-white/40 border-white/40 hover:border-white/50 text-slate-700 hover:text-slate-800 backdrop-blur-sm transition-all duration-200 group"
                      >
                        <div className="flex items-center gap-3">
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
                          {loading ? (
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <span className="font-medium">Sign in with {provider.name}</span>
                          )}
                        </div>
                      </Button>
                    </motion.div>
                  ))}
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="mt-8 text-center"
              >
                <p className="text-sm text-slate-600">
                  By signing in, you agree to our terms of service and privacy policy
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
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
