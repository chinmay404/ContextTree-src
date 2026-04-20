"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  useMotionValue,
  useSpring,
  AnimatePresence,
} from "framer-motion";
import {
  ArrowRight,
  Check,
  GitBranch,
  Sparkles,
  MessageSquare,
  Layers,
  FlaskConical,
  Cpu,
  CornerDownRight,
  Command,
  FileText,
  Workflow,
  MousePointer2,
  Zap,
  Shield,
  Clock,
  Users,
  Star,
  Play,
  ChevronRight,
  Code2,
  Brain,
  Network,
  Boxes,
  ArrowUpRight,
  Menu,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { ModelProviderIcon } from "@/components/model-badge";

const Landing3DScene = dynamic(
  () => import("@/components/landing-3d-scene").then((mod) => mod.Landing3DScene),
  { ssr: false }
);

/* ──────────────────────────────────────────────────────────────────────────
   Constants & Helpers
   ──────────────────────────────────────────────────────────────────────── */

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const EASE_SMOOTH: [number, number, number, number] = [0.4, 0, 0.2, 1];

/* Fade-in component with intersection observer */
const FadeIn: React.FC<
  React.PropsWithChildren<{
    delay?: number;
    y?: number;
    className?: string;
    once?: boolean;
  }>
> = ({ children, delay = 0, y = 20, className, once = true }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, amount: 0.2 });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
};

/* Staggered fade for lists */
const StaggerContainer: React.FC<
  React.PropsWithChildren<{ className?: string; staggerDelay?: number }>
> = ({ children, className, staggerDelay = 0.1 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={{
        visible: { transition: { staggerChildren: staggerDelay } },
      }}
    >
      {children}
    </motion.div>
  );
};

const StaggerItem: React.FC<React.PropsWithChildren<{ className?: string }>> = ({
  children,
  className,
}) => (
  <motion.div
    className={className}
    variants={{
      hidden: { opacity: 0, y: 16 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
    }}
  >
    {children}
  </motion.div>
);

/* ──────────────────────────────────────────────────────────────────────────
   Hero Models & Canvas
   ──────────────────────────────────────────────────────────────────────── */

const HERO_MODELS: Array<{
  id: string;
  name: string;
  provider: string;
  accent: string;
  reply: string;
}> = [
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3",
    provider: "Meta",
    accent: "from-blue-500/70 to-indigo-500/40",
    reply:
      "Use DFS for pathfinding where memory is tight. BFS if you need the shortest path in unweighted graphs.",
  },
  {
    id: "deepseek-r1-distill-llama-70b",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    accent: "from-violet-500/70 to-fuchsia-500/40",
    reply:
      "Think of it like a maze. DFS commits to a wall and walks it. BFS expands like ripples — level by level.",
  },
];

