"use client"

import { Network, GitBranch, Layers, Cpu } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import AnimateInView from "./animate-in-view"
import InteractiveDemo from "./interactive-demo"

export default function SolutionSection() {
  return (
    <section className="py-24 bg-background border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <AnimateInView animation="fadeUp" className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">The ContextTree Solution</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            A node-based canvas that lets you branch off into side-conversations—without ever losing sight of your main
            discussion.
          </p>
        </AnimateInView>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-20">
          {/* Before - Problem */}
          <AnimateInView animation="fadeRight">
            <div className="bg-muted/30 rounded-xl p-6 shadow-sm h-full">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <span className="bg-red-500/10 text-red-500 p-2 rounded-md mr-3">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-red-500"
                  >
                    <path
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                Traditional Chat Problem
              </h3>
              <div className="bg-background rounded-lg border border-border overflow-hidden">
                <div className="p-4 space-y-3">
                  {/* Simplified chat example */}
                  <div className="flex justify-start">
                    <div className="bg-muted p-2 rounded-lg max-w-[70%] text-xs">
                      Can you explain quantum computing?
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <div className="bg-primary/10 p-2 rounded-lg max-w-[70%] text-xs">
                      Quantum computing uses qubits which can exist in multiple states...
                    </div>
                  </div>

                  <div className="flex justify-start relative">
                    <div className="bg-muted p-2 rounded-lg max-w-[70%] text-xs border-l-2 border-orange-500">
                      What's the difference between qubits and regular bits?
                    </div>
                  </div>

                  <div className="flex justify-start relative">
                    <div className="bg-muted p-2 rounded-lg max-w-[70%] text-xs border-l-2 border-blue-500">
                      Who invented quantum computing?
                    </div>
                  </div>

                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-xs text-red-500 flex items-center justify-center mt-4">
                    <span className="mr-1">⚠️</span> Multiple threads become hard to follow
                  </div>
                </div>
              </div>
            </div>
          </AnimateInView>

          {/* After - Solution */}
          <AnimateInView animation="fadeLeft">
            <div className="bg-muted/30 rounded-xl p-6 shadow-sm h-full">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <span className="bg-green-500/10 text-green-500 p-2 rounded-md mr-3">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-green-500"
                  >
                    <path
                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                ContextTree Solution
              </h3>
              <div className="bg-background rounded-lg border border-border overflow-hidden">
                <div className="p-4 relative h-[220px]">
                  {/* Simplified canvas visualization */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative w-full max-w-[250px]">
                      {/* Main node */}
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 p-3 rounded-lg border border-primary/30 bg-primary/5 shadow-sm z-10">
                        <div className="flex items-center gap-2">
                          <div className="bg-primary/10 p-1.5 rounded-md">
                            <Network className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="font-medium text-sm">Main Thread</div>
                        </div>
                      </div>

                      {/* Branch nodes - simplified */}
                      <div className="absolute top-[30px] right-[20px] w-32 p-2 rounded-lg border border-orange-500 bg-orange-500/5 shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="bg-orange-500/10 p-1 rounded-md">
                            <GitBranch className="h-3 w-3 text-orange-500" />
                          </div>
                          <div className="text-xs font-medium">Branch 1</div>
                        </div>
                      </div>

                      <div className="absolute bottom-[30px] right-[30px] w-32 p-2 rounded-lg border border-blue-500 bg-blue-500/5 shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-500/10 p-1 rounded-md">
                            <GitBranch className="h-3 w-3 text-blue-500" />
                          </div>
                          <div className="text-xs font-medium">Branch 2</div>
                        </div>
                      </div>

                      {/* Connection lines - simplified */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                        <path
                          d="M125,100 C160,70 170,60 200,60"
                          stroke="hsl(25, 95%, 53%)"
                          strokeWidth="2"
                          fill="none"
                          strokeDasharray="5,5"
                        />
                        <path
                          d="M125,100 C160,130 170,140 200,140"
                          stroke="hsl(210, 100%, 59%)"
                          strokeWidth="2"
                          fill="none"
                          strokeDasharray="5,5"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Simple success indicator */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-green-500/10 border border-green-500/30 rounded-lg p-2 text-xs text-green-500 flex items-center justify-center">
                    <span className="mr-1">✓</span> Each thread has its own dedicated space
                  </div>
                </div>
              </div>
            </div>
          </AnimateInView>
        </div>

        {/* Key Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          <AnimateInView animation="fadeUp" delay={0.1}>
            <div className="bg-background rounded-lg p-6 border border-border shadow-sm h-full">
              <div className="bg-primary/10 p-3 rounded-lg inline-flex mb-4">
                <Network className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Node-Based UI</h3>
              <p className="text-muted-foreground">
                Every message lives in its own node—visually distinct and endlessly connectable.
              </p>
            </div>
          </AnimateInView>

          <AnimateInView animation="fadeUp" delay={0.2}>
            <div className="bg-background rounded-lg p-6 border border-border shadow-sm h-full">
              <div className="bg-primary/10 p-3 rounded-lg inline-flex mb-4">
                <GitBranch className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Subgraph Expansion</h3>
              <p className="text-muted-foreground">
                Click a subgraph pointer to unfold side-conversations in a focused view.
              </p>
            </div>
          </AnimateInView>

          <AnimateInView animation="fadeUp" delay={0.3}>
            <div className="bg-background rounded-lg p-6 border border-border shadow-sm h-full">
              <div className="bg-primary/10 p-3 rounded-lg inline-flex mb-4">
                <Layers className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Context Isolation</h3>
              <p className="text-muted-foreground">Main thread and subgraphs stay siloed—no cross-talk or mix-ups.</p>
            </div>
          </AnimateInView>

          <AnimateInView animation="fadeUp" delay={0.4}>
            <div className="bg-background rounded-lg p-6 border border-border shadow-sm h-full">
              <div className="bg-primary/10 p-3 rounded-lg inline-flex mb-4">
                <Cpu className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">LLM Model Switching</h3>
              <p className="text-muted-foreground">
                Try responses from different LLMs on any branch—then continue with the best.
              </p>
            </div>
          </AnimateInView>
        </div>

        {/* Call-to-Action */}
        <AnimateInView animation="fadeUp" className="text-center mb-16">
          <Link href="/canvas">
            <Button size="lg" className="px-8">
              Try ContextTree Now
            </Button>
          </Link>
        </AnimateInView>

        {/* How It Works Section */}
        <div className="mt-24">
          <AnimateInView animation="fadeUp" className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">How It Works</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Take a journey through ContextTree's interactive canvas and discover how it transforms your conversations.
            </p>
          </AnimateInView>

          {/* Step 1 */}
          <div className="py-24 bg-background">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <AnimateInView animation="fadeRight">
                  <div className="bg-card/50 rounded-xl p-8 shadow-sm border border-border/50 hover:shadow-md transition-shadow duration-300">
                    <div className="relative h-[320px] bg-background/50 rounded-lg overflow-hidden backdrop-blur-sm">
                      <div className="absolute inset-0 flex items-center justify-center">
                        {/* Simplified Chat UI mockup */}
                        <div className="w-[90%] max-w-md h-[85%] flex flex-col border border-border/70 rounded-md overflow-hidden shadow-sm">
                          <div className="bg-muted/30 p-3 border-b border-border/70 flex items-center justify-between">
                            <div className="text-sm font-medium">New Conversation</div>
                            <div className="flex space-x-3">
                              <div className="p-1 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="text-foreground/70"
                                >
                                  <path
                                    d="M12 5V19M5 12H19"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </div>
                            </div>
                          </div>

                          <div className="flex-1 p-5 space-y-5 overflow-y-auto bg-background/80">
                            {/* Main conversation nodes - simplified */}
                            <div className="p-3 rounded-lg border border-border/50 bg-card/50 shadow-sm">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="bg-primary/5 p-1.5 rounded-md">
                                  <Network className="h-3.5 w-3.5 text-primary/70" />
                                </div>
                                <div className="font-medium text-sm flex-1">User</div>
                              </div>
                              <div className="text-sm text-muted-foreground">Can you explain quantum computing?</div>
                            </div>

                            <div className="p-3 rounded-lg border border-border/50 bg-card/50 shadow-sm">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="bg-primary/5 p-1.5 rounded-md">
                                  <Network className="h-3.5 w-3.5 text-primary/70" />
                                </div>
                                <div className="font-medium text-sm flex-1">AI</div>
                              </div>
                              <div className="text-sm text-muted-foreground line-clamp-2">
                                Quantum computing uses qubits which can exist in multiple states simultaneously...
                              </div>
                            </div>

                            {/* Highlighted newest node */}
                            <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 shadow-sm relative">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="bg-primary/10 p-1.5 rounded-md">
                                  <Network className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <div className="font-medium text-sm flex-1">User</div>
                              </div>
                              <div className="text-sm text-foreground">How do qubits maintain quantum coherence?</div>

                              {/* Numbered callout */}
                              <div className="absolute -right-2 -top-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-sm">
                                1
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </AnimateInView>

                <AnimateInView animation="fadeLeft">
                  <div className="space-y-6">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      Step 1
                    </div>
                    <h3 className="text-2xl font-semibold">Start Your Main Conversation</h3>
                    <p className="text-base leading-relaxed text-muted-foreground">
                      Begin with your primary question or topic. Each message appears as its own distinct node, making
                      it easy to scan and ready to branch into deeper explorations.
                    </p>
                    <div className="bg-muted/20 p-5 rounded-lg border border-border/50 mt-6">
                      <div className="flex items-start gap-4">
                        <div className="bg-primary/10 p-2 rounded-full shrink-0 mt-1">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="text-primary"
                          >
                            <path
                              d="M12 16V12M12 8H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">Each message becomes a node</p>
                          <p className="text-sm text-muted-foreground">
                            Unlike traditional chats, ContextTree treats each message as a separate entity that can be
                            expanded, connected, or branched at any time.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </AnimateInView>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="py-20 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <AnimateInView animation="fadeRight" className="order-2 lg:order-1 lg:pr-8">
                <h3 className="text-2xl font-semibold mb-4">2. Create a Subgraph Pointer</h3>
                <p className="text-base leading-relaxed text-muted-foreground mb-6">
                  Hover over any message and click the "+" to spawn a Subgraph Pointer—your gateway to a
                  side-conversation.
                </p>
                <div className="bg-muted/30 p-4 rounded-lg border border-border">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="text-primary"
                      >
                        <path
                          d="M9 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V15M9 3C9 4.10457 9.89543 5 11 5H13C14.1046 5 15 4.10457 15 3M9 3C9 1.89543 9.89543 1 11 1H13C14.1046 1 15 1.89543 15 3M15 3H19C20.1046 3 21 3.89543 21 5V9"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Subgraph Pointers only show by default—canvas stays clean.</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Create as many branches as you need without cluttering your main conversation.
                      </p>
                    </div>
                  </div>
                </div>
              </AnimateInView>

              <AnimateInView animation="fadeLeft" className="order-1 lg:order-2">
                <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                  <div className="relative h-[300px] bg-background rounded-lg overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      {/* Node with + button - improved version */}
                      <div className="relative w-[280px]">
                        {/* Main node */}
                        <div className="p-4 rounded-lg border border-border bg-card/80 backdrop-blur-sm shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="bg-primary/10 p-1.5 rounded-md">
                              <Network className="h-4 w-4 text-primary" />
                            </div>
                            <div className="font-medium text-sm flex-1">Message</div>
                          </div>
                          <div className="text-sm text-muted-foreground">How do qubits maintain quantum coherence?</div>

                          {/* + Button with improved pulse animation */}
                          <div className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-md hover:shadow-lg transition-all duration-200 animate-pulse">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className="text-white"
                            >
                              <path
                                d="M12 5V19M5 12H19"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        </div>

                        {/* Dashed line to subgraph pointer - improved */}
                        <svg className="absolute top-1/2 right-0 w-40 h-24 pointer-events-none" style={{ zIndex: -1 }}>
                          <path
                            d="M5,12 C30,12 60,40 110,40"
                            stroke="hsl(var(--primary))"
                            strokeWidth="2"
                            fill="none"
                            strokeDasharray="5,5"
                            className="opacity-80"
                          />
                          <circle cx="110" cy="40" r="3" fill="hsl(var(--primary))" className="opacity-70" />
                        </svg>

                        {/* Subgraph pointer - improved */}
                        <div className="absolute right-[-120px] top-[28px] p-3 rounded-lg border border-primary/50 bg-primary/5 shadow-sm backdrop-blur-sm">
                          <div className="flex items-center gap-2">
                            <div className="bg-primary/10 p-1.5 rounded-md">
                              <GitBranch className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div className="text-sm font-medium">New Branch</div>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">Click to explore</div>
                        </div>

                        {/* Annotation */}
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs py-1 px-3 rounded-full">
                          Click + to create a branch
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimateInView>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="py-20 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <AnimateInView animation="fadeRight">
                <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                  <div className="relative h-[300px] bg-background rounded-lg overflow-hidden">
                    <div className="absolute inset-0 p-4">
                      {/* Expanded branch view */}
                      <div className="h-full flex flex-col border border-border rounded-md overflow-hidden bg-muted/10 backdrop-blur-sm">
                        <div className="bg-primary/10 p-3 border-b border-border flex items-center">
                          <div className="bg-primary/20 p-1.5 rounded-md mr-2">
                            <GitBranch className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="text-sm font-medium">Quantum Coherence Branch</div>
                        </div>

                        <div className="flex-1 relative">
                          {/* Node cluster */}
                          <div className="absolute top-1/4 left-1/4 w-40 p-3 rounded-lg border border-primary bg-card shadow-sm">
                            <div className="text-xs text-muted-foreground">What factors affect quantum coherence?</div>
                          </div>

                          <div className="absolute top-1/2 left-1/2 w-40 p-3 rounded-lg border border-border bg-card shadow-sm">
                            <div className="text-xs text-muted-foreground">Temperature is a critical factor...</div>
                          </div>

                          <div className="absolute bottom-1/4 right-1/4 w-40 p-3 rounded-lg border border-border bg-card shadow-sm">
                            <div className="text-xs text-muted-foreground">How long can coherence be maintained?</div>
                          </div>

                          {/* Connection lines */}
                          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }}>
                            <path
                              d="M100,75 C120,100 140,120 160,150"
                              stroke="hsl(var(--primary))"
                              strokeWidth="1.5"
                              fill="none"
                            />
                            <path
                              d="M200,150 C220,170 240,180 220,200"
                              stroke="hsl(var(--primary))"
                              strokeWidth="1.5"
                              fill="none"
                            />
                          </svg>
                        </div>

                        {/* Zoom controls and minimap */}
                        <div className="absolute bottom-4 right-4 flex flex-col items-end">
                          <div className="flex mb-2 bg-background/80 backdrop-blur-sm rounded-md border border-border p-1">
                            <button className="p-1 hover:bg-muted rounded-md" aria-label="Zoom in">
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className="text-foreground"
                              >
                                <path
                                  d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M10 7V13M7 10H13"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                            <button className="p-1 hover:bg-muted rounded-md" aria-label="Zoom out">
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className="text-foreground"
                              >
                                <path
                                  d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M7 10H13"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          </div>
                          <div className="w-20 h-16 bg-background/80 backdrop-blur-sm rounded-md border border-border p-1">
                            <div className="w-full h-full bg-muted/30 rounded relative">
                              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary rounded-full"></div>
                              <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-primary rounded-full"></div>
                              <div className="absolute bottom-1/4 right-1/4 w-2 h-2 bg-primary rounded-full"></div>
                              <div className="absolute inset-0 border-2 border-primary/50 rounded"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimateInView>

              <AnimateInView animation="fadeLeft" className="lg:pl-8">
                <h3 className="text-2xl font-semibold mb-4">3. Expand & Explore Your Branch</h3>
                <p className="text-base leading-relaxed text-muted-foreground mb-6">
                  Click any Subgraph Pointer to open its branch in a focused view. Pan, zoom, and use the minimap to
                  navigate complex threads.
                </p>
                <div className="space-y-4">
                  <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="text-primary"
                        >
                          <path
                            d="M15 3H21M21 3V9M21 3L14 10M10 21H4M4 21V15M4 21L11 14"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Zoom In/Out buttons work here too!</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Scroll wheel also works for zooming in and out of your canvas.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="text-primary"
                        >
                          <path
                            d="M9 6H20M9 12H20M9 18H20M5 6V6.01M5 12V12.01M5 18V18.01"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium">See the big picture of your entire canvas.</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          The minimap helps you navigate complex conversation trees with ease.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimateInView>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="py-20 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <AnimateInView animation="fadeRight" className="order-2 lg:order-1 lg:pr-8">
                <h3 className="text-2xl font-semibold mb-4">4. Switch LLM Models Mid-Conversation</h3>
                <p className="text-base leading-relaxed text-muted-foreground mb-6">
                  At any branch level, choose a different LLM to generate fresh responses—then continue seamlessly from
                  the best one.
                </p>
                <div className="space-y-4">
                  <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="text-primary"
                        >
                          <path
                            d="M8 9L12 5L16 9M16 15L12 19L8 15"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Select from all your integrated LLMs.</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Try different models to get varied perspectives on the same question.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="text-primary"
                        >
                          <path
                            d="M9 12H15M12 9V15M3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium">No context is shared across models—clean switch.</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Each model maintains its own conversation history for maximum clarity.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimateInView>

              <AnimateInView animation="fadeLeft" className="order-1 lg:order-2">
                <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                  <div className="relative h-[300px] bg-background rounded-lg overflow-hidden">
                    <div className="absolute inset-0 p-4">
                      {/* Model switching UI */}
                      <div className="h-full flex flex-col border border-border rounded-md overflow-hidden">
                        <div className="bg-primary/10 p-3 border-b border-border flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="bg-primary/20 p-1.5 rounded-md mr-2">
                              <GitBranch className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div className="text-sm font-medium">Quantum Coherence Branch</div>
                          </div>

                          {/* Model selector */}
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <select className="appearance-none bg-background border border-border rounded-md py-1 pl-3 pr-8 text-xs">
                                <option>GPT-4</option>
                                <option>Claude</option>
                                <option>LLaMA</option>
                                <option>Gemini</option>
                              </select>
                              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                <svg
                                  width="10"
                                  height="6"
                                  viewBox="0 0 10 6"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="text-foreground"
                                >
                                  <path
                                    d="M1 1L5 5L9 1"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </div>
                            </div>
                            <button className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-md">
                              Switch
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 p-4 space-y-4">
                          {/* Comparison of responses */}
                          <div className="p-3 rounded-lg border border-border bg-card">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="bg-primary/10 p-1.5 rounded-md">
                                <Network className="h-3.5 w-3.5 text-primary" />
                              </div>
                              <div className="font-medium text-xs flex-1">GPT-4</div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Quantum coherence is maintained through isolation from environmental interactions...
                            </div>
                          </div>

                          <div className="p-3 rounded-lg border border-border bg-card">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="bg-orange-500/10 p-1.5 rounded-md">
                                <Network className="h-3.5 w-3.5 text-orange-500" />
                              </div>
                              <div className="font-medium text-xs flex-1">Claude</div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Maintaining quantum coherence requires minimizing decoherence through techniques like...
                            </div>
                          </div>

                          <div className="p-3 rounded-lg border-2 border-green-500 bg-card">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="bg-green-500/10 p-1.5 rounded-md">
                                <Network className="h-3.5 w-3.5 text-green-500" />
                              </div>
                              <div className="font-medium text-xs flex-1">LLaMA</div>
                              <div className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full">
                                Selected
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Quantum coherence is preserved by reducing thermal noise and electromagnetic
                              interference...
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimateInView>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Demo Section */}
      <InteractiveDemo />
    </section>
  )
}
