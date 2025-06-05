"use client";

import {
  Brain,
  Clock,
  Lightbulb,
  MessageSquareX,
  Zap,
  TrendingDown,
} from "lucide-react";
import AnimateInView from "./animate-in-view";
import { motion } from "framer-motion";

export default function ProblemSection() {
  return (
    <section className="py-24 md:py-32 bg-gradient-to-b from-background to-muted/20 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.05),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--destructive)/0.03),transparent_50%)]" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <AnimateInView animation="fadeUp">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-red-500/10 text-red-600 text-sm font-medium mb-6 border border-red-500/20">
              <MessageSquareX className="h-4 w-4 mr-2" />
              <span>The AI Conversation Crisis</span>
            </div>
          </AnimateInView>

          <AnimateInView animation="fadeUp" delay={0.1}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
              <span className="text-foreground">Your Brilliant Ideas Are</span>
              <br />
              <span className="text-gradient bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                Drowning in Chat Chaos
              </span>
            </h2>
          </AnimateInView>

          <AnimateInView animation="fadeUp" delay={0.2}>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Every day, millions of valuable insights get lost in the endless
              scroll of AI conversations.
              <span className="text-foreground font-medium">
                {" "}
                The current way we interact with AI is fundamentally broken.
              </span>
            </p>
          </AnimateInView>
        </div>

        {/* Main Problem Visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-20">
          {/* Left: Emotional Pain Points */}
          <div className="space-y-8">
            <AnimateInView animation="fadeRight">
              <div className="space-y-6">
                <div className="flex items-start gap-4 group">
                  <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20 flex-shrink-0">
                    <Brain className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-foreground">
                      Mental Overload
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Your brain struggles to track multiple conversation
                      threads simultaneously.
                      <span className="text-foreground font-medium">
                        {" "}
                        You feel scattered and unfocused.
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 group">
                  <div className="bg-orange-500/10 p-3 rounded-xl border border-orange-500/20 flex-shrink-0">
                    <Clock className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-foreground">
                      Wasted Time
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      You spend precious minutes re-reading conversations to
                      regain context.
                      <span className="text-foreground font-medium">
                        {" "}
                        Your productivity plummets.
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 group">
                  <div className="bg-yellow-500/10 p-3 rounded-xl border border-yellow-500/20 flex-shrink-0">
                    <Lightbulb className="h-6 w-6 text-yellow-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-foreground">
                      Lost Insights
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Your best ideas disappear into the chat void, never to be
                      found again.
                      <span className="text-foreground font-medium">
                        {" "}
                        Innovation dies in the scroll.
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 group">
                  <div className="bg-purple-500/10 p-3 rounded-xl border border-purple-500/20 flex-shrink-0">
                    <TrendingDown className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-foreground">
                      Frustration Builds
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      The constant context switching leaves you drained and
                      irritated.
                      <span className="text-foreground font-medium">
                        {" "}
                        AI becomes a source of stress, not help.
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </AnimateInView>
          </div>

          {/* Right: Visual Problem Demo */}
          <AnimateInView animation="fadeLeft">
            <div className="relative">
              {/* Chaotic Chat Interface */}
              <motion.div
                className="bg-card border border-border rounded-xl p-6 shadow-lg relative overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-foreground">
                    Traditional AI Chat
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-xs text-muted-foreground">
                      Chaos Mode
                    </span>
                  </div>
                </div>

                {/* Overwhelming chat messages */}
                <div className="space-y-3 h-64 overflow-y-auto">
                  <motion.div
                    className="bg-muted/50 p-3 rounded-lg text-sm"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    Can you explain quantum computing?
                  </motion.div>

                  <motion.div
                    className="bg-primary/10 p-3 rounded-lg text-sm ml-4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    Quantum computing uses quantum bits...
                  </motion.div>

                  <motion.div
                    className="bg-muted/50 p-3 rounded-lg text-sm relative"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    Wait, what about blockchain integration?
                    <div className="absolute -right-2 -top-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold animate-bounce">
                      !
                    </div>
                  </motion.div>

                  <motion.div
                    className="bg-primary/10 p-3 rounded-lg text-sm ml-4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    That's a different topic entirely...
                  </motion.div>

                  <motion.div
                    className="bg-muted/50 p-3 rounded-lg text-sm relative"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.0 }}
                  >
                    Oh, and what about AI ethics?
                    <div className="absolute -right-2 -top-2 w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold animate-bounce">
                      !
                    </div>
                  </motion.div>

                  <motion.div
                    className="bg-muted/50 p-3 rounded-lg text-sm relative"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.2 }}
                  >
                    Actually, back to quantum - how do qubits work?
                    <div className="absolute -right-2 -top-2 w-6 h-6 rounded-full bg-yellow-500 text-white text-xs flex items-center justify-center font-bold animate-bounce">
                      ?
                    </div>
                  </motion.div>
                </div>

                {/* Chaos indicators */}
                <div className="absolute top-2 right-2 flex gap-1">
                  <motion.div
                    className="w-2 h-2 bg-red-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-orange-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-yellow-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
              </motion.div>

              {/* Emotional impact overlay */}
              <motion.div
                className="absolute -bottom-4 -right-4 bg-gradient-to-r from-red-500 to-orange-500 text-white p-4 rounded-lg shadow-lg max-w-xs"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.5, duration: 0.5 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4" />
                  <span className="font-semibold text-sm">Your Brain:</span>
                </div>
                <p className="text-xs italic">
                  "I can't keep track of all this! Where was that important
                  insight about quantum mechanics?"
                </p>
              </motion.div>
            </div>
          </AnimateInView>
        </div>

        {/* Statistics Section */}
        <AnimateInView animation="fadeUp">
          <div className="bg-card border border-border rounded-2xl p-8 md:p-12">
            <div className="text-center mb-8">
              <h3 className="text-2xl md:text-3xl font-bold mb-4">
                The Hidden Cost of Chat Chaos
              </h3>
              <p className="text-muted-foreground">
                Research shows the devastating impact of fragmented
                conversations
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-red-500 mb-2">
                  76%
                </div>
                <div className="text-sm text-muted-foreground">
                  of insights are lost in chat history
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-orange-500 mb-2">
                  23 min
                </div>
                <div className="text-sm text-muted-foreground">
                  average time to regain focus after interruption
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-yellow-500 mb-2">
                  40%
                </div>
                <div className="text-sm text-muted-foreground">
                  productivity loss from context switching
                </div>
              </div>
            </div>
          </div>
        </AnimateInView>
      </div>
    </section>
  );
}
