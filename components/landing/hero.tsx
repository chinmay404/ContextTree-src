"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { GitBranch, MessageSquare } from "lucide-react"
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
              className="bg-muted/80 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-border/40 relative overflow-hidden"
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              animate={{
                scale: hovered ? 1.02 : 1,
              }}
              transition={{ duration: 0.3 }}
            >
              <div className="relative h-[320px] md:h-[400px] w-full bg-background/60 rounded-lg border border-border/30 overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-[320px] h-[280px]">
                    {/* Main node - center */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 p-3 rounded-lg border border-primary/30 bg-primary/5 shadow-sm transition-all duration-300 hover:shadow-md hover:bg-primary/10 z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="bg-primary/10 p-1.5 rounded-md">
                          <MessageSquare className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="font-medium text-sm flex-1">Main Conversation</div>
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        This is where your main conversation thread lives. Keep it focused while exploring branches.
                      </div>
                    </div>

                    {/* Branch node 1 - right */}
                    <div className="absolute top-1/2 right-0 transform -translate-y-1/2 w-40 p-3 rounded-lg border-2 border-primary bg-primary/10 shadow-md transition-all duration-300 hover:shadow-lg hover:bg-primary/15 z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="bg-primary/20 p-1.5 rounded-md">
                          <GitBranch className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="font-medium text-sm flex-1">Active Branch</div>
                      </div>
                      <div className="text-xs text-foreground line-clamp-2">
                        Explore this tangent without losing your place.
                      </div>
                    </div>

                    {/* Branch node 2 - top */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-36 p-3 rounded-lg border border-border/60 bg-card/80 shadow-sm transition-all duration-300 hover:shadow-md hover:bg-card z-10">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="bg-orange-500/10 p-1.5 rounded-md">
                          <GitBranch className="h-3.5 w-3.5 text-orange-500" />
                        </div>
                        <div className="font-medium text-sm flex-1">Branch 2</div>
                      </div>
                    </div>

                    {/* Branch node 3 - bottom */}
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-36 p-3 rounded-lg border border-border/60 bg-card/80 shadow-sm transition-all duration-300 hover:shadow-md hover:bg-card z-10">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="bg-orange-500/10 p-1.5 rounded-md">
                          <GitBranch className="h-3.5 w-3.5 text-orange-500" />
                        </div>
                        <div className="font-medium text-sm flex-1">Branch 3</div>
                      </div>
                    </div>

                    {/* Additional nodes */}
                    {/* Top left node */}
                    <div className="absolute top-[40px] left-[30px] w-32 p-2 rounded-lg border border-border/60 bg-card/80 shadow-sm transition-all duration-300 hover:shadow-md hover:bg-card z-10">
                      <div className="flex items-center gap-2">
                        <div className="bg-blue-500/10 p-1.5 rounded-md">
                          <GitBranch className="h-3 w-3 text-blue-500" />
                        </div>
                        <div className="font-medium text-xs flex-1">Sub-branch A</div>
                      </div>
                    </div>

                    {/* Bottom left node */}
                    <div className="absolute bottom-[40px] left-[30px] w-32 p-2 rounded-lg border border-border/60 bg-card/80 shadow-sm transition-all duration-300 hover:shadow-md hover:bg-card z-10">
                      <div className="flex items-center gap-2">
                        <div className="bg-green-500/10 p-1.5 rounded-md">
                          <GitBranch className="h-3 w-3 text-green-500" />
                        </div>
                        <div className="font-medium text-xs flex-1">Sub-branch B</div>
                      </div>
                    </div>

                    {/* Top right node */}
                    <div className="absolute top-[40px] right-[30px] w-32 p-2 rounded-lg border border-border/60 bg-card/80 shadow-sm transition-all duration-300 hover:shadow-md hover:bg-card z-10">
                      <div className="flex items-center gap-2">
                        <div className="bg-purple-500/10 p-1.5 rounded-md">
                          <GitBranch className="h-3 w-3 text-purple-500" />
                        </div>
                        <div className="font-medium text-xs flex-1">Sub-branch C</div>
                      </div>
                    </div>

                    {/* Bottom right node */}
                    <div className="absolute bottom-[40px] right-[30px] w-32 p-2 rounded-lg border border-border/60 bg-card/80 shadow-sm transition-all duration-300 hover:shadow-md hover:bg-card z-10">
                      <div className="flex items-center gap-2">
                        <div className="bg-yellow-500/10 p-1.5 rounded-md">
                          <GitBranch className="h-3 w-3 text-yellow-500" />
                        </div>
                        <div className="font-medium text-xs flex-1">Sub-branch D</div>
                      </div>
                    </div>

                    {/* Small connector nodes */}
                    <div className="absolute top-[100px] left-[100px] w-6 h-6 rounded-full border border-border/60 bg-blue-100 dark:bg-blue-900/30 shadow-sm z-10"></div>
                    <div className="absolute bottom-[100px] left-[100px] w-6 h-6 rounded-full border border-border/60 bg-green-100 dark:bg-green-900/30 shadow-sm z-10"></div>
                    <div className="absolute top-[100px] right-[100px] w-6 h-6 rounded-full border border-border/60 bg-purple-100 dark:bg-purple-900/30 shadow-sm z-10"></div>
                    <div className="absolute bottom-[100px] right-[100px] w-6 h-6 rounded-full border border-border/60 bg-yellow-100 dark:bg-yellow-900/30 shadow-sm z-10"></div>

                    {/* Connection lines */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
                      {/* Main to Branch 1 (right) */}
                      <path
                        d="M160,140 L280,140"
                        stroke="hsl(var(--primary))"
                        strokeWidth="2"
                        fill="none"
                        strokeDasharray="5,5"
                      />

                      {/* Main to Branch 2 (top) */}
                      <path d="M160,120 L160,40" stroke="hsl(var(--border))" strokeWidth="1.5" fill="none" />

                      {/* Main to Branch 3 (bottom) */}
                      <path d="M160,160 L160,240" stroke="hsl(var(--border))" strokeWidth="1.5" fill="none" />

                      {/* Main to Top Left */}
                      <path d="M160,120 Q100,100 80,60" stroke="hsl(var(--border))" strokeWidth="1.5" fill="none" />

                      {/* Main to Bottom Left */}
                      <path d="M160,160 Q100,180 80,220" stroke="hsl(var(--border))" strokeWidth="1.5" fill="none" />

                      {/* Main to Top Right */}
                      <path d="M160,120 Q220,100 240,60" stroke="hsl(var(--border))" strokeWidth="1.5" fill="none" />

                      {/* Main to Bottom Right */}
                      <path d="M160,160 Q220,180 240,220" stroke="hsl(var(--border))" strokeWidth="1.5" fill="none" />

                      {/* Connector lines */}
                      <path d="M80,60 Q90,80 100,100" stroke="hsl(var(--border))" strokeWidth="1" fill="none" />

                      <path d="M80,220 Q90,200 100,180" stroke="hsl(var(--border))" strokeWidth="1" fill="none" />

                      <path d="M240,60 Q230,80 220,100" stroke="hsl(var(--border))" strokeWidth="1" fill="none" />

                      <path d="M240,220 Q230,200 220,180" stroke="hsl(var(--border))" strokeWidth="1" fill="none" />

                      {/* Background grid lines */}
                      <path
                        d="M40,40 L280,40 L280,240 L40,240 L40,40"
                        stroke="hsl(var(--border))"
                        strokeWidth="0.5"
                        strokeOpacity="0.3"
                        fill="none"
                        strokeDasharray="4,4"
                      />

                      <path
                        d="M40,140 L280,140"
                        stroke="hsl(var(--border))"
                        strokeWidth="0.5"
                        strokeOpacity="0.3"
                        fill="none"
                        strokeDasharray="4,4"
                      />

                      <path
                        d="M160,40 L160,240"
                        stroke="hsl(var(--border))"
                        strokeWidth="0.5"
                        strokeOpacity="0.3"
                        fill="none"
                        strokeDasharray="4,4"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -z-10 top-1/2 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl opacity-70"></div>
              <div className="absolute -z-10 bottom-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl opacity-70"></div>
            </motion.div>

            {/* Decorative elements */}
            <div className="absolute -z-10 top-1/2 right-1/2 w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>
            <div className="absolute -z-10 bottom-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl"></div>
          </AnimateInView>
        </div>
      </div>
    </section>
  )
}
