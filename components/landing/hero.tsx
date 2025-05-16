"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { ArrowRight, Sparkles } from "lucide-react"
import AnimateInView from "./animate-in-view"

export default function Hero() {
  const [hovered, setHovered] = useState(false)

  return (
    <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <AnimateInView animation="fadeRight">
            <div className="max-w-xl">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight text-foreground">
                Keep Every Thread in Sight
              </h1>
              <p className="mt-4 text-lg md:text-xl text-muted-foreground">
                An interactive, node-based canvas that preserves your main chat while you explore side-conversations.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/canvas">
                  <Button size="lg" className="px-8">
                    Try It Now
                  </Button>
                </Link>
                <Button variant="link" size="lg" className="text-primary">
                  Learn How It Works
                </Button>
              </div>
            </div>
          </AnimateInView>

          <AnimateInView animation="fadeLeft">
            <motion.div
              className="relative rounded-xl overflow-hidden shadow-xl border border-border/20"
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              animate={{
                scale: hovered ? 1.02 : 1,
              }}
              transition={{ duration: 0.3 }}
            >
              {/* Abstract flowing background */}
              <div className="absolute inset-0 bg-gradient-to-br from-background via-muted to-background z-0 overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="gradient2" x1="100%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#FF8A3D" stopOpacity="0.1" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,500 C150,400 350,300 500,500 C650,700 850,600 1000,500 L1000,1000 L0,1000 Z"
                      fill="url(#gradient1)"
                    />
                    <path
                      d="M0,600 C200,500 300,800 500,700 C700,600 800,800 1000,700 L1000,1000 L0,1000 Z"
                      fill="url(#gradient2)"
                    />
                  </svg>
                </div>
              </div>

              {/* Content container */}
              <div className="relative z-10 p-8 h-[320px] md:h-[400px] flex items-center justify-center">
                <div className="w-full max-w-md">
                  {/* Main conversation panel */}
                  <div className="relative bg-background/80 backdrop-blur-md rounded-lg border border-border/40 shadow-lg p-4 mb-6 transition-all duration-300 hover:shadow-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary"></div>
                        <h3 className="font-medium text-sm">Main Conversation</h3>
                      </div>
                      <div className="text-xs text-muted-foreground">Active</div>
                    </div>

                    <div className="space-y-2">
                      <div className="bg-muted/50 rounded p-2 text-xs">
                        How can I implement a recursive algorithm for tree traversal?
                      </div>
                      <div className="bg-primary/10 rounded p-2 text-xs ml-4 border-l-2 border-primary/30">
                        I'll explain recursive tree traversal with examples for in-order, pre-order, and post-order
                        approaches...
                      </div>
                    </div>

                    {/* Branch indicators */}
                    <div className="absolute -right-2 top-1/3 transform translate-x-full flex flex-col gap-2">
                      <motion.div
                        className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-white cursor-pointer shadow-md"
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Sparkles className="h-4 w-4" />
                      </motion.div>
                      <div className="h-2 w-2 rounded-full bg-orange-500/80 shadow-sm"></div>
                      <div className="h-2 w-2 rounded-full bg-blue-500/80 shadow-sm"></div>
                    </div>
                  </div>

                  {/* Branch conversation preview */}
                  <motion.div
                    className="bg-primary/5 backdrop-blur-sm rounded-lg border border-primary/20 shadow-md p-4 ml-12 relative transition-all duration-300 hover:shadow-lg hover:bg-primary/10"
                    initial={{ opacity: 0.8, y: 10 }}
                    animate={{
                      opacity: hovered ? 1 : 0.8,
                      y: hovered ? 0 : 10,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="absolute -left-12 top-1/2 transform -translate-y-1/2">
                      <svg width="12" height="40" viewBox="0 0 12 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M1 0V30C1 35.5228 5.47715 40 11 40H12"
                          stroke="hsl(var(--primary))"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                        />
                      </svg>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary"></div>
                        <h3 className="font-medium text-sm">Branch Exploration</h3>
                      </div>
                      <div className="text-xs text-primary">Active Branch</div>
                    </div>

                    <div className="space-y-2">
                      <div className="bg-muted/50 rounded p-2 text-xs">
                        Can you explain the time complexity differences between traversal methods?
                      </div>
                      <div className="bg-primary/10 rounded p-2 text-xs border-l-2 border-primary/30">
                        <div className="flex items-center gap-1 text-primary/80 mb-1">
                          <Sparkles className="h-3 w-3" />
                          <span className="text-[10px] font-medium">Exploring in depth</span>
                        </div>
                        The time complexity for all traversal methods is O(n) as each node is visited exactly once...
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end">
                      <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-primary">
                        Return to Main <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-xl"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-orange-500/5 rounded-full blur-xl"></div>
            </motion.div>
          </AnimateInView>
        </div>
      </div>
    </section>
  )
}
