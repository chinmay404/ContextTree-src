"use client"

import { useState } from "react"
import { Network, GitBranch, Layers, Cpu } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import AnimateInView from "./animate-in-view"
import InteractiveDemo from "./interactive-demo"

export default function SolutionSection() {
  const [currentStep, setCurrentStep] = useState(1)

  return (
    <section className="py-24 bg-gradient-to-b from-white via-slate-50/30 to-white border-t border-border relative overflow-hidden">
      {/* Add subtle background patterns */}
      <div className="absolute inset-0 bg-[url('/subtle-dots.png')] opacity-[0.015] pointer-events-none"></div>
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-100/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-100/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>
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
            <div className="bg-white rounded-xl p-6 shadow-sm h-full border border-slate-200">
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
            <div className="bg-white rounded-xl p-6 shadow-sm h-full border border-slate-200">
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
            <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm h-full transition-all duration-300 hover:shadow-md hover:border-slate-300">
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
            <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm h-full transition-all duration-300 hover:shadow-md hover:border-slate-300">
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
            <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm h-full transition-all duration-300 hover:shadow-md hover:border-slate-300">
              <div className="bg-primary/10 p-3 rounded-lg inline-flex mb-4">
                <Layers className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Context Isolation</h3>
              <p className="text-muted-foreground">Main thread and subgraphs stay siloed—no cross-talk or mix-ups.</p>
            </div>
          </AnimateInView>

          <AnimateInView animation="fadeUp" delay={0.4}>
            <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm h-full transition-all duration-300 hover:shadow-md hover:border-slate-300">
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
        <div className="mt-24 relative">
          {/* Decorative elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-50/40 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-50/30 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3"></div>
          </div>

          {/* Step navigation */}
          <div className="container mx-auto px-4 mb-12">
            <div className="flex justify-center">
              <div className="inline-flex bg-white/70 p-1.5 rounded-full backdrop-blur-sm border border-slate-200 shadow-sm">
                {[1, 2, 3, 4].map((step) => (
                  <button
                    key={step}
                    onClick={() => setCurrentStep(step)}
                    className={`relative px-6 py-2 text-sm font-medium rounded-full transition-all duration-300 ${
                      step === currentStep
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Step {step}
                    {step === currentStep && (
                      <span className="absolute inset-0 rounded-full bg-primary/10 animate-pulse-slow"></span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Step content */}
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
            <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-slate-200 shadow-sm">
              <div className="absolute top-0 right-0 bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-bl-lg rounded-tr-lg">
                Step {currentStep}
              </div>

              <h3 className="text-2xl font-semibold mb-8 text-center">Start Your Main Conversation</h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                {/* Visual */}
                <div className="order-2 lg:order-1">
                  <div className="relative aspect-square max-w-md mx-auto">
                    {/* Main conversation visualization */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-[90%] max-w-md h-[85%] flex flex-col border border-border/50 rounded-lg overflow-hidden shadow-sm bg-background/80 backdrop-blur-sm">
                        <div className="bg-muted/20 p-3 border-b border-border/50 flex items-center justify-between">
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

                        <div className="flex-1 p-5 space-y-5 overflow-y-auto">
                          {/* Message nodes */}
                          <div className="p-3 rounded-lg border border-border/50 bg-card/30 shadow-sm hover:shadow-md transition-all duration-300 hover:border-border">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="bg-primary/5 p-1.5 rounded-md">
                                <Network className="h-3.5 w-3.5 text-primary/70" />
                              </div>
                              <div className="font-medium text-sm flex-1">User</div>
                            </div>
                            <div className="text-sm text-muted-foreground">Can you explain quantum computing?</div>
                          </div>

                          <div className="p-3 rounded-lg border border-border/50 bg-card/30 shadow-sm hover:shadow-md transition-all duration-300 hover:border-border">
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
                          <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 shadow-md relative transform hover:scale-[1.02] transition-all duration-300">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="bg-primary/10 p-1.5 rounded-md">
                                <Network className="h-3.5 w-3.5 text-primary" />
                              </div>
                              <div className="font-medium text-sm flex-1">User</div>
                            </div>
                            <div className="text-sm">How do qubits maintain quantum coherence?</div>

                            {/* Pulse effect */}
                            <div className="absolute -inset-px rounded-lg border border-primary/30 animate-pulse-slow pointer-events-none"></div>

                            {/* Numbered callout */}
                            <div className="absolute -right-2 -top-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-sm">
                              1
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Decorative grid */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,theme(colors.slate.200/10)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.slate.200/10)_1px,transparent_1px)] bg-[size:14px_14px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] -z-10"></div>
                  </div>
                </div>

                {/* Description */}
                <div className="order-1 lg:order-2">
                  <div className="space-y-6">
                    <p className="text-base leading-relaxed">
                      Begin with your primary question or topic. Each message appears as its own distinct node, making
                      it easy to scan and ready to branch into deeper explorations.
                    </p>

                    <div className="space-y-4">
                      <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/20 border border-border/50 hover:border-border hover:bg-muted/30 transition-colors duration-300">
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

                      <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/20 border border-border/50 hover:border-border hover:bg-muted/30 transition-colors duration-300">
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
                              d="M15.59 14.37A6 6 0 01 6.62 8.58M9 18l-3-3 3-3m6 0l3 3-3 3"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">Interact with your conversation</p>
                          <p className="text-sm text-muted-foreground">
                            Hover over nodes to reveal actions, drag to reposition, and click to expand. Your
                            conversation becomes a living, interactive canvas.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={() => setCurrentStep((prev) => Math.min(prev + 1, 4))}
                        className="text-sm font-medium text-primary flex items-center gap-2 group"
                      >
                        Next: {currentStep < 4 ? `Step ${currentStep + 1}` : "Finish"}
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="text-primary transition-transform duration-300 group-hover:translate-x-1"
                        >
                          <path
                            d="M5 12H19M19 12L12 5M19 12L12 19"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Demo Section */}
      <InteractiveDemo />
    </section>
  )
}
