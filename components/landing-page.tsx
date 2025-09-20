"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import LiquidEther from "./LiquidEther";

export function LandingPage() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push("/waitlist");
  };

  const handleJoinWaitlist = () => {
    router.push("/waitlist");
  };

  return (
    <div className="h-screen relative overflow-hidden bg-white">
      {/* LiquidEther Background */}
      <div className="absolute inset-0 z-0">
        <LiquidEther
          colors={["#E5E7EB", "#F3F4F6", "#D1D5DB"]}
          mouseForce={8}
          cursorSize={80}
          isViscous={false}
          viscous={30}
          iterationsViscous={32}
          iterationsPoisson={32}
          resolution={0.3}
          isBounce={false}
          autoDemo={true}
          autoSpeed={0.2}
          autoIntensity={1.0}
          takeoverDuration={0.5}
          autoResumeDelay={4000}
          autoRampDuration={1.2}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* Content Overlay */}
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="px-6 py-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center"
            >
              <div className="w-10 h-10 text-gray-900">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 100 100"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Root node (top) */}
                  <rect
                    x="35"
                    y="10"
                    width="30"
                    height="20"
                    rx="4"
                    ry="4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />

                  {/* Connection lines */}
                  <path
                    d="M50 30 L50 45 M35 55 L50 45 L65 55"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Left child node */}
                  <rect
                    x="15"
                    y="65"
                    width="25"
                    height="20"
                    rx="4"
                    ry="4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />

                  {/* Right child node */}
                  <rect
                    x="60"
                    y="65"
                    width="25"
                    height="20"
                    rx="4"
                    ry="4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                </svg>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Button
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 backdrop-blur-sm"
                onClick={() => router.push("/auth/signin")}
              >
                Sign In
              </Button>
            </motion.div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="px-6 py-24 h-[calc(100vh-120px)] flex items-center justify-center">
          <div className="max-w-6xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Badge
                variant="outline"
                className="mb-6 border-gray-300 text-gray-700 bg-white/10 backdrop-blur-sm cursor-pointer hover:bg-white/20 transition-all duration-300"
                onClick={handleJoinWaitlist}
              >
                Beta • Join the Waitlist
              </Badge>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-light text-gray-900 mb-6 leading-tight drop-shadow-lg">
                <span className="text-gray-800">ContextTree</span>
                <br />
                The First Tree-Structured
                <br />
                <span className="text-gray-600">Canvas for LLMs</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-700 mb-12 max-w-4xl mx-auto font-light leading-relaxed drop-shadow-md">
                Build AI conversations you can actually understand, debug, and
                control. Map every interaction on a visual canvas, branch
                safely, and never lose context again.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex justify-center"
            >
              <Button
                onClick={handleGetStarted}
                size="lg"
                className="bg-gray-900 hover:bg-gray-800 text-white border-0 px-8 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Join Waitlist
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  );
}