function HeroCanvas() {
  const [typed, setTyped] = useState([0, 0]);
  
  useEffect(() => {
    const id = setInterval(() => {
      setTyped(([a, b]) => [
        Math.min(a + 2, HERO_MODELS[0].reply.length),
        Math.min(b + 2, HERO_MODELS[1].reply.length),
      ]);
    }, 35);
    return () => clearInterval(id);
  }, []);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-40, 40], [3, -3]), {
    stiffness: 100,
    damping: 25,
  });
  const ry = useSpring(useTransform(mx, [-40, 40], [-3, 3]), {
    stiffness: 100,
    damping: 25,
  });

  return (
    <motion.div
      className="relative w-full aspect-[5/4] md:aspect-[4/3]"
      onMouseMove={(e) => {
        const bounds = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        mx.set(e.clientX - bounds.left - bounds.width / 2);
        my.set(e.clientY - bounds.top - bounds.height / 2);
      }}
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      style={{ perspective: 1600 }}
    >
      {/* Ambient gradients */}
      <div className="absolute -inset-20 bg-[radial-gradient(50%_50%_at_50%_45%,rgba(99,102,241,0.12),transparent_70%)] pointer-events-none" />
      <div className="absolute -inset-20 bg-[radial-gradient(35%_35%_at_80%_20%,rgba(168,85,247,0.10),transparent_70%)] pointer-events-none" />

      <motion.div
        className="relative h-full w-full rounded-2xl lg:rounded-3xl border border-foreground/10 bg-card/80 backdrop-blur-2xl shadow-2xl shadow-foreground/5 overflow-hidden"
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
      >
        {/* Canvas toolbar */}
        <div className="absolute top-0 left-0 right-0 h-12 border-b border-border/50 bg-background/60 backdrop-blur-xl flex items-center px-4 gap-3 z-20">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-foreground/10" />
            <div className="w-3 h-3 rounded-full bg-foreground/10" />
            <div className="w-3 h-3 rounded-full bg-foreground/10" />
          </div>
          <div className="h-5 w-px bg-border/50" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <Workflow className="w-4 h-4" />
            <span>DFS vs BFS</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 text-[11px] font-mono text-muted-foreground">
            <Command className="w-3.5 h-3.5" /> K
          </div>
        </div>

        {/* Grid background */}
        <div className="absolute inset-0 pt-12">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:24px_24px] opacity-30 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,#000_60%,transparent_100%)]" />
        </div>

        {/* Connecting edges */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 600 480"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="hero-edge-a" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="hero-edge-b" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#d8b4fe" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <motion.path
            d="M 300 150 C 300 210, 160 240, 140 320"
            stroke="url(#hero-edge-a)"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: EASE_OUT, delay: 0.5 }}
          />
          <motion.path
            d="M 300 150 C 300 210, 440 240, 460 320"
            stroke="url(#hero-edge-b)"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: EASE_OUT, delay: 0.5 }}
          />
          {/* Animated particles */}
          <motion.circle
            r="4"
            fill="hsl(var(--primary))"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: 1.8 }}
          >
            <animateMotion
              dur="2.4s"
              repeatCount="indefinite"
              begin="1.8s"
              path="M 300 150 C 300 210, 160 240, 140 320"
            />
          </motion.circle>
          <motion.circle
            r="4"
            fill="#a855f7"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: 2 }}
          >
            <animateMotion
              dur="2.4s"
              repeatCount="indefinite"
              begin="2s"
              path="M 300 150 C 300 210, 440 240, 460 320"
            />
          </motion.circle>
        </svg>

        {/* Root prompt node */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 top-[20%] z-10"
          initial={{ opacity: 0, y: -16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 }}
        >
          <div className="relative rounded-xl bg-foreground text-background px-5 py-4 shadow-2xl shadow-foreground/20 min-w-[240px] md:min-w-[280px]">
            <div className="flex items-center gap-2 text-xs text-background/60 mb-2">
              <MessageSquare className="w-4 h-4" />
              <span className="font-mono uppercase tracking-wider text-[10px]">prompt</span>
            </div>
            <div className="text-sm font-medium leading-snug">
              Explain the difference between DFS and BFS.
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-foreground ring-4 ring-background" />
          </div>
        </motion.div>

        {/* Branch A */}
        <motion.div
          className="absolute left-[4%] top-[64%] w-[42%] z-10"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: EASE_OUT, delay: 1.1 }}
        >
          <ReplyCard
            model={HERO_MODELS[0]}
            text={HERO_MODELS[0].reply.slice(0, typed[0])}
            progress={typed[0] / HERO_MODELS[0].reply.length}
            accent="primary"
          />
        </motion.div>

        {/* Branch B */}
        <motion.div
          className="absolute right-[4%] top-[64%] w-[42%] z-10"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: EASE_OUT, delay: 1.3 }}
        >
          <ReplyCard
            model={HERO_MODELS[1]}
            text={HERO_MODELS[1].reply.slice(0, typed[1])}
            progress={typed[1] / HERO_MODELS[1].reply.length}
            accent="violet"
          />
        </motion.div>

        {/* Fork indicator */}
        <motion.div
          className="absolute left-1/2 top-[48%] -translate-x-1/2 z-20 pointer-events-none"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2.4, duration: 0.4 }}
        >
          <div className="flex items-center gap-2 rounded-full bg-foreground text-background text-xs font-medium px-3 py-1.5 shadow-xl backdrop-blur">
            <MousePointer2 className="w-3.5 h-3.5" />
            <span>fork here</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Floating chips */}
      <motion.div
        className="absolute -left-4 top-[30%] hidden lg:block"
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.8, duration: 0.6 }}
      >
        <div className="flex items-center gap-2 rounded-xl bg-card px-4 py-2.5 text-sm shadow-xl border border-border/50">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-foreground">Context preserved</span>
        </div>
      </motion.div>

      <motion.div
        className="absolute -right-2 bottom-[20%] hidden lg:block"
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 2.1, duration: 0.6 }}
      >
        <div className="flex items-center gap-2 rounded-xl bg-card px-4 py-2.5 text-sm shadow-xl border border-border/50">
          <GitBranch className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground">2 branches</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ReplyCard({
  model,
  text,
  progress,
  accent,
}: {
  model: (typeof HERO_MODELS)[number];
  text: string;
  progress: number;
  accent: "primary" | "violet";
}) {
  const accentColor = accent === "primary" ? "hsl(var(--primary))" : "#a855f7";

  return (
    <div className="relative rounded-xl bg-card ring-1 ring-border/50 shadow-xl overflow-hidden">
      <div
        className="h-1 w-full"
        style={{
          background: `linear-gradient(to right, ${accentColor}, ${accentColor}80)`,
        }}
      />
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <ModelProviderIcon
              modelId={model.id}
              provider={model.provider}
              size={22}
            />
            <div>
              <div className="text-xs font-semibold text-foreground leading-none">
                {model.name}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                {model.provider}
              </div>
            </div>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground">
            {Math.round(progress * 100)}%
          </div>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground min-h-[52px]">
          {text}
          {progress < 1 && (
            <span className="inline-block w-0.5 h-3.5 bg-primary ml-0.5 align-middle animate-pulse" />
          )}
        </p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Stats Section
   ──────────────────────────────────────────────────────────────────────── */

const STATS = [
  { value: "10+", label: "Open Models", sublabel: "Llama, Mixtral, DeepSeek & more" },
  { value: "100%", label: "Context Isolation", sublabel: "Zero cross-branch contamination" },
  { value: "<50ms", label: "Auto-save", sublabel: "Every change persisted instantly" },
  { value: "Free", label: "Forever Core", sublabel: "No credit card required" },
];

function StatsSection() {
  return (
    <section className="py-16 md:py-20 border-y border-border/50 bg-muted/30">
      <div className="max-w-7xl mx-auto px-6">
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
          {STATS.map((stat, i) => (
            <StaggerItem key={i}>
              <div className="text-center md:text-left">
                <div className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                  {stat.value}
                </div>
                <div className="text-sm font-semibold text-foreground mt-1">
                  {stat.label}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {stat.sublabel}
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Problem/Solution Comparison
   ──────────────────────────────────────────────────────────────────────── */

function ProblemComparison() {
  return (
    <div className="grid lg:grid-cols-2 gap-6 items-stretch">
      {/* Before */}
      <FadeIn>
        <div className="relative h-full rounded-2xl border border-border bg-card p-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                The Problem
              </span>
              <span className="text-xs font-medium text-destructive bg-destructive/10 px-3 py-1 rounded-full border border-destructive/20">
                Linear Chat
              </span>
            </div>
            <h3 className="text-2xl md:text-3xl font-semibold text-foreground leading-tight mb-4">
              One thread. Context drifts.
              <br />
              <span className="text-muted-foreground">Decisions get lost.</span>
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-8">
              You open four tabs, paste the same question into each model, try to
              remember which said what, and lose the thread of your exploration.
            </p>

            <div className="space-y-3">
              {[
                { u: "What is the difference between DFS and BFS?", r: "Answer about trees..." },
                { u: "What about in Python?", r: "Wait — sorting or trees?" },
                { u: "Can you show example code?", r: "Which context again?" },
              ].map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-muted-foreground mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    you
                  </div>
                  <div className="text-sm text-foreground mb-3">{m.u}</div>
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-muted-foreground mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                    model
                  </div>
                  <div className="text-sm text-muted-foreground italic">{m.r}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </FadeIn>

      {/* After */}
      <FadeIn delay={0.15}>
        <div className="relative h-full rounded-2xl border border-primary/20 bg-card p-8 shadow-xl shadow-primary/5 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                The Solution
              </span>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                Branching Canvas
              </span>
            </div>
            <h3 className="text-2xl md:text-3xl font-semibold text-foreground leading-tight mb-4">
              One canvas. Every path alive.
              <br />
              <span className="text-primary">Compare side-by-side.</span>
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Pick any message, fork it to a different model, keep going. Context
              is inherited automatically — branches stay clean and isolated.
            </p>

            <MiniTreeVisual />
          </div>
        </div>
      </FadeIn>
    </div>
  );
}

function MiniTreeVisual() {
  return (
    <div className="relative rounded-xl border border-border bg-background p-4 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20" />
      <div className="relative h-52">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 210">
          <motion.path
            d="M 150 25 L 150 65"
            stroke="hsl(var(--foreground))"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          />
          <motion.path
            d="M 150 65 C 150 100, 70 110, 60 145"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          />
          <motion.path
            d="M 150 65 C 150 100, 230 110, 240 145"
            stroke="#a855f7"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
          />
          <motion.path
            d="M 60 145 C 60 175, 30 180, 25 200"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.8 }}
          />
          <motion.path
            d="M 60 145 C 60 175, 95 180, 100 200"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.9 }}
          />
          <circle cx="150" cy="25" r="5" fill="hsl(var(--foreground))" />
          <circle cx="150" cy="65" r="5" fill="hsl(var(--foreground))" />
          <circle cx="60" cy="145" r="5" fill="hsl(var(--primary))" />
          <circle cx="240" cy="145" r="5" fill="#a855f7" />
          <circle cx="25" cy="200" r="4" fill="hsl(var(--primary))" />
          <circle cx="100" cy="200" r="4" fill="hsl(var(--primary))" />
        </svg>

        <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-foreground text-background text-[11px] font-medium px-3 py-1.5 rounded-lg shadow-lg">
          DFS vs BFS?
        </div>

        <div className="absolute top-[65%] left-[10%] bg-card border border-primary/30 text-foreground text-[11px] font-medium px-2.5 py-1 rounded-lg shadow flex items-center gap-1.5">
          <ModelProviderIcon modelId="llama" provider="Meta" size={14} />
          Llama
        </div>
        <div className="absolute top-[65%] right-[10%] bg-card border border-violet-500/30 text-foreground text-[11px] font-medium px-2.5 py-1 rounded-lg shadow flex items-center gap-1.5">
          <ModelProviderIcon modelId="deepseek" provider="DeepSeek" size={14} />
          DeepSeek
        </div>

        <div className="absolute bottom-0 left-[2%] bg-card border border-border text-muted-foreground text-[10px] font-medium px-2 py-0.5 rounded-md">
          Python
        </div>
        <div className="absolute bottom-0 left-[28%] bg-card border border-border text-muted-foreground text-[10px] font-medium px-2 py-0.5 rounded-md">
          Go
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   How It Works Section
   ──────────────────────────────────────────────────────────────────────── */

const STEPS = [
  {
    n: "01",
    title: "Start with a Prompt",
    desc: "Drop a message on your infinite canvas. Choose from 10+ open-source models including Llama, Mixtral, DeepSeek, and Gemma.",
    icon: MessageSquare,
    color: "bg-primary/10 text-primary",
  },
  {
    n: "02",
    title: "Branch Anywhere",
    desc: "Fork any point in the conversation to explore alternatives. Each branch inherits only its parent context — zero contamination.",
    icon: GitBranch,
    color: "bg-violet-500/10 text-violet-500",
  },
  {
    n: "03",
    title: "Compare & Decide",
    desc: "Run the same prompt across multiple models, watch replies stream in parallel, and keep the path that gives you the best result.",
    icon: Layers,
    color: "bg-emerald-500/10 text-emerald-500",
  },
];

function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActiveStep((p) => (p + 1) % 3), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <section id="how" className="relative px-6 py-24 md:py-32 bg-card border-y border-border/50">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6">
              <Workflow className="w-4 h-4 text-primary" />
              How it works
            </div>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-foreground leading-[1.1]">
              Three moves. One canvas.
              <br />
              <span className="text-muted-foreground">Every path preserved.</span>
            </h2>
          </div>
        </FadeIn>

        <StaggerContainer className="grid md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <StaggerItem key={i}>
              <motion.div
                onMouseEnter={() => setActiveStep(i)}
                animate={{
                  scale: activeStep === i ? 1.02 : 1,
                  borderColor: activeStep === i ? "hsl(var(--primary))" : "hsl(var(--border))",
                }}
                transition={{ duration: 0.3, ease: EASE_SMOOTH }}
                className={`group relative h-full rounded-2xl border-2 p-8 cursor-pointer transition-colors ${
                  activeStep === i
                    ? "bg-primary/5 shadow-xl shadow-primary/10"
                    : "bg-background hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className={`p-3 rounded-xl ${step.color}`}>
                    <step.icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono font-bold tracking-[0.2em] text-muted-foreground">
                    {step.n}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.desc}</p>

                {activeStep === i && (
                  <motion.div
                    layoutId="step-indicator"
                    className="absolute bottom-0 left-6 right-6 h-1 bg-primary rounded-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Features Bento Grid
   ──────────────────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: GitBranch,
    title: "Visual Branching",
    desc: "Fork at any message. Every branch is a clean, isolated thread on an infinite canvas. Navigate your exploration visually.",
    size: "lg",
    color: "from-primary/20 to-primary/5",
  },
  {
    icon: Shield,
    title: "Context Isolation",
    desc: "A branch inherits only its ancestors. No bleed-over, no silent contamination between explorations.",
    size: "sm",
    color: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    icon: Cpu,
    title: "10+ Open Models",
    desc: "Llama, Mixtral, DeepSeek, Gemma, Qwen, Kimi and more — one prompt, many brains.",
    size: "sm",
    color: "from-violet-500/20 to-violet-500/5",
  },
  {
    icon: FileText,
    title: "Attach Context Files",
    desc: "Drop docs, notes, and structured data into nodes. Context flows down the tree automatically.",
    size: "sm",
    color: "from-amber-500/20 to-amber-500/5",
  },
  {
    icon: Clock,
    title: "Auto-Save Everything",
    desc: "Every change is persisted instantly. Never lose your work, even across browser sessions.",
    size: "sm",
    color: "from-blue-500/20 to-blue-500/5",
  },
  {
    icon: FlaskConical,
    title: "Experiment Mode",
    desc: "Sweep prompts, temperatures and models in parallel. Find the best configuration fast.",
    badge: "Coming Soon",
    size: "md",
    color: "from-rose-500/20 to-rose-500/5",
  },
  {
    icon: Workflow,
    title: "Reusable Flows",
    desc: "Save a canvas as a template. Replay the branching logic on a new task in one click.",
    badge: "Coming Soon",
    size: "md",
    color: "from-cyan-500/20 to-cyan-500/5",
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="px-6 py-24 md:py-32">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6">
              <Boxes className="w-4 h-4 text-primary" />
              Features
            </div>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-foreground leading-[1.1]">
              Everything you need to
              <br />
              <span className="text-muted-foreground">explore with LLMs.</span>
            </h2>
          </div>
        </FadeIn>

        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((feature, i) => (
            <StaggerItem
              key={i}
              className={
                feature.size === "lg"
                  ? "md:col-span-2 lg:col-span-2 lg:row-span-2"
                  : feature.size === "md"
                  ? "md:col-span-1 lg:col-span-2"
                  : ""
              }
            >
              <div
                className={`group relative h-full rounded-2xl border border-border bg-card p-6 md:p-8 hover:border-primary/30 transition-all duration-300 overflow-hidden ${
                  feature.size === "lg" ? "flex flex-col justify-between" : ""
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-muted/50 group-hover:bg-background/80 transition-colors">
                      <feature.icon className="w-6 h-6 text-foreground" />
                    </div>
                    {feature.badge && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                        {feature.badge}
                      </span>
                    )}
                  </div>
                  <h3 className={`font-semibold text-foreground mb-2 ${feature.size === "lg" ? "text-2xl" : "text-lg"}`}>
                    {feature.title}
                  </h3>
                  <p className={`text-muted-foreground leading-relaxed ${feature.size === "lg" ? "text-base" : "text-sm"}`}>
                    {feature.desc}
                  </p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Models Marquee
   ──────────────────────────────────────────────────────────────────────── */

const MARQUEE_MODELS = [
  { id: "llama-3.3-70b-versatile", provider: "Meta", label: "Llama 3.3 70B" },
  { id: "deepseek-r1-distill-llama-70b", provider: "DeepSeek", label: "DeepSeek R1" },
  { id: "mixtral-8x7b", provider: "Mistral", label: "Mixtral 8x7B" },
  { id: "gemma-7b", provider: "Google", label: "Gemma 7B" },
  { id: "qwen-2.5-72b", provider: "Alibaba", label: "Qwen 2.5 72B" },
  { id: "kimi-k2", provider: "Moonshot", label: "Kimi K2" },
  { id: "allam", provider: "SDAIA", label: "Allam" },
  { id: "compound-beta", provider: "Groq", label: "Compound" },
];

function ModelsMarquee() {
  const items = [...MARQUEE_MODELS, ...MARQUEE_MODELS];
  return (
    <div className="relative overflow-hidden py-8">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />
      <motion.div
        className="flex gap-4"
        initial={{ x: 0 }}
        animate={{ x: "-50%" }}
        transition={{
          duration: 40,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {items.map((m, i) => (
          <div
            key={i}
            className="shrink-0 inline-flex items-center gap-3 rounded-xl bg-card border border-border px-5 py-3 text-sm font-medium text-foreground shadow-sm hover:border-primary/30 transition-colors"
          >
            <ModelProviderIcon modelId={m.id} provider={m.provider} size={24} />
            <span>{m.label}</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-mono">
              {m.provider}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function ModelsSection() {
  return (
    <section id="models" className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-6">
        <FadeIn>
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6">
              <Brain className="w-4 h-4 text-primary" />
              Supported Models
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
              Powered by the best open-source models
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Access 10+ frontier open models through a unified interface. Compare them all on the same canvas.
            </p>
          </div>
        </FadeIn>
        <ModelsMarquee />
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   CTA Section
   ──────────────────────────────────────────────────────────────────────── */

function CTASection({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="px-6 py-24 md:py-32">
      <div className="max-w-4xl mx-auto">
        <FadeIn>
          <div className="relative rounded-3xl border border-border bg-card p-12 md:p-16 text-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-violet-500/10 pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-8">
                <Sparkles className="w-4 h-4" />
                Open Beta - Free Forever
              </div>
              
              <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-foreground leading-[1.1] mb-6">
                Ready to branch your thinking?
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
                Join the beta and start exploring LLM conversations visually. No credit card required.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={onGetStarted}
                  className="group inline-flex items-center gap-3 rounded-xl bg-foreground text-background px-8 py-4 text-base font-medium shadow-xl shadow-foreground/10 hover:shadow-2xl hover:shadow-foreground/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </button>
                <a
                  href="#how"
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                >
                  <Play className="w-4 h-4" />
                  See how it works
                </a>
              </div>

              <div className="flex items-center justify-center gap-6 mt-10 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  No credit card
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  10+ models
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  Instant setup
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Footer
   ──────────────────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image
              src="/tree-icon.svg"
              alt="ContextTree"
              width={28}
              height={28}
              className="w-7 h-7"
            />
            <span className="text-lg font-semibold text-foreground">ContextTree</span>
          </div>
          
          <div className="flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#what" className="hover:text-foreground transition-colors">About</a>
            <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#models" className="hover:text-foreground transition-colors">Models</a>
          </div>

          <div className="text-sm text-muted-foreground">
            Built with care for thoughtful exploration.
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Navigation
   ──────────────────────────────────────────────────────────────────────── */

function Navigation({ onGetStarted }: { onGetStarted: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/tree-icon.svg"
              alt="ContextTree"
              width={28}
              height={28}
              className="w-7 h-7"
            />
            <span className="text-lg font-semibold tracking-tight text-foreground">
              ContextTree
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold px-2.5 py-1 ml-2">
              <Sparkles className="w-3 h-3" /> Beta
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground font-medium">
            <a href="#what" className="hover:text-foreground transition-colors">
              What it is
            </a>
            <a href="#how" className="hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#models" className="hover:text-foreground transition-colors">
              Models
            </a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onGetStarted}
              className="group inline-flex items-center gap-2 bg-foreground text-background text-sm font-medium px-5 py-2.5 rounded-xl shadow-sm hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Get Started
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-foreground"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background md:hidden"
          >
            <div className="flex flex-col h-full p-6">
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-3">
                  <Image
                    src="/tree-icon.svg"
                    alt="ContextTree"
                    width={28}
                    height={28}
                    className="w-7 h-7"
                  />
                  <span className="text-lg font-semibold text-foreground">ContextTree</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-6 text-2xl font-medium">
                {["What it is", "How it works", "Features", "Models"].map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-foreground hover:text-primary transition-colors"
                  >
                    {item}
                  </a>
                ))}
              </div>

              <div className="mt-auto">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onGetStarted();
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 bg-foreground text-background text-base font-medium px-6 py-4 rounded-xl"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Main Landing Page Export
   ──────────────────────────────────────────────────────────────────────── */

export function LandingPage() {
  const router = useRouter();
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, -80]);

  const handleGetStarted = () => router.push("/auth/signin");

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary selection:text-primary-foreground">
      {/* Ambient background with subtle gradient */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,hsl(var(--background))_100%)]" />
        <div className="absolute -top-1/3 left-1/2 -translate-x-1/2 w-[1400px] h-[1400px] rounded-full bg-[radial-gradient(closest-side,rgba(79,70,229,0.06),transparent_70%)]" />
        <div className="absolute top-[40%] -right-40 w-[800px] h-[800px] rounded-full bg-[radial-gradient(closest-side,rgba(168,85,247,0.04),transparent_70%)]" />
        <div className="absolute top-[60%] -left-40 w-[600px] h-[600px] rounded-full bg-[radial-gradient(closest-side,rgba(34,211,238,0.03),transparent_70%)]" />
      </div>

      <Navigation onGetStarted={handleGetStarted} />

      {/* Hero with 3D Scene */}
      <section className="relative pt-32 md:pt-40 pb-16 md:pb-24 px-6 overflow-hidden">
        {/* 3D Background Scene */}
        <div className="absolute inset-0 -z-5 opacity-60">
          <Landing3DScene className="w-full h-full" />
        </div>
        
        <motion.div style={{ y: heroY }} className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-12 lg:gap-20 items-center">
            <div className="relative z-10">
              <FadeIn>
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/90 backdrop-blur-xl px-4 py-2 text-xs font-medium text-muted-foreground shadow-lg shadow-black/5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  Open beta - free forever for core features
                </div>
              </FadeIn>

              <FadeIn delay={0.1}>
                <h1 className="mt-8 text-4xl md:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-[-0.02em] font-semibold text-foreground text-balance">
                  Branch your chats.
                  <br />
                  <span className="bg-gradient-to-r from-primary via-violet-500 to-primary bg-clip-text text-transparent">
                    Compare models,
                  </span>
                  <br />
                  side by side.
                </h1>
              </FadeIn>

              <FadeIn delay={0.2}>
                <p className="mt-8 max-w-lg text-lg md:text-xl text-muted-foreground leading-relaxed">
                  ContextTree is a visual canvas for LLM conversations. Fork any message
                  to a different model and watch answers stream in parallel — without
                  ever losing context.
                </p>
              </FadeIn>

              <FadeIn delay={0.3}>
                <div className="mt-10 flex flex-wrap items-center gap-4">
                  <button
                    onClick={handleGetStarted}
                    className="group relative inline-flex items-center gap-3 rounded-xl bg-primary px-7 py-4 text-base font-medium text-primary-foreground shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>Start for Free</span>
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </button>
                  <a
                    href="#how"
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/90 backdrop-blur-xl px-6 py-4 text-base font-medium text-foreground hover:bg-card hover:border-primary/30 transition-all shadow-lg shadow-black/5"
                  >
                    <CornerDownRight className="w-5 h-5 text-muted-foreground" />
                    See how it works
                  </a>
                </div>
              </FadeIn>

              <FadeIn delay={0.4}>
                <div className="mt-12 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    No credit card
                  </div>
                  <div className="hidden sm:block h-4 w-px bg-border" />
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    10+ open models
                  </div>
                  <div className="hidden sm:block h-4 w-px bg-border" />
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    Auto-save everything
                  </div>
                </div>
              </FadeIn>
            </div>

            <FadeIn delay={0.3} y={30}>
              <HeroCanvas />
            </FadeIn>
          </div>
        </motion.div>
      </section>

      <StatsSection />

      <ModelsSection />

      {/* What It Is */}
      <section id="what" className="px-6 py-24 md:py-32">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6">
                <Zap className="w-4 h-4 text-amber-500" />
                The Problem We Solve
              </div>
              <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-foreground leading-[1.1]">
                Chat interfaces force you into a straight line.
                <br />
                <span className="text-muted-foreground">Real thinking branches.</span>
              </h2>
              <p className="text-lg text-muted-foreground mt-6 max-w-2xl mx-auto">
                Traditional chat UIs are linear. You lose context, forget which model said what,
                and cannot easily compare alternatives. ContextTree changes that.
              </p>
            </div>
          </FadeIn>

          <ProblemComparison />
        </div>
      </section>

      <HowItWorksSection />

      <FeaturesSection />

      <CTASection onGetStarted={handleGetStarted} />

      <Footer />
    </div>
  );
}
