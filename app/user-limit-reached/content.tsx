"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Clock, RefreshCw, Home } from "lucide-react";

export default function UserLimitReachedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(30);
  const [isRetrying, setIsRetrying] = useState(false);

  const message =
    searchParams.get("message") ||
    "Thank you! Maximum user limit reached on system. Please wait, we are upgrading our services.";

  // Countdown timer for auto-retry
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleRetry();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);

    try {
      // Check if user can access now
      const response = await fetch("/api/user-limit/check");
      const data = await response.json();

      if (data.canAccess) {
        router.push("/");
      } else {
        setCountdown(30); // Reset countdown
      }
    } catch (error) {
      console.error("Error checking user limit:", error);
      setCountdown(30); // Reset countdown on error
    } finally {
      setIsRetrying(false);
    }
  };

  const handleGoHome = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4"
            >
              <Users className="w-8 h-8 text-white" />
            </motion.div>

            <CardTitle className="text-2xl font-light text-slate-900">
              System at Capacity
            </CardTitle>
            <CardDescription className="text-slate-600 mt-2">
              We&apos;re currently at maximum capacity
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert className="border-blue-200 bg-blue-50/80">
              <Users className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 font-medium">
                {message}
              </AlertDescription>
            </Alert>

            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-slate-600">
                <Clock className="w-4 h-4" />
                <span className="text-sm">
                  Auto-retry in {countdown} seconds
                </span>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2.5 rounded-lg transition-all duration-200"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Checking availability...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try again now
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleGoHome}
                  variant="outline"
                  className="w-full border-slate-200 text-slate-600 hover:bg-slate-50 py-2.5 rounded-lg transition-all duration-200"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to homepage
                </Button>
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs text-slate-500">
                We&apos;re working hard to increase capacity. <br />
                Thank you for your patience! 🚀
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Background animation */}
        <motion.div
          className="absolute inset-0 -z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
        >
          <div className="absolute top-10 left-10 w-20 h-20 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-10 right-10 w-20 h-20 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-20 h-20 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </motion.div>
      </motion.div>
    </div>
  );
}
