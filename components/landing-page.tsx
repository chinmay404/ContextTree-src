"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  GitBranch,
  Zap,
  Check,
  Play,
  MessageSquare,
  AlertCircle,
  X,
  Bot,
  Code,
  Clock,
  TrendingUp,
  Layers,
  Link2,
  FlaskConical,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ModelProviderIcon } from "@/components/model-badge";

export function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState("problem");
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = () => {
    if (email && email.includes("@")) {
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setEmail("");
      }, 3000);
    }
  };

  const handleGetStarted = () => {
    router.push("/auth/signin");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="px-6 py-4 flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center space-x-2.5 text-xl font-semibold">
            <Image
              src="/tree-icon.svg"
              alt="ContextTree"
              width={24}
              height={24}
              className="w-6 h-6"
            />
            <span className="text-slate-900">ContextTree</span>
          </div>
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium">
            <a
              href="#features"
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              Features
            </a>
            <a
              href="#how"
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              How It Works
            </a>
            <a
              href="#use-cases"
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              Use Cases
            </a>
          </div>
          <button
            onClick={handleGetStarted}
            className="px-5 py-2 text-sm font-medium bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-sm hover:shadow-md"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-8 mb-20">
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 bg-white shadow-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span>Now in Beta</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight text-slate-900">
              Visual workspace for
              <br />
              <span className="text-slate-600">multi-LLM conversations</span>
            </h1>

            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Build conversational flows visually. Branch at any point. Compare
              AI responses side-by-side. Never lose context.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={handleGetStarted}
                className="group px-7 py-3.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all flex items-center space-x-2 font-medium shadow-lg hover:shadow-xl"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="#demo"
                className="px-7 py-3.5 border border-slate-300 rounded-xl hover:bg-slate-100 transition-all flex items-center space-x-2 font-medium bg-white shadow-sm"
              >
                <Play className="w-4 h-4" />
                <span>See How It Works</span>
              </a>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-8 py-12 border-y border-slate-200">
            <div className="text-center">
              <div className="text-4xl font-bold text-slate-900 mb-2">10+</div>
              <div className="text-sm text-slate-600 font-medium">
                Open-Source Models
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-slate-900 mb-2">∞</div>
              <div className="text-sm text-slate-600 font-medium">
                Unlimited Branches
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-slate-900 mb-2">100%</div>
              <div className="text-sm text-slate-600 font-medium">
                Context Preserved
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Problem Demo */}
      <section id="demo" className="px-6 py-32 bg-white relative">
        <div className="absolute inset-0 bg-slate-50/50 [mask-image:linear-gradient(to_bottom,transparent,white_20%,white_80%,transparent)]" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-slate-900">
              The Context Problem
            </h2>
            <p className="text-slate-500 text-lg">
              Why traditional chat interfaces hold you back
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-slate-100/80 backdrop-blur-sm rounded-full p-1.5 ring-1 ring-slate-200">
              {["problem", "solution"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-8 py-3 text-sm font-medium rounded-full transition-all duration-300 ${
                    activeTab === tab
                      ? "text-slate-900"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {activeTab === tab && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-slate-200/50"
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.6,
                      }}
                    />
                  )}
                  <span className="relative z-10">
                    {tab === "problem" ? "Traditional Chat" : "ContextTree Flow"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Content View */}
          <div className="relative h-[600px] bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden shadow-xl">
            <AnimatePresence mode="wait">
              {activeTab === "problem" ? (
                <motion.div
                  key="problem"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 p-8 flex flex-col items-center justify-center bg-slate-100/50"
                >
                  <div className="relative w-full max-w-4xl h-full">
                    {/* Chaotic Browser Windows */}
                    <motion.div
                      className="absolute top-10 left-10 right-10 bottom-20 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      style={{ rotate: "-2deg" }}
                    >
                      <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-amber-400" />
                        <div className="w-3 h-3 rounded-full bg-emerald-400" />
                      </div>
                      <div className="p-6 space-y-4 opacity-50 blur-[1px]">
                        <div className="flex gap-4">
                          <div className="w-8 h-8 rounded bg-slate-200" />
                          <div className="flex-1 space-y-2">
                            <div className="h-2 bg-slate-200 rounded w-3/4" />
                            <div className="h-2 bg-slate-200 rounded w-1/2" />
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      className="absolute top-6 left-20 right-20 bottom-16 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      style={{ rotate: "1deg" }}
                    >
                      <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-amber-400" />
                        <div className="w-3 h-3 rounded-full bg-emerald-400" />
                      </div>
                      <div className="p-6 space-y-4 opacity-70">
                        <div className="flex gap-4">
                          <div className="w-8 h-8 rounded bg-slate-200" />
                          <div className="flex-1 space-y-2">
                            <div className="h-2 bg-slate-200 rounded w-2/3" />
                            <div className="h-2 bg-slate-200 rounded w-1/2" />
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] bottom-10 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-400" />
                          <div className="w-3 h-3 rounded-full bg-amber-400" />
                          <div className="w-3 h-3 rounded-full bg-emerald-400" />
                        </div>
                        <div className="text-xs font-mono text-slate-400">
                          chat-gpt-v4.html
                        </div>
                      </div>
                      <div className="p-8 space-y-6">
                        <div className="flex gap-4">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                            U
                          </div>
                          <div className="bg-slate-100 rounded-2xl rounded-tl-sm p-4 text-sm text-slate-700">
                            Can you explain the difference between DFS and BFS?
                          </div>
                        </div>
                        <div className="flex gap-4 flex-row-reverse">
                          <div className="w-8 h-8 rounded-lg bg-green-600 text-white flex items-center justify-center">
                            <Bot className="w-4 h-4" />
                          </div>
                          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-tr-sm p-4 text-sm text-slate-600">
                            DFS (Depth-First Search) explores as far as possible
                            along each branch before backtracking...
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                            U
                          </div>
                          <div className="bg-slate-100 rounded-2xl rounded-tl-sm p-4 text-sm text-slate-700">
                            What about in Python?
                          </div>
                        </div>
                        <div className="flex gap-4 flex-row-reverse">
                          <div className="w-8 h-8 rounded-lg bg-green-600 text-white flex items-center justify-center">
                            <Bot className="w-4 h-4" />
                          </div>
                          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl rounded-tr-sm p-4 text-sm text-slate-600">
                            Wait, are we still talking about sorting or trees? I
                            might have lost context from the other tab...
                          </div>
                        </div>
                      </div>

                      {/* Problem Overlay */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.5 }}
                        className="absolute inset-0 bg-slate-900/5 backdrop-blur-[2px] flex items-center justify-center"
                      >
                        <div className="bg-white/90 backdrop-blur-xl border border-red-100 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 max-w-sm text-center">
                          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-1">
                            <AlertCircle className="w-6 h-6 text-red-500" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">
                              Context Fragmented
                            </h3>
                            <p className="text-sm text-slate-500">
                              Switching tabs breaks your flow. You can't compare
                              answers easily or branch off ideas.
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="solution"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 bg-white"
                >
                  <div className="relative w-full h-full p-8 overflow-hidden">
                    {/* Grid Background */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

                    {/* Tree Visualization */}
                    <div className="relative w-full h-full flex items-center justify-center">
                      <div className="relative w-[800px] h-[500px]">
                        <svg className="absolute inset-0 w-full h-full visible stroke-slate-300 stroke-2 fill-none">
                          <motion.path
                            d="M 400 50 L 400 150"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                          />
                          <motion.path
                            d="M 400 150 C 400 150, 200 200, 200 300"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.5, delay: 0.8 }}
                          />
                          <motion.path
                            d="M 400 150 C 400 150, 600 200, 600 300"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.5, delay: 0.8 }}
                          />

                          {/* Sub branches */}
                          <motion.path
                            d="M 200 300 L 150 400"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.5, delay: 1.5 }}
                          />
                          <motion.path
                            d="M 200 300 L 250 400"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.5, delay: 1.5 }}
                          />
                        </svg>

                        {/* Root Node */}
                        <motion.div
                          className="absolute top-[20px] left-1/2 -translate-x-1/2"
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5 }}
                        >
                          <div className="bg-slate-900 text-white px-6 py-3 rounded-xl shadow-lg border border-slate-800 flex items-center gap-3">
                            <MessageSquare className="w-4 h-4" />
                            <span className="font-medium text-sm">
                              Explain DFS vs BFS
                            </span>
                          </div>
                        </motion.div>

                        {/* Branch Node 1 (Llama) */}
                        <motion.div
                          className="absolute top-[280px] left-[150px]"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.5, delay: 1.2 }}
                        >
                          <div className="bg-white px-5 py-4 rounded-xl shadow-lg border-2 border-blue-500 w-64 group hover:scale-105 transition-transform cursor-pointer">
                            <div className="flex items-center gap-2 mb-2">
                              <ModelProviderIcon
                                modelId="llama-3.3-70b-versatile"
                                provider="Meta"
                                size={16}
                              />
                              <span className="text-xs font-bold text-slate-500 uppercase">
                                LLaMA 3
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              DFS goes deep, BFS goes wide. Use DFS for pathfinding,
                              BFS for shortest path...
                            </p>
                          </div>
                        </motion.div>

                        {/* Branch Node 2 (Claude) */}
                        <motion.div
                          className="absolute top-[280px] right-[150px]"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.5, delay: 1.2 }}
                        >
                          <div className="bg-white px-5 py-4 rounded-xl shadow-lg border-2 border-purple-500 w-64 group hover:scale-105 transition-transform cursor-pointer">
                            <div className="flex items-center gap-2 mb-2">
                              <ModelProviderIcon
                                modelId="deepseek-r1-distill-llama-70b"
                                provider="DeepSeek"
                                size={16}
                              />
                              <span className="text-xs font-bold text-slate-500 uppercase">
                                DeepSeek
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              Imagine a maze. DFS follows one wall until it hits a
                              dead end. BFS expands like water...
                            </p>
                          </div>
                        </motion.div>

                        {/* Comparison Tooltip */}
                        <motion.div
                          className="absolute top-[240px] left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] px-3 py-1 rounded-full font-medium"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 2 }}
                        >
                          Comparing Parallel Contexts
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* How It Works - Enhanced Visual */}
      <section id="how" className="px-6 py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-slate-900">
              How it works
            </h2>
            <p className="text-slate-600 text-lg">
              Three steps to better conversations
            </p>
          </div>

          <div className="relative">
            {/* Connection Line */}
            <div className="hidden md:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

            {/* Animated Dots on Line */}
            <div className="hidden md:block absolute top-24 left-1/6 w-3 h-3 bg-slate-400 rounded-full -translate-y-1/2 animate-pulse" />
            <div
              className="hidden md:block absolute top-24 left-1/2 w-3 h-3 bg-slate-400 rounded-full -translate-y-1/2 -translate-x-1/2 animate-pulse"
              style={{ animationDelay: "0.5s" }}
            />
            <div
              className="hidden md:block absolute top-24 right-1/6 w-3 h-3 bg-slate-400 rounded-full -translate-y-1/2 animate-pulse"
              style={{ animationDelay: "1s" }}
            />

            <div className="grid md:grid-cols-3 gap-8 mb-16 relative">
              {[
                {
                  step: "01",
                  title: "Start Conversation",
                  description:
                    "Choose your LLM and ask your question. Every message becomes a visual node on your canvas.",
                  icon: MessageSquare,
                  visual: (
                    <div className="mt-6 bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="h-2 bg-slate-200 rounded w-full" />
                          <div className="h-2 bg-slate-200 rounded w-3/4" />
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          <ModelProviderIcon
                            modelId="llama-3.3-70b-versatile"
                            provider="Meta"
                            size={14}
                          />
                          <span>Llama</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                          <ModelProviderIcon
                            modelId="deepseek-r1-distill-llama-70b"
                            provider="DeepSeek"
                            size={14}
                          />
                          <span>DeepSeek</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                          <ModelProviderIcon
                            modelId="mixtral-8x7b"
                            provider="Mistral"
                            size={14}
                          />
                          <span>Mixtral</span>
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  step: "02",
                  title: "Branch & Compare",
                  description:
                    "Fork at any point. Try different models on the same prompt. Each branch maintains clean, isolated context.",
                  icon: GitBranch,
                  visual: (
                    <div className="mt-6 bg-white rounded-xl p-4 border border-slate-200 shadow-sm relative">
                      <div className="flex justify-center mb-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
                          <GitBranch className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <svg className="w-full h-16" viewBox="0 0 100 60">
                        <line
                          x1="50"
                          y1="0"
                          x2="30"
                          y2="40"
                          stroke="#cbd5e1"
                          strokeWidth="2"
                        />
                        <line
                          x1="50"
                          y1="0"
                          x2="70"
                          y2="40"
                          stroke="#cbd5e1"
                          strokeWidth="2"
                        />
                        <circle cx="50" cy="0" r="4" fill="#0f172a" />
                        <circle cx="30" cy="40" r="4" fill="#3b82f6" />
                        <circle cx="70" cy="40" r="4" fill="#8b5cf6" />
                      </svg>
                      <div className="flex justify-between text-xs text-slate-600 font-medium">
                        <span>Path A</span>
                        <span>Path B</span>
                      </div>
                    </div>
                  ),
                },
                {
                  step: "03",
                  title: "Evaluate & Iterate",
                  description:
                    "Compare responses side-by-side. Follow the best path forward. Your entire conversation tree auto-saves.",
                  icon: TrendingUp,
                  visual: (
                    <div className="mt-6 bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-slate-600 font-medium">
                                Response Quality
                              </span>
                              <span className="text-xs text-slate-900 font-bold">
                                92%
                              </span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: "92%" }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-slate-600 font-medium">
                                Context Preserved
                              </span>
                              <span className="text-xs text-slate-900 font-bold">
                                100%
                              </span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: "100%" }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="pt-2 flex items-center gap-2 text-xs text-emerald-600 font-medium">
                          <Check className="w-4 h-4" />
                          <span>Auto-saved</span>
                        </div>
                      </div>
                    </div>
                  ),
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`relative transition-all duration-500 ${
                    activeStep === i ? "scale-105" : "scale-100"
                  }`}
                >
                  {/* Step Number Badge */}
                  <div className="absolute -top-4 -left-4 z-10">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                        activeStep === i
                          ? "bg-slate-900 text-white shadow-lg scale-110"
                          : "bg-white text-slate-900 border-2 border-slate-200"
                      }`}
                    >
                      {item.step}
                    </div>
                  </div>

                  {/* Main Card */}
                  <div
                    className={`p-8 rounded-2xl border transition-all duration-300 ${
                      activeStep === i
                        ? "bg-slate-900 text-white border-slate-900 shadow-2xl"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-lg"
                    }`}
                  >
                    <div
                      className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-all ${
                        activeStep === i
                          ? "bg-white"
                          : "bg-slate-50 border border-slate-200"
                      }`}
                    >
                      <item.icon
                        className={`w-7 h-7 ${
                          activeStep === i ? "text-slate-900" : "text-slate-900"
                        }`}
                      />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                    <p
                      className={`text-sm leading-relaxed mb-4 ${
                        activeStep === i ? "text-slate-300" : "text-slate-600"
                      }`}
                    >
                      {item.description}
                    </p>

                    {/* Visual Demo */}
                    <div
                      className={
                        activeStep === i ? "opacity-100" : "opacity-60"
                      }
                    >
                      {item.visual}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress Indicator */}
            <div className="flex justify-center gap-2 mt-8">
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  onClick={() => setActiveStep(i)}
                  className={`transition-all duration-300 ${
                    activeStep === i
                      ? "w-8 h-2 bg-slate-900 rounded-full"
                      : "w-2 h-2 bg-slate-300 rounded-full hover:bg-slate-400"
                  }`}
                  aria-label={`Step ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="px-6 py-24 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-slate-900">
              Core capabilities
            </h2>
            <p className="text-slate-600 text-lg">
              Professional tools for AI experimentation
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: GitBranch,
                title: "Visual Branching",
                description:
                  "Fork conversations at any point. Each path maintains isolated context without contamination.",
                visual: (
                  <div className="mt-4 relative h-24 bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 border border-slate-200">
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-900 rounded-lg text-white text-[10px] font-semibold shadow-sm">
                      Root
                    </div>
                    <div className="absolute bottom-3 left-1/4 px-2.5 py-1.5 bg-slate-200 border border-slate-300 rounded-lg text-[10px] font-medium shadow-sm">
                      Branch A
                    </div>
                    <div className="absolute bottom-3 right-1/4 px-2.5 py-1.5 bg-slate-200 border border-slate-300 rounded-lg text-[10px] font-medium shadow-sm">
                      Branch B
                    </div>
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      <line
                        x1="50%"
                        y1="30%"
                        x2="35%"
                        y2="70%"
                        stroke="#cbd5e1"
                        strokeWidth="2"
                      />
                      <line
                        x1="50%"
                        y1="30%"
                        x2="65%"
                        y2="70%"
                        stroke="#cbd5e1"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                ),
              },
              {
                icon: Zap,
                title: "Open-Source Models",
                description:
                  "Test multiple open-source models (Llama, Mixtral, Gemma, DeepSeek) side-by-side via Groq. Fast and free.",
                visual: (
                  <div className="mt-4 flex gap-2">
                    <div className="flex-1 h-20 bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mb-2"></div>
                      <div className="space-y-1.5">
                        <div className="h-1 bg-slate-200 rounded w-3/4"></div>
                        <div className="h-1 bg-slate-200 rounded w-1/2"></div>
                        <div className="h-1 bg-slate-200 rounded w-2/3"></div>
                      </div>
                    </div>
                    <div className="flex-1 h-20 bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mb-2"></div>
                      <div className="space-y-1.5">
                        <div className="h-1 bg-slate-200 rounded w-2/3"></div>
                        <div className="h-1 bg-slate-200 rounded w-3/4"></div>
                        <div className="h-1 bg-slate-200 rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="flex-1 h-20 bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mb-2"></div>
                      <div className="space-y-1.5">
                        <div className="h-1 bg-slate-200 rounded w-1/2"></div>
                        <div className="h-1 bg-slate-200 rounded w-2/3"></div>
                        <div className="h-1 bg-slate-200 rounded w-3/4"></div>
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                icon: Layers,
                title: "Context Isolation",
                description:
                  "Each branch inherits only its parent context. Zero contamination between conversation paths.",
                visual: (
                  <div className="mt-4 bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center text-white text-[10px] font-bold">
                        A
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <div className="w-6 h-6 bg-slate-400 rounded-lg flex items-center justify-center text-white text-[10px] font-bold">
                        B
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <div className="w-6 h-6 bg-slate-900 border-2 border-slate-500 rounded-lg flex items-center justify-center text-white text-[10px] font-bold">
                        C
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-600 text-center font-medium">
                      C inherits: A → B only
                    </div>
                  </div>
                ),
              },
              {
                icon: Clock,
                title: "Auto-Save",
                description:
                  "Every change saves automatically. Never lose your work or conversation history.",
                visual: (
                  <div className="mt-4 flex items-center justify-center h-24 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl border-2 border-slate-900 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-slate-900" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                icon: Link2,
                title: "Context Linking",
                description:
                  "Link relevant context nodes to any conversation branch. Keep instructions and data organized.",
                badge: "Coming Soon",
                visual: (
                  <div className="mt-4 bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 border border-slate-200 space-y-2">
                    <div className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-[10px] font-semibold text-center text-slate-700">
                      📄 Knowledge Base
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 h-6 bg-white border border-slate-300 rounded-lg text-[9px] flex items-center justify-center text-slate-600">
                        Doc
                      </div>
                      <div className="flex-1 h-6 bg-white border border-slate-300 rounded-lg text-[9px] flex items-center justify-center text-slate-600">
                        API
                      </div>
                      <div className="flex-1 h-6 bg-white border border-slate-300 rounded-lg text-[9px] flex items-center justify-center text-slate-600">
                        Data
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                icon: FlaskConical,
                title: "Experiment Mode",
                description:
                  "Test multiple prompts and parameters simultaneously. Find optimal configurations faster.",
                badge: "Coming Soon",
                visual: (
                  <div className="mt-4 bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 border border-slate-200">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px]">
                        <div className="w-16 text-slate-600 font-medium">
                          Temp:
                        </div>
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-900 w-3/4"></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <div className="w-16 text-slate-600 font-medium">
                          Max Tok:
                        </div>
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-900 w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all bg-white relative"
              >
                {feature.badge && (
                  <div className="absolute top-5 right-5 text-[10px] font-semibold text-slate-500 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
                    {feature.badge}
                  </div>
                )}
                <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-slate-900">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                  {feature.description}
                </p>
                {feature.visual}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="px-6 py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-slate-900">
              Built for professionals
            </h2>
            <p className="text-slate-600 text-lg">
              From research to production
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Researchers",
                description:
                  "Compare model outputs systematically. Document hypothesis testing. Export conversation trees for reproducible research.",
                features: [
                  "Multi-model analysis",
                  "Export findings",
                  "Reproducible experiments",
                ],
              },
              {
                title: "Developers",
                description:
                  "Prototype AI features faster. Test prompts across providers. Debug conversations with instant feedback loops.",
                features: [
                  "Rapid prototyping",
                  "API evaluation",
                  "Prompt engineering",
                ],
              },
              {
                title: "Product Teams",
                description:
                  "Explore different conversation flows. Test user scenarios. Find the best AI interaction patterns for your product.",
                features: [
                  "Flow exploration",
                  "Scenario testing",
                  "Pattern discovery",
                ],
              },
            ].map((useCase, i) => (
              <div
                key={i}
                className="p-8 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all bg-white"
              >
                <h3 className="text-2xl font-bold mb-3 text-slate-900">
                  {useCase.title}
                </h3>
                <p className="text-slate-600 leading-relaxed mb-6">
                  {useCase.description}
                </p>
                <div className="space-y-2.5">
                  {useCase.features.map((feature, j) => (
                    <div
                      key={j}
                      className="flex items-center gap-2.5 text-sm text-slate-600"
                    >
                      <div className="w-1.5 h-1.5 bg-slate-900 rounded-full"></div>
                      <span className="font-medium">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-32 bg-white">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900">
              Start building smarter conversations
            </h2>
            <p className="text-xl text-slate-600">
              Join the beta. Free forever for core features.
            </p>
          </div>

          {!isSubmitted ? (
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="your@email.com"
                className="flex-1 px-5 py-3.5 rounded-xl bg-white border border-slate-300 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all text-slate-900 placeholder-slate-400 text-sm shadow-sm"
              />
              <button
                onClick={handleSubmit}
                className="px-7 py-3.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all font-medium text-sm whitespace-nowrap shadow-lg hover:shadow-xl"
              >
                Get Started
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2.5 py-3.5 px-6 bg-emerald-50 border border-emerald-200 rounded-xl max-w-md mx-auto">
              <Check className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-900">
                You're on the list! Check your email.
              </span>
            </div>
          )}

          <div className="flex items-center justify-center gap-6 text-sm text-slate-500 pt-4">
            <span className="font-medium">Free beta access</span>
            <span>•</span>
            <span className="font-medium">No credit card required</span>
            <span>•</span>
            <span className="font-medium">Start immediately</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
            <div className="flex items-center space-x-2.5 font-bold text-lg">
              <Image
                src="/tree-icon.svg"
                alt="ContextTree"
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <span className="text-slate-900">ContextTree</span>
            </div>
            <div className="flex gap-8 text-sm font-medium text-slate-600">
              <a
                href="#features"
                className="hover:text-slate-900 transition-colors"
              >
                Features
              </a>
              <a href="#how" className="hover:text-slate-900 transition-colors">
                How It Works
              </a>
              <a
                href="#use-cases"
                className="hover:text-slate-900 transition-colors"
              >
                Use Cases
              </a>
            </div>
          </div>
          <div className="text-center text-sm text-slate-500">
            © 2025 ContextTree. Built for better AI conversations.
          </div>
        </div>
      </footer>
    </div>
  );
}
