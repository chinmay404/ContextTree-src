"use client";

import { useState } from "react";
import {
  Network,
  GitBranch,
  Sparkles,
  CheckCircle,
  ArrowRight,
  Zap,
  Heart,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import AnimateInView from "./animate-in-view";
import { motion } from "framer-motion";

export default function SolutionSection() {
  const [activeFeature, setActiveFeature] = useState(0);

  const transformations = [
    {
      before: "Chaotic conversations",
      after: "Organized visual threads",
      emotion: "From overwhelmed to in control",
      icon: <Network className="h-6 w-6" />,
      color: "primary",
    },
    {
      before: "Lost context & insights",
      after: "Preserved knowledge graphs",
      emotion: "From forgetful to brilliant",
      icon: <GitBranch className="h-6 w-6" />,
      color: "green-500",
    },
    {
      before: "Scattered thinking",
      after: "Connected understanding",
      emotion: "From confused to confident",
      icon: <Sparkles className="h-6 w-6" />,
      color: "blue-500",
    },
  ];

  return (
    <section className="py-24 md:py-32 bg-gradient-to-b from-muted/20 via-background to-muted/20 relative overflow-hidden">
      {/* Enhanced background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,hsl(var(--primary)/0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_80%,hsl(var(--primary)/0.05),transparent_50%)]" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <AnimateInView animation="fadeUp">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-500/10 text-green-600 text-sm font-medium mb-6 border border-green-500/20">
              <CheckCircle className="h-4 w-4 mr-2" />
              <span>The ContextTree Solution</span>
            </div>
          </AnimateInView>

          <AnimateInView animation="fadeUp" delay={0.1}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
              <span className="text-foreground">Transform Chaos Into</span>
              <br />
              <span className="text-gradient bg-gradient-to-r from-primary to-green-500 bg-clip-text text-transparent">
                Crystal Clear Thinking
              </span>
            </h2>
          </AnimateInView>

          <AnimateInView animation="fadeUp" delay={0.2}>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Experience the revolutionary feeling of having every thought,
              every insight, every connection
              <span className="text-foreground font-medium">
                {" "}
                perfectly organized and instantly accessible.
              </span>
            </p>
          </AnimateInView>
        </div>

        {/* Transformation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {transformations.map((transformation, index) => (
            <AnimateInView key={index} animation="fadeUp" delay={index * 0.1}>
              <motion.div
                className="bg-card border border-border rounded-2xl p-8 text-center relative overflow-hidden group hover:shadow-lg transition-all duration-300"
                whileHover={{ y: -5 }}
              >
                {/* Icon */}
                <div
                  className={`mx-auto w-16 h-16 bg-${transformation.color}/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <div className={`text-${transformation.color}`}>
                    {transformation.icon}
                  </div>
                </div>

                {/* Before/After */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <span className="line-through">
                      {transformation.before}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                  <div className="font-semibold text-foreground">
                    {transformation.after}
                  </div>
                </div>

                {/* Emotional benefit */}
                <div
                  className={`inline-flex items-center px-3 py-1 rounded-full bg-${transformation.color}/5 text-${transformation.color} text-sm font-medium`}
                >
                  <Heart className="h-3 w-3 mr-2" />
                  {transformation.emotion}
                </div>

                {/* Decorative element */}
                <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Star className="h-6 w-6 text-primary" />
                </div>
              </motion.div>
            </AnimateInView>
          ))}
        </div>

        {/* Interactive Solution Demo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Solution Features */}
          <div>
            <AnimateInView animation="fadeRight">
              <h3 className="text-2xl md:text-3xl font-bold mb-8 text-foreground">
                How ContextTree Changes Everything
              </h3>
            </AnimateInView>

            <div className="space-y-6">
              {[
                {
                  title: "Visual Conversation Canvas",
                  description:
                    "See all your conversations as connected nodes in a beautiful, interactive map.",
                  icon: <Network className="h-5 w-5" />,
                  benefit: "Instant overview of all your discussions",
                },
                {
                  title: "Smart Branching System",
                  description:
                    "Explore tangents without losing your main thread - branch off and return seamlessly.",
                  icon: <GitBranch className="h-5 w-5" />,
                  benefit: "No more lost context or forgotten insights",
                },
                {
                  title: "Preserved Context",
                  description:
                    "Every node maintains its conversation history, so nothing ever gets lost.",
                  icon: <Sparkles className="h-5 w-5" />,
                  benefit: "Perfect memory of every important detail",
                },
              ].map((feature, index) => (
                <AnimateInView
                  key={index}
                  animation="fadeUp"
                  delay={index * 0.1}
                >
                  <motion.div
                    className="flex gap-4 p-4 rounded-xl bg-card/50 border border-border/50 hover:bg-card hover:border-border transition-all duration-300 cursor-pointer"
                    whileHover={{ x: 5 }}
                    onClick={() => setActiveFeature(index)}
                  >
                    <div className="bg-primary/10 p-3 rounded-lg flex-shrink-0">
                      <div className="text-primary">{feature.icon}</div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">
                        {feature.title}
                      </h4>
                      <p className="text-muted-foreground text-sm mb-2">
                        {feature.description}
                      </p>
                      <div className="inline-flex items-center text-xs font-medium text-green-600">
                        <Zap className="h-3 w-3 mr-1" />
                        {feature.benefit}
                      </div>
                    </div>
                  </motion.div>
                </AnimateInView>
              ))}
            </div>

            <AnimateInView animation="fadeUp" delay={0.4}>
              <div className="mt-8">
                <Link href="/canvas">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto px-8 py-4 text-lg rounded-full bg-gradient-to-r from-primary to-green-500 hover:from-primary/90 hover:to-green-500/90 shadow-lg hover:shadow-primary/25 transition-all duration-300"
                  >
                    Experience the Transformation
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </AnimateInView>
          </div>

          {/* Right: Interactive Canvas Demo */}
          <AnimateInView animation="fadeLeft">
            <div className="relative">
              <motion.div
                className="bg-card border border-border rounded-2xl p-6 shadow-xl relative overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h4 className="font-semibold text-foreground">
                    ContextTree Canvas
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs text-muted-foreground">
                      Organized Mode
                    </span>
                  </div>
                </div>

                {/* Canvas visualization */}
                <div className="h-80 bg-gradient-to-br from-background to-muted/30 rounded-xl relative overflow-hidden">
                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 400 320"
                  >
                    {/* Connection lines */}
                    <motion.path
                      d="M80,160 Q160,120 240,160"
                      stroke="hsl(var(--primary))"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray="none"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.5, delay: 0.5 }}
                    />
                    <motion.path
                      d="M240,160 Q280,120 320,80"
                      stroke="hsl(var(--primary))"
                      strokeWidth="2"
                      fill="none"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.5, delay: 1 }}
                    />
                    <motion.path
                      d="M240,160 Q280,200 320,240"
                      stroke="hsl(var(--primary))"
                      strokeWidth="2"
                      fill="none"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.5, delay: 1.2 }}
                    />
                  </svg>

                  {/* Main node */}
                  <motion.div
                    className="absolute top-1/2 left-20 transform -translate-y-1/2 bg-primary/20 border-2 border-primary rounded-xl p-4 max-w-32 text-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="text-xs font-semibold text-primary mb-1">
                      Main Topic
                    </div>
                    <div className="text-xs text-foreground">
                      Quantum Computing
                    </div>
                  </motion.div>

                  {/* Branch nodes */}
                  <motion.div
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-500/20 border-2 border-green-500 rounded-xl p-3 max-w-28 text-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    <div className="text-xs font-semibold text-green-600 mb-1">
                      Related
                    </div>
                    <div className="text-xs text-foreground">Qubits</div>
                  </motion.div>

                  <motion.div
                    className="absolute top-6 right-6 bg-blue-500/20 border-2 border-blue-500 rounded-xl p-3 max-w-24 text-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.3 }}
                  >
                    <div className="text-xs font-semibold text-blue-600 mb-1">
                      Deep Dive
                    </div>
                    <div className="text-xs text-foreground">Algorithms</div>
                  </motion.div>

                  <motion.div
                    className="absolute bottom-6 right-6 bg-orange-500/20 border-2 border-orange-500 rounded-xl p-3 max-w-24 text-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.5 }}
                  >
                    <div className="text-xs font-semibold text-orange-600 mb-1">
                      Application
                    </div>
                    <div className="text-xs text-foreground">Cryptography</div>
                  </motion.div>
                </div>

                {/* Success indicators */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">
                      Context Preserved
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-xs font-medium">
                      Insights Connected
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-orange-600">
                    <Zap className="h-4 w-4" />
                    <span className="text-xs font-medium">
                      Focus Maintained
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Emotional transformation callout */}
              <motion.div
                className="absolute -bottom-4 -left-4 bg-gradient-to-r from-green-500 to-blue-500 text-white p-4 rounded-lg shadow-lg max-w-xs"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 2, duration: 0.5 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="h-4 w-4" />
                  <span className="font-semibold text-sm">You Feel:</span>
                </div>
                <p className="text-xs italic">
                  "Finally! I can see how everything connects. My thoughts are
                  crystal clear!"
                </p>
              </motion.div>
            </div>
          </AnimateInView>
        </div>
      </div>
    </section>
  );
}
