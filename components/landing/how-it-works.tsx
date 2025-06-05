"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  MessageSquare,
  GitBranch,
  Network,
  Zap,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import AnimateInView from "./animate-in-view";
import { Button } from "@/components/ui/button";

const steps = [
  {
    id: 1,
    title: "Start Your Conversation",
    description:
      "Begin with any question or topic - just like you would with any AI chat. ContextTree creates your first conversation node automatically.",
    icon: <MessageSquare className="h-6 w-6" />,
    visual: "conversation-start",
    emotion: "Familiar and comfortable",
    benefit: "Zero learning curve - start immediately",
  },
  {
    id: 2,
    title: "Branch When Curious",
    description:
      "When you want to explore a tangent or side question, simply create a branch. Your main conversation stays intact while you dive deep.",
    icon: <GitBranch className="h-6 w-6" />,
    visual: "branching",
    emotion: "Freedom to explore",
    benefit: "Never lose your main thread again",
  },
  {
    id: 3,
    title: "Connect Related Ideas",
    description:
      "Link related concepts across different conversation nodes. Watch your knowledge form a beautiful, interconnected web of understanding.",
    icon: <Network className="h-6 w-6" />,
    visual: "connections",
    emotion: "Clarity and insight",
    benefit: "See the bigger picture instantly",
  },
  {
    id: 4,
    title: "Navigate with Ease",
    description:
      "Zoom out to see your entire conversation landscape, or zoom in to focus on specific threads. Everything is visual, intuitive, and instantly accessible.",
    icon: <Zap className="h-6 w-6" />,
    visual: "navigation",
    emotion: "Control and mastery",
    benefit: "Perfect organization, effortless navigation",
  },
];

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleStepClick = (stepId: number) => {
    setActiveStep(stepId);
  };

  const startDemo = () => {
    setIsPlaying(true);
    setActiveStep(1);

    // Auto-progress through steps
    const interval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev >= 4) {
          setIsPlaying(false);
          clearInterval(interval);
          return 1;
        }
        return prev + 1;
      });
    }, 3000);
  };
  return (
    <section className="py-24 md:py-32 bg-gradient-to-b from-background to-muted/20 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,hsl(var(--primary)/0.05),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,hsl(var(--primary)/0.03),transparent_50%)]" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <AnimateInView animation="fadeUp">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-blue-500/10 text-primary text-sm font-medium mb-6 border border-primary/20">
              <Play className="h-4 w-4 mr-2" />
              <span>See It In Action</span>
            </div>
          </AnimateInView>

          <AnimateInView animation="fadeUp" delay={0.1}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
              <span className="text-foreground">How ContextTree</span>
              <br />
              <span className="text-gradient bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                Transforms Your Thinking
              </span>
            </h2>
          </AnimateInView>

          <AnimateInView animation="fadeUp" delay={0.2}>
            <p className="text-xl text-muted-foreground leading-relaxed mb-8">
              Four simple steps that will revolutionize how you interact with
              AI.
              <span className="text-foreground font-medium">
                {" "}
                Watch chaos become clarity.
              </span>
            </p>
          </AnimateInView>

          <AnimateInView animation="fadeUp" delay={0.3}>
            <Button
              onClick={startDemo}
              disabled={isPlaying}
              className="px-8 py-4 text-lg rounded-full bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 shadow-lg transition-all duration-300"
            >
              {isPlaying ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="mr-2"
                  >
                    <Zap className="h-5 w-5" />
                  </motion.div>
                  Playing Demo...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Watch Interactive Demo
                </>
              )}
            </Button>
          </AnimateInView>
        </div>

        {/* Interactive Demo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left: Step Navigator */}
          <div className="space-y-6">
            {steps.map((step, index) => (
              <AnimateInView
                key={step.id}
                animation="fadeRight"
                delay={index * 0.1}
              >
                <motion.div
                  className={`cursor-pointer p-6 rounded-2xl border transition-all duration-300 ${
                    activeStep === step.id
                      ? "bg-card border-primary shadow-lg shadow-primary/10"
                      : "bg-card/50 border-border hover:bg-card hover:border-border/80"
                  }`}
                  onClick={() => handleStepClick(step.id)}
                  whileHover={{ y: activeStep === step.id ? 0 : -2 }}
                >
                  <div className="flex items-start gap-4">
                    {/* Step number and icon */}
                    <div className="flex-shrink-0">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                          activeStep === step.id
                            ? "bg-primary text-white shadow-lg"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {activeStep === step.id ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2 }}
                          >
                            {step.icon}
                          </motion.div>
                        ) : (
                          <span className="text-sm font-bold">{step.id}</span>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h3
                        className={`font-semibold mb-2 transition-colors ${
                          activeStep === step.id
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {step.title}
                      </h3>

                      <p
                        className={`text-sm leading-relaxed mb-3 transition-colors ${
                          activeStep === step.id
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {step.description}
                      </p>

                      {/* Emotional benefit */}
                      {activeStep === step.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="space-y-2"
                        >
                          <div className="flex items-center gap-2 text-sm text-primary font-medium">
                            <CheckCircle className="h-4 w-4" />
                            {step.benefit}
                          </div>
                          <div className="text-xs italic text-muted-foreground">
                            "{step.emotion}"
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Active indicator */}
                    {activeStep === step.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex-shrink-0"
                      >
                        <ArrowRight className="h-5 w-5 text-primary" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </AnimateInView>
            ))}
          </div>

          {/* Right: Visual Demo */}
          <div className="lg:sticky lg:top-8">
            <AnimateInView animation="fadeLeft">
              <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="font-semibold text-foreground">Live Demo</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs text-muted-foreground">
                      Step {activeStep}
                    </span>
                  </div>
                </div>

                {/* Demo Canvas */}
                <div className="h-96 bg-gradient-to-br from-background to-muted/30 rounded-xl relative overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeStep}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.5 }}
                      className="absolute inset-0"
                    >
                      {/* Step 1: Single conversation node */}
                      {activeStep === 1 && (
                        <div className="flex items-center justify-center h-full">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className="bg-primary/20 border-2 border-primary rounded-xl p-6 max-w-sm text-center"
                          >
                            <MessageSquare className="h-8 w-8 text-primary mx-auto mb-3" />
                            <div className="text-sm font-semibold text-foreground mb-2">
                              Main Conversation
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Tell me about quantum computing...
                            </div>
                          </motion.div>
                        </div>
                      )}

                      {/* Step 2: Branching */}
                      {activeStep === 2 && (
                        <div className="flex items-center justify-center h-full">
                          <div className="relative">
                            {/* Main node */}
                            <motion.div
                              initial={{ x: -50, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: 0.2 }}
                              className="bg-primary/20 border-2 border-primary rounded-xl p-4 text-center"
                            >
                              <div className="text-xs font-semibold text-primary mb-1">
                                Main
                              </div>
                              <div className="text-xs text-foreground">
                                Quantum Computing
                              </div>
                            </motion.div>

                            {/* Branch connection */}
                            <motion.div
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ delay: 0.5, duration: 0.8 }}
                              className="absolute top-1/2 left-full w-16 h-px"
                            >
                              <svg className="w-full h-full">
                                <line
                                  x1="0"
                                  y1="50%"
                                  x2="100%"
                                  y2="50%"
                                  stroke="hsl(var(--primary))"
                                  strokeWidth="2"
                                  strokeDasharray="5,5"
                                />
                              </svg>
                            </motion.div>

                            {/* Branch node */}
                            <motion.div
                              initial={{ x: 50, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: 0.8 }}
                              className="absolute top-0 left-32 bg-orange-500/20 border-2 border-orange-500 rounded-xl p-4 text-center"
                            >
                              <div className="text-xs font-semibold text-orange-500 mb-1">
                                Branch
                              </div>
                              <div className="text-xs text-foreground">
                                Qubits Detail
                              </div>
                            </motion.div>
                          </div>
                        </div>
                      )}

                      {/* Step 3: Connections */}
                      {activeStep === 3 && (
                        <div className="flex items-center justify-center h-full">
                          <div className="relative">
                            <svg
                              className="absolute inset-0 w-full h-full"
                              viewBox="0 0 300 200"
                            >
                              <motion.path
                                d="M50,100 Q100,50 150,100"
                                stroke="hsl(var(--primary))"
                                strokeWidth="2"
                                fill="none"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ delay: 0.5, duration: 1 }}
                              />
                              <motion.path
                                d="M150,100 Q200,150 250,100"
                                stroke="hsl(var(--primary))"
                                strokeWidth="2"
                                fill="none"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ delay: 1, duration: 1 }}
                              />
                            </svg>

                            {/* Nodes */}
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.2 }}
                              className="absolute top-16 left-4 bg-primary/20 border-2 border-primary rounded-lg p-3 text-center"
                            >
                              <div className="text-xs text-primary font-semibold">
                                Quantum
                              </div>
                            </motion.div>

                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.4 }}
                              className="absolute top-16 left-32 bg-green-500/20 border-2 border-green-500 rounded-lg p-3 text-center"
                            >
                              <div className="text-xs text-green-500 font-semibold">
                                Algorithms
                              </div>
                            </motion.div>

                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.6 }}
                              className="absolute top-16 right-4 bg-blue-500/20 border-2 border-blue-500 rounded-lg p-3 text-center"
                            >
                              <div className="text-xs text-blue-500 font-semibold">
                                Applications
                              </div>
                            </motion.div>
                          </div>
                        </div>
                      )}

                      {/* Step 4: Full canvas */}
                      {activeStep === 4 && (
                        <div className="relative h-full">
                          <motion.div
                            initial={{ scale: 1.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 1 }}
                            className="absolute inset-0 bg-gradient-to-br from-primary/5 to-blue-500/5 rounded-lg"
                          />

                          <div className="flex items-center justify-center h-full">
                            <motion.div
                              initial={{ y: 20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.5 }}
                              className="text-center"
                            >
                              <Network className="h-16 w-16 text-primary mx-auto mb-4" />
                              <div className="text-lg font-semibold text-foreground mb-2">
                                Complete Knowledge Map
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Navigate your entire conversation universe
                              </div>
                            </motion.div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Step indicator */}
                <div className="flex items-center justify-center gap-2 mt-6">
                  {steps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveStep(index + 1)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        activeStep === index + 1
                          ? "bg-primary scale-125"
                          : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </AnimateInView>
          </div>
        </div>

        {/* Bottom CTA */}
        <AnimateInView animation="fadeUp" delay={0.5}>
          <div className="text-center mt-20">
            <h3 className="text-2xl font-bold mb-4 text-foreground">
              Ready to Experience the Magic?
            </h3>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of researchers, students, and professionals who've
              transformed their thinking with ContextTree.
            </p>
            <Button
              size="lg"
              className="px-10 py-4 text-lg rounded-full bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 shadow-lg transition-all duration-300"
            >
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>{" "}
        </AnimateInView>
      </div>
    </section>
  );
}
