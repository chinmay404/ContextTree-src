"use client";

/**
 * ContextTree landing page — editorial × organic × modern SaaS.
 * Section order:
 *   01 Nav
 *   02 Hero (3D knowledge tree)
 *   03 The Pain
 *   04 How It Works
 *   05 Use Cases
 *   06 Models + BYOK
 *   07 Pricing
 *   08 FAQ
 *   09 Final CTA
 *   10 Footer
 */

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  motion,
  AnimatePresence,
  useInView,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronDown,
  MessageSquare,
  GitBranch,
  Undo2,
  BookOpen,
  GraduationCap,
  Compass,
  Microscope,
  Sparkles,
  AlertCircle,
  MoveUpRight,
} from "lucide-react";
import { ModelProviderIcon } from "@/components/model-badge";
import HeroSection from "@/components/landing/HeroSection";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* Small reveal helper — fires once when element enters view. */
function FadeIn({
  children,
  delay = 0,
  y = 16,
  className,
}: React.PropsWithChildren<{ delay?: number; y?: number; className?: string }>) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  const reduced = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reduced ? { opacity: 1 } : { opacity: 0, y }}
      animate={inView || reduced ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   01 · NAV
   ══════════════════════════════════════════════════════════════════════ */
function Nav({ onGetStarted }: { onGetStarted: () => void }) {
  const [elevated, setElevated] = useState(false);
  useEffect(() => {
    const onScroll = () => setElevated(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 h-[72px] transition-all duration-300 ${
        elevated
          ? "bg-[#FBF9F4]/82 backdrop-blur-[24px] border-b border-[#E8E2D1]/60"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-[1240px] mx-auto h-full px-6 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="relative group transition-transform duration-500"
            style={{ transform: elevated ? "rotate(15deg)" : "rotate(0deg)" }}
          >
            <Image
              src="/tree-icon.svg"
              alt="ContextTree"
              width={26}
              height={26}
              className="w-[26px] h-[26px]"
            />
          </div>
          <span className="text-[17px] font-semibold tracking-[-0.01em] text-[#0A0E1A]">
            ContextTree
          </span>
          <span className="ml-1.5 inline-flex items-center rounded-full bg-[#2D5F3F]/10 text-[#2D5F3F] text-[10px] font-semibold px-2 py-0.5">
            <span className="relative flex h-1.5 w-1.5 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2D5F3F] opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#2D5F3F]" />
            </span>
            Beta
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-[14px] font-medium text-[#2A3142]">
          {[
            { href: "#what", label: "What it is" },
            { href: "#how", label: "How it works" },
            { href: "#use-cases", label: "For learners" },
            { href: "#pricing", label: "Pricing" },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="relative group text-[#2A3142]/80 hover:text-[#0A0E1A] transition-colors"
            >
              {l.label}
              <span className="pointer-events-none absolute left-0 right-0 -bottom-1 h-[2px] bg-[#2D5F3F] scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-200" />
            </a>
          ))}
        </div>

        <button
          onClick={onGetStarted}
          className="group inline-flex items-center gap-2 bg-[#2D5F3F] hover:bg-[#234A32] text-[#FBF9F4] text-[14px] font-medium px-4 py-2.5 rounded-[10px] transition-all"
          style={{
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.12), 0 1px 2px rgba(10,14,26,0.08)",
          }}
        >
          Start learning free
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </nav>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   03 · THE PAIN — before / after
   ══════════════════════════════════════════════════════════════════════ */
function PainSection() {
  return (
    <section className="relative bg-[#F4F0E6] py-24 md:py-40 overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-6 md:px-8">
        <FadeIn>
          <div className="text-center mb-16 md:mb-20">
            <div className="inline-flex items-center gap-3 text-[11px] font-semibold tracking-[0.14em] uppercase text-[#6B7280] mb-6">
              <span className="w-6 h-px bg-[#C97B2F]" />
              <span>02 · The Problem</span>
            </div>
            <h2 className="font-serif-display text-[2.25rem] md:text-[3.5rem] leading-[1.05] tracking-[-0.02em] text-[#0A0E1A] font-normal max-w-3xl mx-auto">
              Chat tools were built for tasks,
              <br />
              not for{" "}
              <em className="italic text-[#C97B2F] font-normal">learning.</em>
            </h2>
            <p className="mt-8 text-[17px] leading-[1.65] text-[#2A3142] max-w-[640px] mx-auto">
              You open ChatGPT to learn something real. Three questions in, you
              hit a side-topic. You ask about it. Five messages later, the model
              has forgotten what you were originally studying. So have you.
            </p>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-stretch">
          {/* BEFORE */}
          <FadeIn>
            <div className="flex flex-col h-full">
              <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] uppercase">
                <span className="text-[#C97B2F]">Before</span>
                <span className="text-[#6B7280]/60">· Linear chat</span>
              </div>
              <div className="relative flex-1 rounded-[16px] border border-[#E8E2D1] bg-[#FBF9F4] overflow-hidden shadow-[0_1px_2px_rgba(10,14,26,0.04),0_8px_24px_-12px_rgba(10,14,26,0.08)]">
                {/* Browser chrome */}
                <div className="h-9 flex items-center gap-1.5 px-3 border-b border-[#E8E2D1] bg-[#F4F0E6]/60">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E8E2D1]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E8E2D1]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E8E2D1]" />
                  <span className="ml-3 text-[11px] font-mono text-[#6B7280]">
                    New Chat
                  </span>
                </div>

                <div className="p-5 space-y-3 opacity-95">
                  {[
                    { role: "you", text: "Explain calculus integration" },
                    {
                      role: "ai",
                      text: "Integration is the reverse of differentiation…",
                    },
                    { role: "you", text: "How do I implement this in Python?" },
                    {
                      role: "ai",
                      text: "You can use sympy: from sympy import integrate…",
                    },
                    { role: "you", text: "Wait, what's a Python decorator?" },
                    {
                      role: "ai",
                      text: "A decorator is a function that takes another function…",
                    },
                  ].map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 4 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08, ease: EASE_OUT }}
                      className="flex gap-2.5"
                    >
                      <span
                        className={`shrink-0 mt-[3px] text-[9px] font-mono uppercase tracking-wider w-7 ${
                          m.role === "you" ? "text-[#2D5F3F]" : "text-[#C97B2F]"
                        }`}
                      >
                        {m.role}
                      </span>
                      <span className="text-[13px] leading-[1.55] text-[#2A3142]">
                        {m.text}
                      </span>
                    </motion.div>
                  ))}
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6 }}
                    className="pt-2"
                  >
                    <div className="flex gap-2.5">
                      <span className="shrink-0 mt-[3px] text-[9px] font-mono uppercase tracking-wider w-7 text-[#2D5F3F]">
                        you
                      </span>
                      <span className="text-[13px] leading-[1.55] text-[#2A3142] italic">
                        Remind me what we were originally learning…?
                      </span>
                    </div>
                  </motion.div>
                </div>

                {/* Frustration overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1.1 }}
                  className="absolute inset-x-6 bottom-6 rounded-xl border border-[#C97B2F]/30 bg-[#FBF9F4]/90 backdrop-blur px-4 py-3 flex items-start gap-3 shadow-lg"
                >
                  <AlertCircle className="w-4 h-4 text-[#C97B2F] shrink-0 mt-0.5" />
                  <p className="text-[12px] leading-[1.55] text-[#2A3142]">
                    <span className="font-semibold">Context drift.</span>{" "}
                    The thread is 40 messages deep. Nobody remembers where you
                    started.
                  </p>
                </motion.div>
              </div>
            </div>
          </FadeIn>

          {/* AFTER */}
          <FadeIn delay={0.15}>
            <div className="flex flex-col h-full">
              <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] uppercase">
                <span className="text-[#2D5F3F]">After</span>
                <span className="text-[#6B7280]/60">· Context Tree</span>
              </div>
              <div className="relative flex-1 rounded-[16px] border border-[#E8E2D1] bg-[#FBF9F4] overflow-hidden shadow-[0_1px_2px_rgba(10,14,26,0.04),0_18px_40px_-18px_rgba(45,95,63,0.18)]">
                <div className="h-9 flex items-center gap-1.5 px-3 border-b border-[#E8E2D1] bg-[#F4F0E6]/60">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E8E2D1]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E8E2D1]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E8E2D1]" />
                  <span className="ml-3 text-[11px] font-mono text-[#6B7280]">
                    contexttree.app / calculus
                  </span>
                </div>

                <div className="relative p-5 h-[calc(100%-36px)] min-h-[360px]">
                  {/* Grid paper */}
                  <div
                    className="absolute inset-0 opacity-[0.5] pointer-events-none"
                    style={{
                      backgroundImage: `
                        linear-gradient(to right, rgba(10,14,26,0.03) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(10,14,26,0.03) 1px, transparent 1px)`,
                      backgroundSize: "18px 18px",
                    }}
                  />

                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 360">
                    <motion.path
                      d="M 200 40 L 200 120"
                      stroke="#2D5F3F"
                      strokeWidth="1.5"
                      fill="none"
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                    />
                    <motion.path
                      d="M 200 120 C 200 140, 80 160, 80 220"
                      stroke="#5B8A6D"
                      strokeWidth="1.5"
                      fill="none"
                      strokeDasharray="0"
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.6 }}
                    />
                    <motion.path
                      d="M 200 120 L 200 220"
                      stroke="#2D5F3F"
                      strokeWidth="1.5"
                      fill="none"
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.8 }}
                    />
                    <motion.path
                      d="M 200 120 C 200 140, 320 160, 320 220"
                      stroke="#C97B2F"
                      strokeWidth="1.5"
                      fill="none"
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 1.0 }}
                    />
                  </svg>

                  {/* Nodes */}
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="absolute top-[18px] left-1/2 -translate-x-1/2 rounded-[10px] bg-[#2D5F3F] text-[#FBF9F4] text-[11px] font-medium px-3 py-1.5 shadow-sm"
                  >
                    Integration · main
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.9 }}
                    className="absolute top-[105px] left-1/2 -translate-x-1/2 rounded-[10px] bg-[#FBF9F4] border border-[#2D5F3F]/40 text-[#2A3142] text-[11px] font-medium px-3 py-1.5 shadow-sm"
                  >
                    Integration by parts
                  </motion.div>

                  {/* Branches */}
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1.0 }}
                    className="absolute top-[210px] left-[40px] rounded-[10px] bg-[#FBF9F4] border border-[#5B8A6D]/50 text-[#2A3142] text-[11px] font-medium px-3 py-1.5 shadow-sm"
                  >
                    Python impl.
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1.1 }}
                    className="absolute top-[210px] left-1/2 -translate-x-1/2 rounded-[10px] bg-[#FBF9F4] border border-[#2D5F3F]/60 text-[#2A3142] text-[11px] font-medium px-3 py-1.5 shadow-sm"
                  >
                    Taylor series
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1.2 }}
                    className="absolute top-[210px] right-[40px] rounded-[10px] bg-[#FBF9F4] border border-[#C97B2F]/50 text-[#2A3142] text-[11px] font-medium px-3 py-1.5 shadow-sm"
                  >
                    Decorator tangent
                  </motion.div>

                  {/* Floating labels */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1.6 }}
                    className="absolute bottom-[14px] left-[20px] font-serif-display italic text-[12px] text-[#2D5F3F]"
                  >
                    main thread preserved →
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1.8 }}
                    className="absolute bottom-[14px] right-[20px] font-serif-display italic text-[12px] text-[#C97B2F]"
                  >
                    ← inherits only calc context
                  </motion.div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Pull quote */}
        <FadeIn delay={0.3}>
          <blockquote className="mt-16 md:mt-20 max-w-[720px] mx-auto text-center">
            <p className="font-serif-display italic text-[20px] md:text-[24px] leading-[1.45] text-[#0A0E1A]">
              <span className="text-[#C97B2F] mr-1">&ldquo;</span>
              I was learning about neural networks. I asked one question about
              matrix math. 20 minutes later the model was explaining calculus
              from scratch. I never got back to my actual question.
              <span className="text-[#C97B2F] ml-1">&rdquo;</span>
            </p>
            <footer className="mt-4 text-[12px] font-medium text-[#6B7280] tracking-[0.04em]">
              — Every self-learner who has ever used ChatGPT
            </footer>
          </blockquote>
        </FadeIn>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   04 · HOW IT WORKS
   ══════════════════════════════════════════════════════════════════════ */
