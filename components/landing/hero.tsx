"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Zap,
  Brain,
  MessageSquareX,
  Lightbulb,
  GitBranch,
  Bot,
  MessageSquare,
} from "lucide-react";
import AnimateInView from "./animate-in-view";

export default function Hero() {
  const [scrollY, setScrollY] = useState(0);
  const [hovered, setHovered] = useState(false);

  // Track scroll position for parallax effect
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="relative pt-24 pb-20 md:pt-36 md:pb-32 overflow-hidden">
      {/* Enhanced background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
      <div className="absolute top-0 right-1/4 w-[800px] h-[800px] bg-gradient-radial from-primary/8 via-primary/3 to-transparent rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-gradient-radial from-orange-500/6 via-orange-500/2 to-transparent rounded-full blur-3xl" />
      {/* Animated grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_calc(50%-1px),hsl(var(--border))_50%,transparent_calc(50%+1px)),linear-gradient(0deg,transparent_calc(50%-1px),hsl(var(--border))_50%,transparent_calc(50%+1px))] bg-[size:50px_50px]" />
      </div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Compelling headline section */}
        <div className="text-center max-w-5xl mx-auto mb-16">
          <AnimateInView animation="fadeUp">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-orange-500/10 text-primary text-sm font-medium mb-8 border border-primary/20">
              <Zap className="h-4 w-4 mr-2 animate-pulse" />
              <span>Stop Losing Your Best Ideas in Chat Chaos</span>
            </div>
          </AnimateInView>

          <AnimateInView animation="fadeUp" delay={0.1}>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] text-foreground mb-8">
              <span className="block">Your AI Conversations</span>
              <span className="block text-gradient bg-gradient-to-r from-primary via-orange-500 to-primary bg-clip-text text-transparent">
                Finally Make Sense
              </span>
            </h1>
          </AnimateInView>

          <AnimateInView animation="fadeUp" delay={0.2}>
            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-12">
              Transform chaotic AI conversations into organized visual threads.
              <span className="text-foreground font-medium">
                {" "}
                Never lose context, never forget insights, never feel
                overwhelmed again.
              </span>
            </p>
          </AnimateInView>

          {/* Emotional hook with pain points */}
          <AnimateInView animation="fadeUp" delay={0.3}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
              <div className="flex items-center justify-center p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                <MessageSquareX className="h-5 w-5 text-red-500 mr-3" />
                <span className="text-sm font-medium text-red-600">
                  Lost important insights
                </span>
              </div>
              <div className="flex items-center justify-center p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
                <Brain className="h-5 w-5 text-orange-500 mr-3" />
                <span className="text-sm font-medium text-orange-600">
                  Cognitive overload
                </span>
              </div>
              <div className="flex items-center justify-center p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
                <Lightbulb className="h-5 w-5 text-yellow-500 mr-3" />
                <span className="text-sm font-medium text-yellow-600">
                  Scattered thinking
                </span>
              </div>
            </div>
          </AnimateInView>

          {/* CTA Buttons */}
          <AnimateInView animation="fadeUp" delay={0.4}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/canvas">
                <Button
                  size="lg"
                  className="px-10 py-4 text-lg rounded-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 shadow-2xl hover:shadow-primary/25 transition-all duration-500 transform hover:scale-105"
                >
                  Experience the Clarity
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                className="px-8 py-4 text-lg rounded-full border-2 border-primary/30 hover:bg-primary/5 transition-all duration-300"
              >
                See How It Works
              </Button>
            </div>
          </AnimateInView>

          {/* Social proof teaser */}
          <AnimateInView animation="fadeUp" delay={0.5}>
            <p className="text-sm text-muted-foreground mt-8">
              Join thousands of users who've transformed their AI conversations
            </p>
          </AnimateInView>
        </div>

        {/* Interactive demo preview */}
        <AnimateInView animation="fadeUp" delay={0.6}>
          <div className="relative max-w-6xl mx-auto">
            <motion.div
              className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/20 bg-gradient-to-br from-background to-muted/30"
              style={{
                transform: `translateY(${scrollY * 0.02}px)`,
              }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {/* Browser-like header */}
              <div className="bg-muted/50 p-4 border-b border-border/50 flex items-center">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="text-sm font-medium ml-4 text-muted-foreground">
                  contexttree.app - Your Organized AI Conversations
                </div>
              </div>

              {/* Canvas preview */}
              <div className="h-[400px] md:h-[500px] bg-gradient-to-br from-background via-muted/10 to-background relative overflow-hidden">
                {/* Animated nodes and connections */}
                <svg
                  className="absolute inset-0 w-full h-full"
                  viewBox="0 0 800 400"
                >
                  {/* Connection lines */}
                  <motion.path
                    d="M100,200 Q250,150 400,200"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="5,5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, delay: 1 }}
                  />
                  <motion.path
                    d="M400,200 Q550,250 700,200"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="5,5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, delay: 1.5 }}
                  />
                </svg>

                {/* Floating conversation nodes */}
                <motion.div
                  className="absolute top-1/2 left-20 transform -translate-y-1/2 bg-primary/10 border border-primary/20 rounded-lg p-4 max-w-xs"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <div className="text-xs font-medium mb-2 text-primary">
                    Main Thread
                  </div>
                  <div className="text-xs text-foreground">
                    How does machine learning work?
                  </div>
                </motion.div>

                <motion.div
                  className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 max-w-xs"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                >
                  <div className="text-xs font-medium mb-2 text-orange-500">
                    Deep Dive
                  </div>
                  <div className="text-xs text-foreground">
                    Neural network architectures...
                  </div>
                </motion.div>

                <motion.div
                  className="absolute bottom-1/3 right-20 transform translate-y-1/2 bg-green-500/10 border border-green-500/20 rounded-lg p-4 max-w-xs"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.6 }}
                >
                  <div className="text-xs font-medium mb-2 text-green-500">
                    Related Insight
                  </div>
                  <div className="text-xs text-foreground">
                    Applications in healthcare...
                  </div>
                </motion.div>

                {/* Floating elements for visual interest */}
                <div className="absolute top-4 right-4 opacity-20">
                  <Brain className="h-8 w-8 text-primary animate-pulse" />
                </div>
                <div className="absolute bottom-4 left-4 opacity-20">
                  <Lightbulb className="h-6 w-6 text-orange-500 animate-bounce" />
                </div>
              </div>
            </motion.div>
          </div>
        </AnimateInView>
      </div>{" "}
    </section>
  );
}
