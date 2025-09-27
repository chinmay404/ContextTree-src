"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ArrowRight,
  Bug,
  Compass,
  FlaskConical,
  GitBranch,
  Layers,
  Link,
  Share2,
  Sparkles,
} from "lucide-react";
import LiquidEther from "./LiquidEther";
import { HeroBackGlow, ShimmerText } from "./reactbits-effects";
import collaborationPreview from "@/public/screenshot1.png";
import canvasFlowPreview from "@/public/image.png";

export function LandingPage() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push("/waitlist");
  };

  const handleJoinWaitlist = () => {
    router.push("/waitlist");
  };

  const featureHighlights = [
    {
      title: "Visual node-based canvas",
      description:
        "Drag, drop, and connect every turn of a conversation. The canvas keeps human and AI steps organized as you explore.",
      icon: Layers,
    },
    {
      title: "Context linking that sticks",
      description:
        "Branches inherit only their parent lineage, so the right instructions follow each path without runaway context.",
      icon: Link,
    },
    {
      title: "Multiple LLMs per flow",
      description:
        "Compare GPT, Claude, or internal models on the same graph to evaluate tone, latency, and accuracy in place.",
      icon: Sparkles,
    },
  ];

  const painPoints = [
    {
      title: "Black box AI",
      pain: "Hard to explain why a chatbot responded a certain way.",
      solution:
        "Trace every turn on the canvas with node-level snapshots so stakeholders can see the full conversation lineage.",
      icon: AlertTriangle,
    },
    {
      title: "Conversation drift",
      pain: "A single message can derail the entire flow.",
      solution:
        "Branch safely and inherit context only from the parent path, keeping experiments scoped and reversible.",
      icon: Compass,
    },
    {
      title: "Debugging frustration",
      pain: "No visibility into what context the model received.",
      solution:
        "Inspect prompts, memory, and handoffs per node with step-by-step playback to uncover what happened.",
      icon: Bug,
    },
    {
      title: "Risky experimentation",
      pain: "Testing alternatives breaks production flows.",
      solution:
        "Fork variants, compare LLM outputs side by side, and roll back with checkpoints when you're ready.",
      icon: FlaskConical,
    },
  ];

  const workflowSteps = [
    {
      title: "Drop a node",
      description:
        "Grab a block from the palette and place it on the canvas. ContextTree waits to assign a parent until you connect it, keeping drafts flexible.",
    },
    {
      title: "Connect the flow",
      description:
        "Link branches in seconds and preview how conversations travel across your tree-structured canvas without losing context.",
    },
    {
      title: "Let it auto-save",
      description:
        "We batch layout updates locally and push them upstream, so the canvas stays responsive while every change is captured.",
    },
  ];

  const plannedHighlights = [
    {
      title: "Share canvases instantly",
      description:
        "Invite teammates to review or edit the exact canvas you're building—no exports or screenshots required.",
      icon: Share2,
    },
    {
      title: "External context nodes",
      description:
        "Attach knowledge bases, APIs, or user profiles as dedicated nodes that stay linked to every branch that needs them.",
      icon: GitBranch,
    },
  ];

  const productSnapshots = [
    {
      src: collaborationPreview,
      alt: "ContextTree canvas showcasing collaboration-ready branching layout",
      delay: 100,
    },
    {
      src: canvasFlowPreview,
      alt: "ContextTree multi-branch canvas with conversational insights side panel",
      delay: 250,
    },
  ];

  const roadmapGraphNodes = [
    {
      id: "canvas",
      label: "Shared Canvas",
      className: "bg-gray-900 text-white",
      delay: 0,
      style: { top: "18%", left: "50%", transform: "translate(-50%, -50%)" },
    },
    {
      id: "contextNode",
      label: "External Context",
      className: "bg-white/90 text-gray-800",
      delay: 0.4,
      style: { top: "42%", left: "15%", transform: "translate(-50%, -50%)" },
    },
    {
      id: "api",
      label: "API Knowledge",
      className: "bg-white/85 text-gray-800",
      delay: 0.8,
      style: { top: "42%", left: "85%", transform: "translate(-50%, -50%)" },
    },
    {
      id: "teammate",
      label: "Teammate Review",
      className: "bg-white text-gray-800",
      delay: 1.1,
      style: { top: "68%", left: "28%", transform: "translate(-50%, -50%)" },
    },
    {
      id: "handoff",
      label: "Share as Link",
      className: "bg-white text-gray-800",
      delay: 1.4,
      style: { top: "78%", left: "60%", transform: "translate(-50%, -50%)" },
    },
  ];

  const roadmapConnections = [
    {
      id: "canvas-context",
      style: {
        top: "30%",
        left: "32%",
        width: "180px",
        height: "2px",
        transform: "rotate(-18deg)",
      },
      delay: 0.2,
    },
    {
      id: "canvas-api",
      style: {
        top: "30%",
        left: "68%",
        width: "180px",
        height: "2px",
        transform: "rotate(18deg)",
      },
      delay: 0.5,
    },
    {
      id: "context-teammate",
      style: {
        top: "55%",
        left: "22%",
        width: "140px",
        height: "2px",
        transform: "rotate(24deg)",
      },
      delay: 0.8,
    },
    {
      id: "teammate-handoff",
      style: {
        top: "74%",
        left: "44%",
        width: "200px",
        height: "2px",
        transform: "rotate(-6deg)",
      },
      delay: 1.1,
    },
    {
      id: "api-handoff",
      style: {
        top: "60%",
        left: "72%",
        width: "150px",
        height: "2px",
        transform: "rotate(12deg)",
      },
      delay: 1.4,
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <div className="absolute inset-0 z-0">
        <LiquidEther
          colors={["#E5E7EB", "#F3F4F6", "#D1D5DB"]}
          mouseForce={8}
          cursorSize={80}
          isViscous={false}
          viscous={30}
          iterationsViscous={32}
          iterationsPoisson={32}
          resolution={0.3}
          isBounce={false}
          autoDemo={true}
          autoSpeed={0.2}
          autoIntensity={1.0}
          takeoverDuration={0.5}
          autoResumeDelay={4000}
          autoRampDuration={1.2}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <nav className="px-6 py-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center"
            >
              <div className="h-10 w-10 text-gray-900">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 100 100"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Root node (top) */}
                  <rect
                    x="35"
                    y="10"
                    width="30"
                    height="20"
                    rx="4"
                    ry="4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />

                  {/* Connection lines */}
                  <path
                    d="M50 30 L50 45 M35 55 L50 45 L65 55"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Left child node */}
                  <rect
                    x="15"
                    y="65"
                    width="25"
                    height="20"
                    rx="4"
                    ry="4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />

                  {/* Right child node */}
                  <rect
                    x="60"
                    y="65"
                    width="25"
                    height="20"
                    rx="4"
                    ry="4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                </svg>
              </div>
            </motion.div>
          </div>
        </nav>

        <main className="flex-1">
          <section className="relative flex min-h-[100vh] items-center px-6 pb-24 pt-28 lg:px-8 lg:pb-32 lg:pt-36">
            <HeroBackGlow className="z-0" />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="relative z-[1] mx-auto max-w-4xl text-left"
            >
              <Badge
                variant="outline"
                className="mb-6 cursor-pointer border-gray-300 bg-white/30 text-gray-700 backdrop-blur-sm transition-all duration-300 hover:bg-white/50"
                onClick={handleJoinWaitlist}
              >
                Beta access • Join the Waitlist
              </Badge>
              <h1 className="mb-6 text-4xl font-light leading-tight text-gray-900 drop-shadow-sm md:text-5xl lg:text-6xl">
                <ShimmerText className="text-gray-900">ContextTree</ShimmerText>
                <br />
                <span className="text-gray-800">The first tree-structured</span>
                <br />
                <span className="text-gray-600">
                  canvas for chatbot conversations
                </span>
              </h1>
              <p className="mb-10 max-w-2xl text-lg font-light leading-relaxed text-gray-700 md:text-xl">
                Map every turn on a visual canvas, branch safely, and keep
                context intact while you explore new possibilities.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Button
                  onClick={handleGetStarted}
                  size="lg"
                  className="group inline-flex items-center gap-2 rounded-xl border-0 bg-gray-900 px-8 py-3 text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-gray-800 hover:shadow-xl"
                >
                  Join Waitlist
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </div>

              <div className="mt-12 flex flex-col gap-3 text-sm text-gray-600 sm:flex-row sm:items-center sm:gap-8">
                <span>✓ Branching logic that keeps context scoped</span>
                <span>✓ Autosave that preserves your layout</span>
                <span>✓ Compare multiple LLMs side by side</span>
              </div>
            </motion.div>
          </section>

          <section className="px-6 py-24 lg:px-8 lg:py-32" data-aos="fade-up">
            <div className="mx-auto max-w-6xl">
              <div className="mb-10 text-center">
                <Badge variant="outline" className="bg-white/70 text-gray-700">
                  <ShimmerText className="from-slate-600 via-slate-500 to-slate-700 text-sm font-medium uppercase tracking-[0.2em]">
                    Why you need it
                  </ShimmerText>
                </Badge>
                <h2 className="mt-5 text-3xl font-light text-gray-900 md:text-4xl">
                  The problems we kept hitting and how ContextTree fixes them
                </h2>
              </div>
              <div className="grid gap-8 md:grid-cols-2">
                {painPoints.map((item, index) => (
                  <div
                    key={item.title}
                    className="group relative overflow-hidden rounded-[28px] border border-white/70 bg-white/85 p-8 shadow-[0_24px_50px_-28px_rgba(15,23,42,0.45)] backdrop-blur-lg"
                    data-aos="fade-up"
                    data-aos-delay={index * 80}
                  >
                    <motion.span
                      className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gray-900/5"
                      animate={{
                        scale: [0.9, 1.1, 0.9],
                        opacity: [0.25, 0.4, 0.25],
                      }}
                      transition={{
                        duration: 6,
                        repeat: Infinity,
                        delay: index * 0.2,
                      }}
                    />
                    <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.24em] text-gray-500">
                      <item.icon className="h-5 w-5 text-gray-700" />
                      {item.title}
                    </div>
                    <div className="mt-6 grid gap-4 rounded-2xl border border-gray-100 bg-white/80 p-4 text-sm text-gray-600 md:grid-cols-2 md:text-base">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.3em] text-gray-400">
                          Problem
                        </p>
                        <p className="mt-2 leading-relaxed text-gray-600">
                          {item.pain}
                        </p>
                      </div>
                      <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-gray-50/90 p-4">
                        <motion.span
                          className="absolute -right-10 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-gray-900/5"
                          animate={{
                            scale: [1, 1.08, 1],
                            opacity: [0.25, 0.45, 0.25],
                          }}
                          transition={{
                            duration: 5,
                            repeat: Infinity,
                            delay: index * 0.3,
                          }}
                        />
                        <p className="text-xs font-medium uppercase tracking-[0.3em] text-gray-400">
                          Solution
                        </p>
                        <p className="mt-2 leading-relaxed text-gray-600">
                          {item.solution}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mx-auto mt-10 max-w-3xl rounded-3xl border border-white/70 bg-white/70 p-6 text-center text-sm text-gray-600 backdrop-blur-lg md:text-base">
                Layer in external context sources, compare multiple LLMs on the
                same branch, and watch tokens and latency per node—the
                essentials you asked us to solve.
              </div>
            </div>
          </section>

          <section className="px-6 py-24 lg:px-8 lg:py-32" data-aos="fade-up">
            <div className="mx-auto max-w-6xl">
              <div className="mx-auto mb-12 max-w-2xl text-center">
                <h2 className="text-3xl font-light text-gray-900 md:text-4xl">
                  What you can do today
                </h2>
                <p className="mt-4 text-lg text-gray-600">
                  ContextTree keeps teams focused on the essentials: branching
                  logic that preserves context, reliable autosave, and quick
                  comparisons across LLM providers.
                </p>
              </div>
              <div className="grid gap-8 md:grid-cols-3">
                {featureHighlights.map((feature) => (
                  <div
                    key={feature.title}
                    className="group rounded-3xl border border-white/60 bg-white/70 p-8 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.45)] backdrop-blur-lg transition-transform duration-300 hover:-translate-y-1"
                    data-aos="fade-up"
                  >
                    <feature.icon className="h-10 w-10 text-gray-700 transition-colors duration-300 group-hover:text-gray-900" />
                    <h3 className="mt-6 text-xl font-medium text-gray-900">
                      {feature.title}
                    </h3>
                    <p className="mt-3 text-base leading-relaxed text-gray-600">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="px-6 pb-24 lg:px-8 lg:pb-32" data-aos="fade-up">
            <div className="mx-auto max-w-5xl rounded-[32px] border border-white/60 bg-white/85 p-10 backdrop-blur-lg">
              <div className="mx-auto mb-12 max-w-2xl text-center">
                <h2 className="text-3xl font-light text-gray-900 md:text-4xl">
                  See ContextTree in action
                </h2>
                <p className="mt-4 text-lg text-gray-600">
                  Walk the canvas, branch experiments, and monitor responses in
                  real time—here are two snapshots from the latest beta.
                </p>
              </div>
              <div className="flex flex-col gap-12">
                {productSnapshots.map((snapshot) => (
                  <div
                    key={snapshot.alt}
                    className="group overflow-hidden rounded-[32px] border border-white/70 bg-white/80 p-3"
                    data-aos="fade-up"
                    data-aos-delay={snapshot.delay}
                    data-aos-duration="900"
                  >
                    <Image
                      src={snapshot.src}
                      alt={snapshot.alt}
                      className="h-auto w-full rounded-[26px] transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                      sizes="(min-width: 1280px) 48rem, (min-width: 768px) 42rem, 94vw"
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="px-6 py-24 lg:px-8 lg:py-32" data-aos="fade-up">
            <div className="mx-auto flex max-w-6xl flex-col gap-16 lg:flex-row lg:items-center">
              <div className="flex-1 space-y-6">
                <h2 className="text-3xl font-light text-gray-900 md:text-4xl">
                  A workflow tuned for rapid iteration
                </h2>
                <p className="text-lg text-gray-600">
                  Every step in ContextTree now reflects what we built in this
                  beta cycle—simple branching, clear connections, and dependable
                  persistence.
                </p>
              </div>
              <div className="flex-1 space-y-6">
                {workflowSteps.map((step, index) => (
                  <div
                    key={step.title}
                    className="relative rounded-2xl border border-white/60 bg-white/70 p-6 backdrop-blur-lg"
                    data-aos="fade-left"
                    data-aos-delay={index * 100}
                  >
                    <div className="absolute -left-6 top-6 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-600 shadow-sm">
                      0{index + 1}
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-base text-gray-600">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="px-6 py-24 lg:px-8 lg:py-32" data-aos="fade-up">
            <div className="mx-auto max-w-6xl space-y-12">
              <div>
                <Badge variant="outline" className="bg-white/70 text-gray-700">
                  Coming next
                </Badge>
                <h2 className="mt-5 text-3xl font-light text-gray-900 md:text-4xl">
                  Ship-ready collaboration is up next in beta
                </h2>
                <p className="mt-4 text-lg text-gray-600">
                  We're building seamless sharing and deep context nodes right
                  now—join the waitlist to preview the interactive roadmap
                  builds.
                </p>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {plannedHighlights.map((item, index) => (
                  <div
                    key={item.title}
                    className="rounded-3xl border border-white/60 bg-white/85 p-6 backdrop-blur-lg shadow-[0_20px_40px_-30px_rgba(15,23,42,0.55)]"
                    data-aos="fade-up"
                    data-aos-delay={index * 80}
                  >
                    <item.icon className="h-8 w-8 text-gray-700" />
                    <h3 className="mt-5 text-lg font-medium text-gray-900">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-base leading-relaxed text-gray-600">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="px-6 py-24 lg:px-8 lg:py-32" data-aos="fade-up">
            <div className="mx-auto max-w-5xl rounded-[36px] border border-white/70 bg-white/80 p-12 text-center backdrop-blur-lg shadow-[0_24px_60px_-35px_rgba(15,23,42,0.7)] lg:p-14">
              <div className="mx-auto flex max-w-2xl flex-col gap-6">
                <div className="flex items-center justify-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-gray-500">
                  <Sparkles className="h-4 w-4" />
                  READY WHEN YOU ARE
                </div>
                <h2 className="text-3xl font-light text-gray-900 md:text-4xl">
                  Join the waitlist and co-design the future of conversational
                  ops
                </h2>
                <p className="text-lg text-gray-600">
                  Priority access includes onboarding with our product team,
                  early integrations, and a dedicated migration partner.
                </p>
                <div className="flex justify-center">
                  <Button
                    onClick={handleGetStarted}
                    size="lg"
                    className="group inline-flex items-center gap-2 rounded-2xl border-0 bg-gray-900 px-8 py-3 text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-gray-800 hover:shadow-xl"
                  >
                    Join waitlist
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="px-6 pb-10">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 border-t border-white/50 pt-8 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} ContextTree Labs. All rights
              reserved.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                className="text-gray-500 transition-colors duration-200 hover:text-gray-700"
                onClick={() => router.push("/waitlist")}
              >
                Contact
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
