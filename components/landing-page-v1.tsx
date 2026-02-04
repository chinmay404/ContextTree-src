"use client";

import React, { useState, useEffect } from "react";
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
  Database,
  Network,
  FileText,
  Blocks,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-800 via-purple-700 to-slate-900 pb-2">
                Context-Aware AI
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Build conversational flows visually. Inject data with <strong className="text-slate-900">Context Nodes</strong>. Branch at any point. Compare models side-by-side with perfect context retention.
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
      <section id="demo" className="px-6 py-24 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-slate-900">
              Traditional chats vs ContextTree
            </h2>
            <p className="text-slate-600 text-lg">
              See how context preservation changes everything
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex p-1.5 bg-slate-100 rounded-xl border border-slate-200 shadow-sm">
              <button
                onClick={() => setActiveTab("problem")}
                className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  activeTab === "problem"
                    ? "bg-white text-slate-900 shadow-md"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Traditional Chats
              </button>
              <button
                onClick={() => setActiveTab("solution")}
                className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  activeTab === "solution"
                    ? "bg-white text-slate-900 shadow-md"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ContextTree
              </button>
            </div>
          </div>

          {/* Problem View */}
          {activeTab === "problem" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid md:grid-cols-3 gap-4">
                {/* Tab 1 - GPT OSS */}
                <div className="border border-slate-300 rounded-2xl overflow-hidden bg-white shadow-md">
                  <div className="bg-slate-100 px-4 py-3 border-b border-slate-300 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">
                      GPT OSS
                    </span>
                    <X className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="p-4 space-y-3 h-80 overflow-hidden">
                    <div className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-200 flex-shrink-0" />
                      <div className="flex-1 bg-slate-900 text-white rounded-xl p-3 text-sm">
                        Explain sorting algorithms
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <Bot className="w-7 h-7 flex-shrink-0 text-slate-400" />
                      <div className="flex-1 text-sm text-slate-700 bg-slate-50 rounded-xl p-3 border border-slate-200">
                        Here's a detailed explanation of sorting algorithms
                        including bubble sort, quick sort...
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-200 flex-shrink-0" />
                      <div className="flex-1 bg-slate-900 text-white rounded-xl p-3 text-sm">
                        Now explain in Python
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <Bot className="w-7 h-7 flex-shrink-0 text-slate-400" />
                      <div className="flex-1 text-sm text-slate-700 bg-slate-50 rounded-xl p-3 border border-slate-200">
                        Here's the Python implementation...
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tab 2 - DeepSeek */}
                <div className="border border-slate-300 rounded-2xl overflow-hidden bg-white shadow-md">
                  <div className="bg-slate-100 px-4 py-3 border-b border-slate-300 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">
                      DeepSeek
                    </span>
                    <X className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="p-4 space-y-3 h-80">
                    <div className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-200 flex-shrink-0" />
                      <div className="flex-1 bg-slate-900 text-white rounded-xl p-3 text-sm">
                        Retyping the same question...
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <Bot className="w-7 h-7 flex-shrink-0 text-slate-400" />
                      <div className="flex-1 text-sm text-slate-700 bg-slate-50 rounded-xl p-3 border border-slate-200">
                        Different approach here...
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tab 3 - LLaMA */}
                <div className="border border-slate-300 rounded-2xl overflow-hidden bg-white shadow-md">
                  <div className="bg-slate-100 px-4 py-3 border-b border-slate-300 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">
                      LLaMA
                    </span>
                    <X className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="p-4 space-y-3 h-80">
                    <div className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-200 flex-shrink-0" />
                      <div className="flex-1 bg-slate-900 text-white rounded-xl p-3 text-sm">
                        Lost context, starting over...
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 py-8">
                <AlertCircle className="w-5 h-5 text-slate-500" />
                <p className="text-sm text-slate-600 font-medium">
                  Context lost • Switching tabs • No comparison • Starting over
                </p>
              </div>
            </div>
          )}

          {/* Solution View */}
          {activeTab === "solution" && (
            <div className="animate-in fade-in duration-300">
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-50 to-white p-8 shadow-lg">
                <div className="relative h-[480px]">
                  {/* SVG Connections */}
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ zIndex: 1 }}
                  >
                    {/* Main connections */}
                    <line
                      x1="50%"
                      y1="10%"
                      x2="20%"
                      y2="35%"
                      stroke="#cbd5e1"
                      strokeWidth="2"
                      opacity="0.6"
                    />
                    <line
                      x1="50%"
                      y1="10%"
                      x2="50%"
                      y2="35%"
                      stroke="#cbd5e1"
                      strokeWidth="2"
                      opacity="0.6"
                    />
                    <line
                      x1="50%"
                      y1="10%"
                      x2="80%"
                      y2="35%"
                      stroke="#cbd5e1"
                      strokeWidth="2"
                      opacity="0.6"
                    />

                    {/* Secondary connections */}
                    <line
                      x1="20%"
                      y1="48%"
                      x2="15%"
                      y2="75%"
                      stroke="#cbd5e1"
                      strokeWidth="2"
                      opacity="0.6"
                    />
                    <line
                      x1="20%"
                      y1="48%"
                      x2="25%"
                      y2="75%"
                      stroke="#cbd5e1"
                      strokeWidth="2"
                      opacity="0.6"
                    />
                    <line
                      x1="80%"
                      y1="48%"
                      x2="75%"
                      y2="75%"
                      stroke="#cbd5e1"
                      strokeWidth="2"
                      opacity="0.6"
                    />
                    <line
                      x1="80%"
                      y1="48%"
                      x2="85%"
                      y2="75%"
                      stroke="#cbd5e1"
                      strokeWidth="2"
                      opacity="0.6"
                    />

                    {/* Context Connections */}
                    {/* CS101 -> GPT OSS */}
                    <path
                      d="M 12% 28% C 12% 28%, 18% 28%, 20% 35%"
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      className="animate-pulse"
                    />
                    {/* Stats -> Benchmark */}
                    <path
                      d="M 85% 65% C 85% 65%, 85% 70%, 82% 75%"
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      className="animate-pulse"
                    />
                  </svg>

                  {/* Context Node 1 (Top Left) */}
                  <div className="absolute top-[20%] left-[2%] animate-bounce-slow" style={{ zIndex: 11 }}>
                    <div className="rounded-lg bg-purple-50 border-2 border-purple-200 p-2 w-28 shadow-sm backdrop-blur-sm">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Database className="w-3 h-3 text-purple-600" />
                        <div className="text-xs font-semibold text-purple-900">
                          CS101 PDF
                        </div>
                      </div>
                      <div className="text-[9px] text-purple-700 leading-tight">
                        Sorting algos theory
                      </div>
                    </div>
                  </div>

                  {/* Context Node 2 (Above Benchmark) */}
                  <div className="absolute bottom-[40%] right-[10%] animate-bounce-slow" style={{ animationDelay: "1.5s", zIndex: 11 }}>
                    <div className="rounded-lg bg-emerald-50 border-2 border-emerald-200 p-2 w-28 shadow-sm backdrop-blur-sm">
                      <div className="flex items-center gap-1.5 mb-1">
                        <FileText className="w-3 h-3 text-emerald-600" />
                        <div className="text-xs font-semibold text-emerald-900">
                          Stats.csv
                        </div>
                      </div>
                      <div className="text-[9px] text-emerald-700 leading-tight">
                        Runtime benchmarks
                      </div>
                    </div>
                  </div>

                  {/* Entry Node */}
                  <div
                    className="absolute top-[8%] left-1/2 transform -translate-x-1/2 cursor-pointer"
                    style={{ zIndex: 10 }}
                    onMouseEnter={() => setHoveredNode("entry")}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    <div
                      className={`px-6 py-3 rounded-xl bg-slate-900 text-white shadow-lg transition-all ${
                        hoveredNode === "entry" ? "scale-105 shadow-xl" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Explain sorting algorithms
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* First Level Branches */}
                  <div
                    className="absolute top-[35%] left-[18%] cursor-pointer"
                    style={{ zIndex: 10 }}
                    onMouseEnter={() => setHoveredNode("gpt")}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    <div
                      className={`rounded-xl bg-white border shadow-md p-4 w-48 transition-all ${
                        hoveredNode === "gpt"
                          ? "border-blue-400 scale-105 shadow-xl"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm font-semibold text-slate-900">
                          GPT OSS
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 leading-relaxed">
                        Technical explanation with code examples...
                      </div>
                    </div>
                  </div>

                  <div
                    className="absolute top-[35%] left-1/2 transform -translate-x-1/2 cursor-pointer"
                    style={{ zIndex: 10 }}
                    onMouseEnter={() => setHoveredNode("claude")}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    <div
                      className={`rounded-xl bg-white border shadow-md p-4 w-48 transition-all ${
                        hoveredNode === "claude"
                          ? "border-purple-400 scale-105 shadow-xl"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <span className="text-sm font-semibold text-slate-900">
                          DeepSeek
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 leading-relaxed">
                        Conceptual approach with analogies...
                      </div>
                    </div>
                  </div>

                  <div
                    className="absolute top-[35%] right-[18%] cursor-pointer"
                    style={{ zIndex: 10 }}
                    onMouseEnter={() => setHoveredNode("gemini")}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    <div
                      className={`rounded-xl bg-white border shadow-md p-4 w-48 transition-all ${
                        hoveredNode === "gemini"
                          ? "border-orange-400 scale-105 shadow-xl"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span className="text-sm font-semibold text-slate-900">
                          LLaMA
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 leading-relaxed">
                        Visual diagram-based explanation...
                      </div>
                    </div>
                  </div>

                  {/* Second Level - Deep Branches */}
                  <div
                    className="absolute bottom-[20%] left-[12%]"
                    style={{ zIndex: 10 }}
                  >
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-2.5 w-32 shadow-sm">
                      <div className="text-xs font-semibold mb-1 text-slate-900">
                        Python
                      </div>
                      <div className="text-[10px] text-slate-600 font-mono">
                        def quick_sort():
                      </div>
                    </div>
                  </div>

                  <div
                    className="absolute bottom-[20%] left-[27%]"
                    style={{ zIndex: 10 }}
                  >
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-2.5 w-32 shadow-sm">
                      <div className="text-xs font-semibold mb-1 text-slate-900">
                        JavaScript
                      </div>
                      <div className="text-[10px] text-slate-600 font-mono">
                        const sort = ...
                      </div>
                    </div>
                  </div>

                  <div
                    className="absolute bottom-[20%] right-[27%]"
                    style={{ zIndex: 10 }}
                  >
                    <div className="rounded-lg bg-orange-50 border border-orange-200 p-2.5 w-32 shadow-sm">
                      <div className="text-xs font-semibold mb-1 text-slate-900">
                        Visualize
                      </div>
                      <div className="text-[10px] text-slate-600">
                        Interactive demo
                      </div>
                    </div>
                  </div>

                  <div
                    className="absolute bottom-[20%] right-[12%]"
                    style={{ zIndex: 10 }}
                  >
                    <div className="rounded-lg bg-orange-50 border border-orange-200 p-2.5 w-32 shadow-sm">
                      <div className="text-xs font-semibold mb-1 text-slate-900">
                        Benchmark
                      </div>
                      <div className="text-[10px] text-slate-600">
                        Performance test
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 py-8">
                <Check className="w-5 h-5 text-slate-900" />
                <p className="text-sm text-slate-600 font-medium">
                  Context preserved • Single workspace • Instant comparison •
                  Branch anywhere
                </p>
              </div>
            </div>
          )}
        </div>
      </section>


      {/* Context Node Feature Showcase */}
      <section className="py-24 px-6 bg-slate-50 border-y border-slate-200 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium mb-6 animate-fade-in-up">
                <Database className="w-4 h-4" />
                <span>New Feature</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                Context Nodes: <br />
                <span className="text-purple-600">Your Data, Connected.</span>
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Stop pasting same context repeatedly. Create <strong>Context Nodes</strong> from files, databases, or API responses and wire them directly into any conversation branch.
              </p>
              
              <div className="space-y-6">
                 {[
                    { icon: FileText, title: "Drag & Drop Files", desc: "PDFs, Text, Code - dropped right onto the canvas." },
                    { icon: Blocks, title: "Modular Knowledge", desc: "Reuse context blocks across different conversation paths." },
                    { icon: Network, title: "Visual Data Flow", desc: "See exactly what data is feeding into which model response." }
                 ].map((item, i) => (
                    <div key={i} className="flex gap-4 group">
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:border-purple-200 group-hover:bg-purple-50 transition-colors">
                        <item.icon className="w-6 h-6 text-slate-600 group-hover:text-purple-600 transition-colors" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">{item.title}</h3>
                        <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                 ))}
              </div>
            </div>
            
            <div className="order-1 lg:order-2 relative">
               {/* Visual Representation */}
               <div className="relative rounded-2xl bg-white border border-slate-200 shadow-2xl p-8 aspect-square md:aspect-auto md:h-[500px] flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-slate-50 opacity-50" 
                       style={{ backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
                  </div>
                  
                  {/* Context Node */}
                  <div className="absolute top-1/4 left-1/4 z-20 animate-bounce-slow">
                     <div className="w-48 bg-white rounded-xl border-2 border-purple-500 shadow-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                           <div className="p-1.5 bg-purple-100 rounded-lg">
                              <Database className="w-4 h-4 text-purple-600" />
                           </div>
                           <span className="font-bold text-slate-900 text-sm">Product Specs</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded mb-1.5 w-full"></div>
                        <div className="h-1.5 bg-slate-100 rounded mb-1.5 w-3/4"></div>
                        <div className="h-1.5 bg-slate-100 rounded w-1/2"></div>
                        
                        {/* Output Handle */}
                        <div className="absolute -right-2 top-1/2 w-4 h-4 bg-purple-500 rounded-full border-2 border-white translate-x-0"></div>
                     </div>
                  </div>

                  {/* Chat Node */}
                  <div className="absolute bottom-1/4 right-1/4 z-20">
                     <div className="w-48 bg-white rounded-xl border border-slate-300 shadow-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                           <div className="p-1.5 bg-slate-100 rounded-lg">
                              <Bot className="w-4 h-4 text-slate-600" />
                           </div>
                           <span className="font-bold text-slate-900 text-sm">Marketing Copy</span>
                        </div>
                        <div className="text-xs text-slate-500 italic">Reading context...</div>
                        
                        {/* Input Handle */}
                        <div className="absolute -left-2 top-1/2 w-4 h-4 bg-slate-400 rounded-full border-2 border-white translate-x-0"></div>
                     </div>
                  </div>
                  
                  {/* Connection Line */}
                  <svg className="absolute inset-0 pointer-events-none z-10 w-full h-full">
                     <path d="M 35% 35% C 50% 35% 50% 65% 65% 65%" stroke="#8b5cf6" strokeWidth="3" fill="none" strokeDasharray="6 4" className="animate-pulse" /> 
                  </svg>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Enhanced Visual */}
      <section id="how" className="px-6 py-24 bg-white">
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
                        <div className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          Llama
                        </div>
                        <div className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                          DeepSeek
                        </div>
                        <div className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                          Mixtral
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
