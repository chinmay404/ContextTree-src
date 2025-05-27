"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { GitBranch, Network, MessageSquare, ArrowRight, Plus, Sparkles } from "lucide-react"
import AnimateInView from "./animate-in-view"

const steps = [
  {
    title: "Start a Conversation",
    description: "Begin with a main conversation thread on any topic you want to explore.",
    icon: <MessageSquare className="h-5 w-5" />,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  {
    title: "Create a Subgraph Pointer",
    description: "When you want to explore a tangential topic, create a branch from your main conversation.",
    icon: <GitBranch className="h-5 w-5" />,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
  },
  {
    title: "Explore Without Losing Context",
    description: "Dive deep into your new branch while maintaining the context from your main conversation.",
    icon: <Sparkles className="h-5 w-5" />,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
  },
  {
    title: "Connect Related Concepts",
    description: "Link related conversation nodes to build a knowledge graph of your research.",
    icon: <Network className="h-5 w-5" />,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
  },
]

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(1)

  return (
    <section id="how-it-works" className="py-20 md:py-28 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-1/3 left-0 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[120px] -translate-x-1/2" />
      <div className="absolute bottom-1/3 right-0 w-[600px] h-[600px] bg-green-500/5 rounded-full blur-[120px] translate-x-1/2" />

      {/* Decorative grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.015] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <AnimateInView animation="fadeUp" className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <GitBranch className="h-4 w-4 mr-2" />
            <span>Simple Process</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">How ContextTree Works</h2>
          <p className="text-lg text-muted-foreground">
            Our intuitive interface makes it easy to organize complex conversations and explore multiple threads.
          </p>
        </AnimateInView>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Steps */}
          <div className="space-y-6">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                className={`p-6 rounded-xl border transition-all duration-300 cursor-pointer ${
                  activeStep === index
                    ? `${step.bgColor} ${step.borderColor} shadow-lg`
                    : "bg-background/50 border-border/40 hover:bg-muted/20"
                }`}
                onClick={() => setActiveStep(index)}
                whileHover={{ y: -2 }}
                animate={{
                  scale: activeStep === index ? 1.02 : 1,
                  boxShadow: activeStep === index ? "0 10px 25px -5px rgba(0, 0, 0, 0.1)" : "none",
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full ${step.bgColor} flex items-center justify-center ${step.color}`}
                  >
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      {step.title}
                      {activeStep === index && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${step.bgColor} ${step.color}`}
                        >
                          Active
                        </motion.div>
                      )}
                    </h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Visual Representation */}
          <div className="relative h-[500px] flex items-center justify-center">
            {activeStep === 0 && (
              <AnimateInView animation="fadeIn" className="w-full max-w-md">
                <motion.div
                  className="bg-background/90 backdrop-blur-md rounded-xl border border-border/40 shadow-xl p-5 relative"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse"></div>
                      <h3 className="font-medium text-sm">Main Conversation</h3>
                    </div>
                    <div className="text-xs text-blue-500 font-medium px-2 py-0.5 rounded-full bg-blue-500/10">
                      Active
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-muted/40 rounded-lg p-3 text-sm">
                      How can I implement a recursive algorithm for tree traversal?
                    </div>
                    <div className="bg-blue-500/5 rounded-lg p-3 text-sm ml-4 border-l-2 border-blue-500/30">
                      I'll explain recursive tree traversal with examples for in-order, pre-order, and post-order
                      approaches...
                    </div>
                    <div className="bg-muted/40 rounded-lg p-3 text-sm">Can you show me some code examples?</div>
                  </div>

                  {/* Branch button */}
                  <div className="absolute -right-2 top-1/3 transform translate-x-full">
                    <motion.div
                      className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white cursor-pointer shadow-md"
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Plus className="h-4 w-4" />
                    </motion.div>
                  </div>
                </motion.div>
              </AnimateInView>
            )}

            {activeStep === 1 && (
              <AnimateInView animation="fadeIn" className="w-full max-w-md">
                <div className="relative">
                  {/* Main conversation */}
                  <motion.div
                    className="bg-background/90 backdrop-blur-md rounded-xl border border-border/40 shadow-xl p-5 mb-12 relative"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-blue-500"></div>
                        <h3 className="font-medium text-sm">Main Conversation</h3>
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">Paused</div>
                    </div>

                    <div className="space-y-3 opacity-80">
                      <div className="bg-muted/40 rounded-lg p-3 text-sm">
                        How can I implement a recursive algorithm for tree traversal?
                      </div>
                      <div className="bg-blue-500/5 rounded-lg p-3 text-sm ml-4 border-l-2 border-blue-500/30">
                        I'll explain recursive tree traversal with examples for in-order, pre-order, and post-order
                        approaches...
                      </div>
                    </div>

                    {/* Branch pointer */}
                    <div className="absolute -right-2 top-1/3 transform translate-x-full">
                      <motion.div
                        className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white cursor-pointer shadow-md"
                        animate={{
                          scale: [1, 1.1, 1],
                          boxShadow: [
                            "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                            "0 10px 15px -3px rgba(0, 0, 0, 0.2)",
                            "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          ],
                        }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, repeatType: "loop" }}
                      >
                        <GitBranch className="h-4 w-4" />
                      </motion.div>

                      {/* Connection line */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-12 flex items-center justify-center">
                        <div className="h-full w-0.5 bg-orange-400 dashed-line"></div>
                      </div>

                      {/* Annotation */}
                      <div className="absolute top-1/2 right-full transform -translate-y-1/2 -translate-x-2">
                        <div className="bg-orange-500/10 text-orange-500 text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap">
                          Branch Pointer
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Branch conversation */}
                  <motion.div
                    className="bg-orange-500/5 backdrop-blur-sm rounded-xl border border-orange-500/20 shadow-lg p-5 ml-8 relative"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <div className="absolute -left-8 top-0 transform -translate-y-full">
                      <div className="h-12 flex items-center">
                        <div className="h-full w-0.5 bg-orange-400 dashed-line"></div>
                      </div>
                      <div className="w-4 h-4 rounded-full bg-orange-400 absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2"></div>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-orange-500 animate-pulse"></div>
                        <h3 className="font-medium text-sm">Branch: Time Complexity</h3>
                      </div>
                      <div className="text-xs text-orange-500 font-medium px-2 py-0.5 rounded-full bg-orange-500/10">
                        Active Branch
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-muted/40 rounded-lg p-3 text-sm">
                        Can you explain the time complexity differences between traversal methods?
                      </div>
                    </div>
                  </motion.div>
                </div>
              </AnimateInView>
            )}

            {activeStep === 2 && (
              <AnimateInView animation="fadeIn" className="w-full max-w-md">
                <div className="relative">
                  {/* Main conversation (minimized) */}
                  <motion.div
                    className="bg-background/80 backdrop-blur-md rounded-xl border border-border/40 shadow-md p-4 mb-12 relative opacity-70 scale-95 origin-top-left"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 0.7, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                        <h3 className="font-medium text-xs">Main Conversation</h3>
                      </div>
                      <div className="text-xs text-muted-foreground">Paused</div>
                    </div>

                    <div className="space-y-2">
                      <div className="bg-muted/40 rounded-lg p-2 text-xs line-clamp-1">
                        How can I implement a recursive algorithm for tree traversal?
                      </div>
                    </div>

                    {/* Branch pointer */}
                    <div className="absolute -right-2 top-1/3 transform translate-x-full">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-orange-400/80 to-orange-500/80 flex items-center justify-center text-white shadow-sm">
                        <GitBranch className="h-3 w-3" />
                      </div>

                      {/* Connection line */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-10 flex items-center justify-center">
                        <div className="h-full w-0.5 bg-orange-400 dashed-line"></div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Branch conversation (active) */}
                  <motion.div
                    className="bg-purple-500/5 backdrop-blur-sm rounded-xl border border-purple-500/20 shadow-xl p-5 ml-8 relative"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <div className="absolute -left-8 top-0 transform -translate-y-full">
                      <div className="h-10 flex items-center">
                        <div className="h-full w-0.5 bg-orange-400 dashed-line"></div>
                      </div>
                      <div className="w-4 h-4 rounded-full bg-orange-400 absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2"></div>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-purple-500 animate-pulse"></div>
                        <h3 className="font-medium text-sm">Branch: Time Complexity</h3>
                      </div>
                      <div className="text-xs text-purple-500 font-medium px-2 py-0.5 rounded-full bg-purple-500/10">
                        Exploring
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-muted/40 rounded-lg p-3 text-sm">
                        Can you explain the time complexity differences between traversal methods?
                      </div>
                      <div className="bg-purple-500/5 rounded-lg p-3 text-sm ml-4 border-l-2 border-purple-500/30">
                        <div className="flex items-center gap-1 text-purple-500 mb-1">
                          <Sparkles className="h-3 w-3" />
                          <span className="text-xs font-medium">Exploring in depth</span>
                        </div>
                        The time complexity for all traversal methods is O(n) as each node is visited exactly once...
                      </div>
                      <div className="bg-muted/40 rounded-lg p-3 text-sm">What about space complexity?</div>
                      <div className="bg-purple-500/5 rounded-lg p-3 text-sm ml-4 border-l-2 border-purple-500/30">
                        The space complexity is O(h) where h is the height of the tree due to the recursion stack...
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end">
                      <button className="inline-flex items-center text-xs text-purple-500 hover:text-purple-600 font-medium">
                        Return to Main <ArrowRight className="ml-1 h-3 w-3" />
                      </button>
                    </div>
                  </motion.div>
                </div>
              </AnimateInView>
            )}

            {activeStep === 3 && (
              <AnimateInView animation="fadeIn" className="w-full max-w-md">
                <motion.div
                  className="relative bg-background/90 backdrop-blur-md rounded-xl border border-border/40 shadow-xl p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></div>
                      <h3 className="font-medium text-sm">Knowledge Graph</h3>
                    </div>
                    <div className="text-xs text-green-500 font-medium px-2 py-0.5 rounded-full bg-green-500/10">
                      Connected
                    </div>
                  </div>

                  <div className="relative h-[300px] bg-muted/20 rounded-lg border border-border/40 p-4">
                    {/* Main node */}
                    <motion.div
                      className="absolute top-1/2 left-1/4 transform -translate-x-1/2 -translate-y-1/2 w-32 h-20 bg-blue-500/10 rounded-lg border border-blue-500/30 p-2 shadow-md"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, repeatType: "loop" }}
                    >
                      <div className="text-xs font-medium mb-1 text-blue-500">Tree Traversal</div>
                      <div className="text-[10px] text-muted-foreground line-clamp-2">
                        Recursive algorithms for traversing tree data structures
                      </div>
                    </motion.div>

                    {/* Branch 1 */}
                    <motion.div
                      className="absolute top-1/4 right-1/4 transform -translate-x-1/2 -translate-y-1/2 w-32 h-20 bg-orange-500/10 rounded-lg border border-orange-500/30 p-2 shadow-md"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 3.5, delay: 0.5, repeat: Number.POSITIVE_INFINITY, repeatType: "loop" }}
                    >
                      <div className="text-xs font-medium mb-1 text-orange-500">Time Complexity</div>
                      <div className="text-[10px] text-muted-foreground line-clamp-2">
                        Analysis of time complexity for different traversal methods
                      </div>
                    </motion.div>

                    {/* Branch 2 */}
                    <motion.div
                      className="absolute bottom-1/4 right-1/4 transform -translate-x-1/2 -translate-y-1/2 w-32 h-20 bg-purple-500/10 rounded-lg border border-purple-500/30 p-2 shadow-md"
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 4.5, delay: 1, repeat: Number.POSITIVE_INFINITY, repeatType: "loop" }}
                    >
                      <div className="text-xs font-medium mb-1 text-purple-500">Space Complexity</div>
                      <div className="text-[10px] text-muted-foreground line-clamp-2">
                        Memory usage analysis for recursive vs iterative approaches
                      </div>
                    </motion.div>

                    {/* Connection lines */}
                    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                      <line
                        x1="25%"
                        y1="50%"
                        x2="75%"
                        y2="25%"
                        stroke="url(#gradient-blue-orange)"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                      />
                      <line
                        x1="25%"
                        y1="50%"
                        x2="75%"
                        y2="75%"
                        stroke="url(#gradient-blue-purple)"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                      />
                      <line
                        x1="75%"
                        y1="25%"
                        x2="75%"
                        y2="75%"
                        stroke="url(#gradient-orange-purple)"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                      />

                      {/* Gradients */}
                      <defs>
                        <linearGradient id="gradient-blue-orange" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="hsl(221.2, 83.2%, 53.3%)" />
                          <stop offset="100%" stopColor="hsl(24, 100%, 50%)" />
                        </linearGradient>
                        <linearGradient id="gradient-blue-purple" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="hsl(221.2, 83.2%, 53.3%)" />
                          <stop offset="100%" stopColor="hsl(270, 70%, 60%)" />
                        </linearGradient>
                        <linearGradient id="gradient-orange-purple" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="hsl(24, 100%, 50%)" />
                          <stop offset="100%" stopColor="hsl(270, 70%, 60%)" />
                        </linearGradient>
                      </defs>
                    </svg>

                    {/* Add button */}
                    <motion.div
                      className="absolute bottom-4 right-4 h-8 w-8 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center text-white cursor-pointer shadow-md"
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Plus className="h-4 w-4" />
                    </motion.div>
                  </div>

                  <div className="mt-4 text-sm text-muted-foreground">
                    Connect related concepts to build a comprehensive knowledge graph of your research topics.
                  </div>
                </motion.div>
              </AnimateInView>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
