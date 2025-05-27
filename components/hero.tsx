"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { GitBranch, ArrowRight, Construction } from "lucide-react"
import AnimateInView from "./animate-in-view"

export default function Hero() {
  const [hovered, setHovered] = useState(false)
  const [scrollY, setScrollY] = useState(0)

  // Track scroll position for parallax effect
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <section className="relative pt-24 pb-20 md:pt-36 md:pb-28 overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3" />

      {/* Decorative grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.015] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-12 items-center">
          <AnimateInView animation="fadeRight">
            <div className="max-w-xl">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-sm font-medium mb-6">
                <Construction className="h-4 w-4 mr-2" />
                <span>Under Development</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-foreground">
                <span className="text-gradient">Keep Every Thread</span> in Sight
              </h1>

              <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed">
                An interactive, node-based canvas that preserves your main chat while you explore side-conversations.
              </p>

              <div className="mt-10 flex flex-wrap gap-5">
                <Link href="/canvas">
                  <Button
                    size="lg"
                    className="px-8 rounded-full shadow-glow hover:shadow-glow-hover transition-all duration-500"
                  >
                    Try It Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 rounded-full border-primary/20 hover:bg-primary/5 transition-all duration-300"
                >
                  Learn How It Works
                </Button>
              </div>
            </div>
          </AnimateInView>

          <AnimateInView animation="fadeLeft">
            <motion.div
              className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/10"
              style={{
                transformStyle: "preserve-3d",
                transform: `perspective(1000px) rotateY(${hovered ? -2 : 0}deg) rotateX(${hovered ? 2 : 0}deg)`,
              }}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              animate={{
                scale: hovered ? 1.02 : 1,
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {/* Abstract flowing background */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-background via-muted/30 to-background z-0 overflow-hidden"
                style={{ transform: `translateY(${scrollY * 0.05}px)` }}
              >
                <div className="absolute inset-0 opacity-10">
                  <svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
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
                  <motion.div
                    className="relative bg-background/90 backdrop-blur-md rounded-xl border border-border/40 shadow-lg p-5 mb-6 transition-all duration-300"
                    whileHover={{
                      y: -5,
                      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                    }}
                    style={{ transformStyle: "preserve-3d", transform: `translateZ(20px)` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse"></div>
                        <h3 className="font-medium text-sm">Main Conversation</h3>
                      </div>
                      <div className="text-xs text-primary font-medium px-2 py-0.5 rounded-full bg-primary/10">
                        Active
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-muted/40 rounded-lg p-3 text-sm">
                        How can I implement a recursive algorithm for tree traversal?
                      </div>
                      <div className="bg-primary/5 rounded-lg p-3 text-sm ml-4 border-l-2 border-primary/30">
                        I'll explain recursive tree traversal with examples for in-order, pre-order, and post-order
                        approaches...
                      </div>
                    </div>

                    {/* Branch indicators */}
                    <div className="absolute -right-2 top-1/3 transform translate-x-full flex flex-col gap-2">
                      <motion.div
                        className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-white cursor-pointer shadow-md"
                        whileHover={{
                          scale: 1.1,
                          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <GitBranch className="h-4 w-4" />
                      </motion.div>
                      <motion.div
                        className="h-2 w-2 rounded-full bg-orange-500/80 shadow-sm"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, repeatType: "loop" }}
                      />
                      <motion.div
                        className="h-2 w-2 rounded-full bg-blue-500/80 shadow-sm"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 2, delay: 0.5, repeat: Number.POSITIVE_INFINITY, repeatType: "loop" }}
                      />
                    </div>
                  </motion.div>

                  {/* Branch conversation preview */}
                  <motion.div
                    className="bg-primary/5 backdrop-blur-sm rounded-xl border border-primary/20 shadow-md p-5 ml-12 relative transition-all duration-300"
                    initial={{ opacity: 0.8, y: 10 }}
                    animate={{
                      opacity: hovered ? 1 : 0.8,
                      y: hovered ? 0 : 10,
                    }}
                    whileHover={{
                      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                    }}
                    transition={{ duration: 0.3 }}
                    style={{ transformStyle: "preserve-3d", transform: `translateZ(40px)` }}
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
                        <div className="h-2.5 w-2.5 rounded-full bg-primary"></div>
                        <h3 className="font-medium text-sm">Branch Exploration</h3>
                      </div>
                      <div className="text-xs text-primary font-medium px-2 py-0.5 rounded-full bg-primary/10">
                        Active Branch
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-muted/40 rounded-lg p-3 text-sm">
                        Can you explain the time complexity differences between traversal methods?
                      </div>
                      <div className="bg-primary/10 rounded-lg p-3 text-sm border-l-2 border-primary/30">
                        <div className="flex items-center gap-1 text-primary mb-1">
                          <GitBranch className="h-3 w-3" />
                          <span className="text-xs font-medium">Exploring in depth</span>
                        </div>
                        The time complexity for all traversal methods is O(n) as each node is visited exactly once...
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end">
                      <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-primary hover:bg-primary/10">
                        Return to Main <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Decorative elements */}
              <motion.div
                className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-xl"
                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.7, 0.5] }}
                transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY, repeatType: "loop" }}
              />
              <motion.div
                className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/5 rounded-full blur-xl"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 7, delay: 1, repeat: Number.POSITIVE_INFINITY, repeatType: "loop" }}
              />
            </motion.div>
          </AnimateInView>
        </div>
      </div>
    </section>
  )
}