function HowSection() {
  const steps = [
    {
      n: "01",
      icon: MessageSquare,
      title: "Ask a question",
      desc: "Start a canvas. Drop any question. Pick the model that fits — Claude for reasoning, GPT-4 for code, Llama for speed.",
    },
    {
      n: "02",
      icon: GitBranch,
      title: "Branch a tangent",
      desc: "Hit a side-question? Fork it. The new branch inherits only the context it needs — no cross-pollution.",
    },
    {
      n: "03",
      icon: Undo2,
      title: "Return clean",
      desc: "When the tangent ends, jump back to the main thread. Nothing is lost. Everything stays where you left it.",
    },
  ];

  return (
    <section id="how" className="bg-[#FBF9F4] py-24 md:py-40">
      <div className="max-w-[1080px] mx-auto px-6 md:px-8">
        <FadeIn>
          <div className="text-center mb-16 md:mb-20">
            <div className="inline-flex items-center gap-3 text-[11px] font-semibold tracking-[0.14em] uppercase text-[#6B7280] mb-6">
              <span className="w-6 h-px bg-[#C97B2F]" />
              <span>03 · How it works</span>
            </div>
            <h2 className="font-serif-display text-[2.25rem] md:text-[3.5rem] leading-[1.05] tracking-[-0.02em] text-[#0A0E1A] font-normal">
              Three moves. One canvas.
              <br />
              <em className="italic text-[#C97B2F] font-normal">
                Every path preserved.
              </em>
            </h2>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-8 md:gap-10">
          {steps.map((step, i) => (
            <FadeIn key={i} delay={i * 0.12}>
              <div className="group relative">
                <div
                  className="font-serif-display text-[64px] leading-none font-light text-[#C97B2F] group-hover:text-[#0A0E1A] transition-colors duration-300"
                  style={{ fontVariationSettings: "'opsz' 144" }}
                >
                  {step.n}
                </div>
                <div className="mt-4 mb-6 flex items-center justify-center w-12 h-12 rounded-xl bg-[#2D5F3F]/10 text-[#2D5F3F]">
                  <step.icon className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <h3 className="font-serif-display text-[24px] leading-tight text-[#0A0E1A] mb-3 tracking-[-0.01em]">
                  {step.title}
                </h3>
                <p className="text-[15px] leading-[1.6] text-[#2A3142] max-w-[42ch]">
                  {step.desc}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   05 · USE CASES
   ══════════════════════════════════════════════════════════════════════ */
function UseCasesSection() {
  const cases = [
    {
      icon: GraduationCap,
      tag: "The Bootcamper",
      title: "Learning to code without drowning",
      quote:
        "I'm doing a full-stack bootcamp. I used to ask ChatGPT 100 questions and lose my place. Now one canvas per week, and I can actually look back at how I learned Redux.",
      body: "Perfect for bootcamp students, career-switchers, self-taught developers. Organize a whole week's learning in one canvas.",
    },
    {
      icon: BookOpen,
      tag: "The Grad Student",
      title: "Reading papers without losing the plot",
      quote:
        "I'm writing my thesis on reinforcement learning. I ask Claude to explain a paper, then branch every citation I don't recognize. The main paper summary stays clean.",
      body: "For PhD students and researchers. Branch for concept expansion, main thread stays on the paper you're actually studying.",
    },
    {
      icon: Compass,
      tag: "The Career Switcher",
      title: "Transitioning into a new field",
      quote:
        "I'm a designer learning machine learning. Half my questions are about prerequisites I don't know. Branches let me dive into 'what's a tensor?' without losing my original question.",
      body: "Learning a new field means constantly hitting prerequisite gaps. Branch to fill them, main thread stays on your real goal.",
    },
    {
      icon: Microscope,
      tag: "The Curious Expert",
      title: "Deep-diving adjacent fields",
      quote:
        "I'm a software engineer who wanted to understand transformers from scratch. Each math concept became a branch. After a week I have a whole tree I can revisit.",
      body: "For experts in one field exploring another. Build a personal knowledge map that grows over weeks.",
    },
  ];

  return (
    <section id="use-cases" className="bg-[#FBF9F4] py-24 md:py-40 border-t border-[#E8E2D1]/60">
      <div className="max-w-[1240px] mx-auto px-6 md:px-8">
        <FadeIn>
          <div className="text-center mb-16 md:mb-20">
            <div className="inline-flex items-center gap-3 text-[11px] font-semibold tracking-[0.14em] uppercase text-[#6B7280] mb-6">
              <span className="w-6 h-px bg-[#C97B2F]" />
              <span>04 · Who&apos;s using it</span>
            </div>
            <h2 className="font-serif-display text-[2.25rem] md:text-[3.5rem] leading-[1.05] tracking-[-0.02em] text-[#0A0E1A] font-normal">
              Four ways people learn
              <br />
              with ContextTree.
            </h2>
            <p className="mt-6 text-[17px] leading-[1.6] text-[#2A3142] max-w-[620px] mx-auto">
              Everyone branches differently. Here&apos;s how deep-learners put
              the canvas to work.
            </p>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-2 gap-6">
          {cases.map((c, i) => (
            <FadeIn key={i} delay={i * 0.08}>
              <motion.article
                whileHover={{ y: -4 }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
                className="group relative h-full rounded-[16px] border border-[#E8E2D1] bg-[#F4F0E6]/40 p-8 transition-colors hover:border-[#2D5F3F]/40 hover:bg-[#FBF9F4]"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[#2D5F3F] scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300"
                />
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#2D5F3F]/10 text-[#2D5F3F] mb-5">
                  <c.icon className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#6B7280] mb-2">
                  {c.tag}
                </div>
                <h3 className="font-serif-display text-[28px] leading-[1.15] text-[#0A0E1A] mb-4 tracking-[-0.01em]">
                  {c.title}
                </h3>
                <blockquote className="font-serif-display italic text-[17px] leading-[1.5] text-[#C97B2F] mb-4 border-l-2 border-[#E8E2D1] pl-4">
                  &ldquo;{c.quote}&rdquo;
                </blockquote>
                <p className="text-[14px] leading-[1.6] text-[#2A3142]">
                  {c.body}
                </p>
              </motion.article>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   06 · MODELS + BYOK
   ══════════════════════════════════════════════════════════════════════ */
function ModelsSection() {
  const frontier = [
    { id: "claude-opus-4.5", provider: "Anthropic", label: "Claude Opus" },
    { id: "claude-sonnet-4.5", provider: "Anthropic", label: "Claude Sonnet" },
    { id: "gpt-5", provider: "OpenAI", label: "GPT-5" },
    { id: "gpt-4o", provider: "OpenAI", label: "GPT-4o" },
    { id: "gemini-2.5-pro", provider: "Google", label: "Gemini 2.5 Pro" },
    { id: "gemini-flash", provider: "Google", label: "Gemini Flash" },
  ];
  const open = [
    { id: "llama-3.3-70b-versatile", provider: "Meta", label: "Llama 3.3" },
    { id: "deepseek-r1-distill-llama-70b", provider: "DeepSeek", label: "DeepSeek R1" },
    { id: "mixtral-8x7b", provider: "Mistral", label: "Mixtral" },
    { id: "qwen-2.5-72b", provider: "Alibaba", label: "Qwen 2.5" },
    { id: "gemma-7b", provider: "Google", label: "Gemma" },
    { id: "kimi-k2", provider: "Moonshot", label: "Kimi K2" },
  ];

  return (
    <section className="bg-[#F4F0E6] py-24 md:py-40">
      <div className="max-w-[1040px] mx-auto px-6 md:px-8">
        <FadeIn>
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-3 text-[11px] font-semibold tracking-[0.14em] uppercase text-[#6B7280] mb-6">
              <span className="w-6 h-px bg-[#C97B2F]" />
              <span>05 · Powered by</span>
            </div>
            <h2 className="font-serif-display text-[2.25rem] md:text-[3.5rem] leading-[1.05] tracking-[-0.02em] text-[#0A0E1A] font-normal">
              Use the models that
              <br />
              actually{" "}
              <em className="italic text-[#C97B2F] font-normal">teach you well.</em>
            </h2>
            <p className="mt-6 text-[17px] leading-[1.6] text-[#2A3142] max-w-[620px] mx-auto">
              Bring your own API keys from Anthropic, OpenAI, Google. Use Claude
              for explanations, GPT-4 for code, Gemini for math. Or stick to
              free open-source models — they work too.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="space-y-4">
            <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#6B7280] mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C97B2F]" />
              Frontier models · bring your own key
            </div>
            <div className="flex flex-wrap gap-2.5">
              {frontier.map((m) => (
                <div
                  key={m.id}
                  className="inline-flex items-center gap-2 rounded-full bg-[#FBF9F4] border border-[#E8E2D1] px-3.5 py-2 text-[13px] font-medium text-[#2A3142]"
                >
                  <ModelProviderIcon
                    modelId={m.id}
                    provider={m.provider}
                    size={18}
                  />
                  <span>{m.label}</span>
                  <span className="text-[9px] font-semibold tracking-wider uppercase text-[#C97B2F] bg-[#C97B2F]/10 px-1.5 py-0.5 rounded">
                    BYOK
                  </span>
                </div>
              ))}
            </div>

            <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#6B7280] mb-2 mt-8 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2D5F3F]" />
              Free open models
            </div>
            <div className="flex flex-wrap gap-2.5">
              {open.map((m) => (
                <div
                  key={m.id}
                  className="inline-flex items-center gap-2 rounded-full bg-[#FBF9F4] border border-[#E8E2D1] px-3.5 py-2 text-[13px] font-medium text-[#2A3142]"
                >
                  <ModelProviderIcon
                    modelId={m.id}
                    provider={m.provider}
                    size={18}
                  />
                  <span>{m.label}</span>
                  <span className="text-[9px] font-semibold tracking-wider uppercase text-[#2D5F3F] bg-[#2D5F3F]/10 px-1.5 py-0.5 rounded">
                    Free
                  </span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="mt-14 grid md:grid-cols-[280px_1fr] gap-8 pt-10 border-t border-[#E8E2D1]">
            <h3 className="font-serif-display text-[24px] leading-tight text-[#0A0E1A] tracking-[-0.01em]">
              Why bring your
              <br />
              own key?
            </h3>
            <div>
              <p className="text-[15px] leading-[1.65] text-[#2A3142]">
                You pay OpenAI / Anthropic / Google directly for tokens — at
                their actual cost. We don&apos;t mark up. You get the best
                models. We charge a flat monthly fee for the canvas experience —
                the branching, the context management, the infinite workspace.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 text-[12px] font-medium text-[#2D5F3F] bg-[#2D5F3F]/10 px-3 py-1.5 rounded-lg">
                <Sparkles className="w-3.5 h-3.5" />
                Pro tier ($9/mo) unlocks BYOK · Free tier uses shared Groq credits
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   06.5 · SOCIAL PROOF
   ══════════════════════════════════════════════════════════════════════ */
function SocialProofSection() {
  const quotes: Array<{ quote: string; name: string; role: string; mono: string }> = [
    {
      quote: "I dropped my old note-taking app. My canvas IS my notes now.",
      name: "Priya M.",
      role: "Data science bootcamp",
      mono: "PM",
    },
    {
      quote: "It's the first AI tool that didn't feel like it was fighting my brain.",
      name: "James K.",
      role: "CS grad student",
      mono: "JK",
    },
    {
      quote: "Branching is the feature I didn't know I needed until I had it.",
      name: "Sofia R.",
      role: "Self-taught developer",
      mono: "SR",
    },
    {
      quote:
        "I learned more Rust in two weeks here than three months on Discord.",
      name: "Marcus W.",
      role: "Career switcher",
      mono: "MW",
    },
    {
      quote: "The main-thread-stays-clean thing is honestly magical.",
      name: "Ananya S.",
      role: "Physics undergrad",
      mono: "AS",
    },
    {
      quote: "It's what I wish ChatGPT was for learning.",
      name: "Elena F.",
      role: "Design → ML transition",
      mono: "EF",
    },
  ];

  return (
    <section className="bg-[#FBF9F4] py-24 md:py-40 border-t border-[#E8E2D1]/60">
      <div className="max-w-[1240px] mx-auto px-6 md:px-8">
        <FadeIn>
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-3 text-[11px] font-semibold tracking-[0.14em] uppercase text-[#6B7280] mb-6">
              <span className="w-6 h-px bg-[#C97B2F]" />
              <span>06 · What learners say</span>
            </div>
            <h2 className="font-serif-display text-[2.25rem] md:text-[3.5rem] leading-[1.05] tracking-[-0.02em] text-[#0A0E1A] font-normal">
              Built with people who{" "}
              <em className="italic text-[#C97B2F] font-normal">actually use it.</em>
            </h2>
            <p className="mt-6 text-[17px] leading-[1.6] text-[#2A3142] max-w-[600px] mx-auto">
              Hour-long sessions with self-learners and deep-divers for three
              months. Here&apos;s what keeps coming back.
            </p>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {quotes.map((q, i) => (
            <FadeIn key={i} delay={i * 0.06}>
              <figure className="h-full rounded-[16px] border border-[#E8E2D1] bg-[#F4F0E6]/40 p-6 hover:bg-[#FBF9F4] hover:border-[#2D5F3F]/30 transition-colors">
                <blockquote className="font-serif-display italic text-[17px] leading-[1.55] text-[#0A0E1A]">
                  <span className="text-[#C97B2F]">&ldquo;</span>
                  {q.quote}
                  <span className="text-[#C97B2F]">&rdquo;</span>
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#2D5F3F]/10 text-[#2D5F3F] flex items-center justify-center text-[11px] font-bold tracking-[0.04em]">
                    {q.mono}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-[#0A0E1A]">
                      {q.name}
                    </div>
                    <div className="text-[12px] text-[#6B7280]">{q.role}</div>
                  </div>
                </figcaption>
              </figure>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   07 · PRICING
   ══════════════════════════════════════════════════════════════════════ */
function PricingSection({ onStart }: { onStart: () => void }) {
  return (
    <section id="pricing" className="bg-[#FBF9F4] py-24 md:py-40 border-t border-[#E8E2D1]/60">
      <div className="max-w-[880px] mx-auto px-6 md:px-8">
        <FadeIn>
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-3 text-[11px] font-semibold tracking-[0.14em] uppercase text-[#6B7280] mb-6">
              <span className="w-6 h-px bg-[#C97B2F]" />
              <span>07 · Pricing</span>
            </div>
            <h2 className="font-serif-display text-[2.25rem] md:text-[3.5rem] leading-[1.05] tracking-[-0.02em] text-[#0A0E1A] font-normal">
              Start free.{" "}
              <em className="italic text-[#C97B2F] font-normal">
                Pay when it becomes essential.
              </em>
            </h2>
            <p className="mt-6 text-[17px] leading-[1.6] text-[#2A3142] max-w-[580px] mx-auto">
              Core features are free forever. Pro adds BYOK for frontier models,
              unlimited canvases, and file uploads.
            </p>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-2 gap-5">
          <FadeIn>
            <div className="rounded-[16px] border border-[#E8E2D1] bg-[#FBF9F4] p-8 h-full">
              <div className="flex items-baseline justify-between mb-6">
                <h3 className="font-serif-display text-[22px] text-[#0A0E1A]">
                  Free
                </h3>
                <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[#6B7280]">
                  forever
                </span>
              </div>
              <div className="font-serif-display text-[72px] leading-none font-light text-[#0A0E1A]">
                $0
              </div>
              <ul className="mt-8 space-y-3">
                {[
                  "3 canvases",
                  "Unlimited branches per canvas",
                  "10+ open-source models",
                  "Auto-save",
                  "Keyboard shortcuts",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2.5 text-[14px] text-[#2A3142]"
                  >
                    <Check className="w-4 h-4 text-[#2D5F3F] shrink-0 mt-0.5" strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={onStart}
                className="mt-8 w-full inline-flex items-center justify-center gap-2 border-[1.5px] border-[#0A0E1A]/70 hover:border-[#2D5F3F] text-[#0A0E1A] text-[14px] font-medium py-3 rounded-xl transition-colors"
              >
                Start free
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="relative rounded-[16px] border-2 border-[#2D5F3F]/30 bg-gradient-to-br from-[#FBF9F4] to-[#F4F0E6] p-8 h-full shadow-[0_24px_48px_-24px_rgba(45,95,63,0.2)]">
              <div className="absolute -top-3 left-8 inline-flex items-center gap-1 rounded-full bg-[#C97B2F] text-[#FBF9F4] text-[10px] font-bold tracking-[0.14em] uppercase px-2.5 py-1">
                <Sparkles className="w-3 h-3" />
                Most Popular
              </div>
              <div className="flex items-baseline justify-between mb-6">
                <h3 className="font-serif-display text-[22px] text-[#0A0E1A]">
                  Pro
                </h3>
                <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[#6B7280]">
                  per month
                </span>
              </div>
              <div className="font-serif-display text-[72px] leading-none font-light text-[#0A0E1A]">
                $9
              </div>
              <ul className="mt-8 space-y-3">
                {[
                  "Everything in Free",
                  "Unlimited canvases",
                  "BYOK: Claude, GPT-4, Gemini",
                  "File & doc uploads",
                  "Export to Markdown / Anki",
                  "Priority support",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2.5 text-[14px] text-[#2A3142]"
                  >
                    <Check className="w-4 h-4 text-[#2D5F3F] shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span className={f.includes("BYOK") ? "font-semibold" : ""}>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={onStart}
                className="mt-8 w-full inline-flex items-center justify-center gap-2 bg-[#2D5F3F] hover:bg-[#234A32] text-[#FBF9F4] text-[14px] font-medium py-3 rounded-xl transition-colors"
                style={{
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.12), 0 1px 2px rgba(10,14,26,0.08)",
                }}
              >
                Go Pro
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={0.2}>
          <p className="mt-6 text-center text-[13px] text-[#6B7280]">
            Team plan coming soon. Student discount available —{" "}
            <a
              href="mailto:hi@contexttree.app"
              className="text-[#2D5F3F] underline underline-offset-4 decoration-[#E8E2D1] hover:decoration-[#2D5F3F]"
            >
              email us
            </a>
            .
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   08 · FAQ
   ══════════════════════════════════════════════════════════════════════ */
function FAQItem({
  q,
  children,
  defaultOpen = false,
}: {
  q: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#E8E2D1]/70">
      <button
        onClick={() => setOpen((v) => !v)}
        className="group w-full flex items-center justify-between gap-4 py-6 text-left hover:text-[#C97B2F] transition-colors"
      >
        <span className="font-serif-display text-[18px] md:text-[20px] text-[#0A0E1A] group-hover:text-[#C97B2F] tracking-[-0.005em] transition-colors">
          {q}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[#6B7280] shrink-0 transition-transform duration-300 ${
            open ? "rotate-180 text-[#C97B2F]" : ""
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="pb-6 text-[15px] leading-[1.65] text-[#2A3142] max-w-[620px]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FAQSection() {
  return (
    <section className="bg-[#F4F0E6] py-24 md:py-40">
      <div className="max-w-[760px] mx-auto px-6 md:px-8">
        <FadeIn>
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-3 text-[11px] font-semibold tracking-[0.14em] uppercase text-[#6B7280] mb-6">
              <span className="w-6 h-px bg-[#C97B2F]" />
              <span>08 · Questions</span>
            </div>
            <h2 className="font-serif-display text-[2.25rem] md:text-[3.5rem] leading-[1.05] tracking-[-0.02em] text-[#0A0E1A] font-normal">
              Everything{" "}
              <em className="italic text-[#C97B2F] font-normal">else.</em>
            </h2>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div>
            <FAQItem q="Is this just another AI chat wrapper?" defaultOpen>
              No. ContextTree is a visual workspace — a canvas, not a chat. The
              branching and context-isolation are native features, not bolt-ons.
              You can use any model you want; we&apos;re the workspace you use
              them in.
            </FAQItem>
            <FAQItem q="What's 'context isolation,' actually?">
              Every branch only inherits the conversation history from its
              parent path — not from sibling branches. So if you branch off to
              ask about Python, that Python context never pollutes the main
              calculus thread. It&apos;s a real technical feature, not
              marketing.
            </FAQItem>
            <FAQItem q="Can I use Claude / GPT-4 / Gemini?">
              Yes, on the Pro tier, with your own API key. The free tier uses
              open-source models (Llama, DeepSeek, etc.) via Groq.
            </FAQItem>
            <FAQItem q="How is this different from ChatGPT's folders / projects?">
              Folders are organization, not structure. ContextTree gives you
              actual <em>branching</em> inside one conversation — visual,
              spatial, and context-aware. Folders can&apos;t do that.
            </FAQItem>
            <FAQItem q="Is my data private?">
              We store your canvases on our servers (encrypted at rest). We
              never train any model on your data. On Pro with BYOK, we just pass
              your prompt to the provider&apos;s API — we don&apos;t see the
              content, we just route it.
            </FAQItem>
            <FAQItem q="What if I cancel?">
              You keep access to your canvases (read-only). Re-subscribe anytime
              and pick up where you left off. No data lock-in.
            </FAQItem>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   09 · FINAL CTA
   ══════════════════════════════════════════════════════════════════════ */
function FinalCTA({ onStart }: { onStart: () => void }) {
  return (
    <section className="relative overflow-hidden bg-[#2D5F3F] text-[#FBF9F4] py-24 md:py-40">
      {/* Paper noise */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-screen"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.9'/%3E%3C/svg%3E")`,
        }}
      />
      {/* Ghost tree outline */}
      <svg
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] opacity-[0.08]"
        viewBox="0 0 900 700"
        fill="none"
      >
        <path d="M 450 600 L 450 250" stroke="#FBF9F4" strokeWidth="1.5" />
        <path d="M 450 300 Q 350 280, 280 200" stroke="#FBF9F4" strokeWidth="1.5" />
        <path d="M 450 320 Q 550 300, 620 220" stroke="#FBF9F4" strokeWidth="1.5" />
        <path d="M 280 200 Q 240 170, 200 130" stroke="#FBF9F4" strokeWidth="1.2" />
        <path d="M 280 200 Q 310 160, 330 110" stroke="#FBF9F4" strokeWidth="1.2" />
        <path d="M 620 220 Q 660 180, 700 140" stroke="#FBF9F4" strokeWidth="1.2" />
        <path d="M 620 220 Q 590 170, 570 120" stroke="#FBF9F4" strokeWidth="1.2" />
        <circle cx="450" cy="250" r="5" fill="#FBF9F4" />
        <circle cx="280" cy="200" r="4" fill="#FBF9F4" />
        <circle cx="620" cy="220" r="4" fill="#FBF9F4" />
        <circle cx="200" cy="130" r="3" fill="#FBF9F4" />
        <circle cx="330" cy="110" r="3" fill="#FBF9F4" />
        <circle cx="700" cy="140" r="3" fill="#FBF9F4" />
        <circle cx="570" cy="120" r="3" fill="#FBF9F4" />
      </svg>

      <div className="relative max-w-[720px] mx-auto px-6 md:px-8 text-center">
        <FadeIn>
          <h2 className="font-serif-display text-[2.25rem] md:text-[3.5rem] leading-[1.05] tracking-[-0.02em] text-[#FBF9F4] font-normal">
            You&apos;ve spent enough time losing
            <br />
            your thread.
          </h2>
          <p className="mt-6 font-serif-display italic text-[20px] md:text-[24px] text-[#C97B2F]">
            Start learning the way you actually think.
          </p>
          <button
            onClick={onStart}
            className="group mt-12 inline-flex items-center gap-2.5 bg-[#FBF9F4] hover:bg-white text-[#0A0E1A] text-[15px] font-medium px-7 py-4 rounded-xl transition-all hover:-translate-y-0.5"
            style={{
              boxShadow:
                "0 1px 2px rgba(10,14,26,0.1), 0 12px 32px -8px rgba(10,14,26,0.25)",
            }}
          >
            Start free — takes 10 seconds
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <p className="mt-6 text-[13px] font-medium text-[#FBF9F4]/60">
            No credit card. Free forever for core. Your canvases are yours.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   10 · FOOTER
   ══════════════════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="bg-[#FBF9F4] border-t border-[#E8E2D1]/70 pt-16 pb-10">
      <div className="max-w-[1240px] mx-auto px-6 md:px-8">
        <div className="grid md:grid-cols-4 gap-10 md:gap-8 mb-14">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <Image
                src="/tree-icon.svg"
                alt="ContextTree"
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <span className="text-[16px] font-semibold text-[#0A0E1A] tracking-[-0.01em]">
                ContextTree
              </span>
            </div>
            <p className="text-[13px] leading-[1.55] text-[#6B7280] max-w-[220px]">
              A visual canvas for deep learners.
            </p>
          </div>

          {[
            {
              title: "Product",
              links: [
                ["What it is", "#what"],
                ["How it works", "#how"],
                ["Pricing", "#pricing"],
                ["Changelog", "#"],
              ],
            },
            {
              title: "For Learners",
              links: [
                ["Bootcamp discount", "#"],
                ["Student plan", "#"],
                ["Educators", "#"],
                ["Case studies", "#"],
              ],
            },
            {
              title: "Company",
              links: [
                ["About", "#"],
                ["Blog", "#"],
                ["Privacy", "#"],
                ["Terms", "#"],
              ],
            },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[#6B7280] mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="group inline-flex items-center gap-1 text-[14px] text-[#2A3142] hover:text-[#2D5F3F] transition-colors"
                    >
                      {label}
                      <MoveUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-[#E8E2D1]/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-[#6B7280]">
          <span>© {new Date().getFullYear()} ContextTree</span>
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2D5F3F] opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#2D5F3F]" />
            </span>
            All systems operational
          </span>
        </div>
      </div>
    </footer>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Landing page — exported
   ══════════════════════════════════════════════════════════════════════ */
export function LandingPage() {
  const router = useRouter();
  const onStart = () => router.push("/auth/signin");

  // Anchor for the hero's "Watch demo" button — falls through to the Pain
  // section which explains the mechanic visually. Easy to swap for an actual
  // video modal later.
  const onWatchDemo = () => {
    const el = document.getElementById("how");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#FBF9F4] text-[#0A0E1A] selection:bg-[#2D5F3F]/20 selection:text-[#0A0E1A]">
      <Nav onGetStarted={onStart} />

      <main id="what">
        <HeroSection onWatchDemo={onWatchDemo} />
        <PainSection />
        <HowSection />
        <UseCasesSection />
        <ModelsSection />
        <SocialProofSection />
        <PricingSection onStart={onStart} />
        <FAQSection />
        <FinalCTA onStart={onStart} />
      </main>

      <Footer />
    </div>
  );
}
