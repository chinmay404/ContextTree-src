"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useInView,
  useMotionValue,
  useSpring,
} from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
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
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ModelProviderIcon } from "@/components/model-badge";

/* ──────────────────────────────────────────────────────────────────────────
   Atomic helpers
   ──────────────────────────────────────────────────────────────────────── */

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const FadeIn: React.FC<
  React.PropsWithChildren<{ delay?: number; y?: number; className?: string }>
> = ({ children, delay = 0, y = 14, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
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

/* ──────────────────────────────────────────────────────────────────────────
   Hero — Live Mini Canvas
   Shows exactly what the product does: one prompt branching into multiple
   models on an infinite canvas.
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
    name: "Math foundations",
    provider: "Meta",
    accent: "from-blue-500/70 to-indigo-500/40",
    reply:
      "Branch into vectors, gradients, and matrix multiplication without polluting the main learning thread.",
  },
  {
    id: "deepseek-r1-distill-llama-70b",
    name: "Implementation path",
    provider: "DeepSeek",
    accent: "from-violet-500/70 to-fuchsia-500/40",
    reply:
      "Fork into PyTorch examples and code experiments while the original explanation stays clean and focused.",
  },
];

function HeroCanvas() {
  // Lightweight typing simulation for the reply cards
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

  // Float effect
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-40, 40], [4, -4]), {
    stiffness: 80,
    damping: 20,
  });
  const ry = useSpring(useTransform(mx, [-40, 40], [-4, 4]), {
    stiffness: 80,
    damping: 20,
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
      style={{ perspective: 1400 }}
    >
      {/* Ambient gradient */}
      <div className="absolute -inset-16 bg-[radial-gradient(50%_50%_at_50%_45%,rgba(99,102,241,0.14),transparent_70%)] pointer-events-none" />
      <div className="absolute -inset-16 bg-[radial-gradient(35%_35%_at_80%_20%,rgba(168,85,247,0.12),transparent_70%)] pointer-events-none" />

      <motion.div
        className="relative h-full w-full rounded-[28px] border border-slate-200/80 bg-white/70 backdrop-blur-xl shadow-[0_40px_90px_-30px_rgba(15,23,42,0.18)] overflow-hidden"
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
      >
        {/* Canvas toolbar */}
        <div className="absolute top-0 left-0 right-0 h-11 border-b border-slate-100 bg-white/80 backdrop-blur-md flex items-center px-4 gap-3 z-20">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <Workflow className="w-3.5 h-3.5" />
            <span>Neural networks · canvas</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-[10px] font-mono text-slate-500">
            <Command className="w-3 h-3" /> K
          </div>
        </div>

        {/* Grid background */}
        <div className="absolute inset-0 pt-11">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.05)_1px,transparent_1px)] bg-[size:22px_22px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,#000_60%,transparent_100%)]" />
        </div>

        {/* Connecting branch svg */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 600 480"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="hero-edge-a" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="hero-edge-b" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#d8b4fe" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <motion.path
            d="M 300 140 C 300 200, 160 230, 140 310"
            stroke="url(#hero-edge-a)"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: EASE_OUT, delay: 0.5 }}
          />
          <motion.path
            d="M 300 140 C 300 200, 440 230, 460 310"
            stroke="url(#hero-edge-b)"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: EASE_OUT, delay: 0.5 }}
          />
          {/* Flow dots */}
          <motion.circle
            r="3"
            fill="#6366f1"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: 1.8 }}
          >
            <animateMotion
              dur="2.4s"
              repeatCount="indefinite"
              begin="1.8s"
              path="M 300 140 C 300 200, 160 230, 140 310"
            />
          </motion.circle>
          <motion.circle
            r="3"
            fill="#a855f7"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: 2 }}
          >
            <animateMotion
              dur="2.4s"
              repeatCount="indefinite"
              begin="2s"
              path="M 300 140 C 300 200, 440 230, 460 310"
            />
          </motion.circle>
        </svg>

        {/* Root prompt node */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 top-[18%] z-10"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 }}
        >
          <div className="group relative rounded-2xl bg-slate-900 text-white px-5 py-3.5 shadow-xl shadow-slate-900/20 ring-1 ring-slate-800 min-w-[260px]">
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="font-mono uppercase tracking-wider">prompt</span>
            </div>
            <div className="text-sm font-medium leading-snug">
              Help me learn neural networks from scratch without losing the main thread.
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-slate-900 ring-2 ring-white" />
          </div>
        </motion.div>

        {/* Branch A */}
        <motion.div
          className="absolute left-[6%] top-[62%] w-[40%] z-10"
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: EASE_OUT, delay: 1.1 }}
        >
          <ReplyCard
            model={HERO_MODELS[0]}
            text={HERO_MODELS[0].reply.slice(0, typed[0])}
            progress={typed[0] / HERO_MODELS[0].reply.length}
            accent="indigo"
          />
        </motion.div>

        {/* Branch B */}
        <motion.div
          className="absolute right-[6%] top-[62%] w-[40%] z-10"
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
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

        {/* Floating cursor hint */}
        <motion.div
          className="absolute left-1/2 top-[48%] -translate-x-1/2 z-20 pointer-events-none"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2.4, duration: 0.4 }}
        >
          <div className="flex items-center gap-1.5 rounded-full bg-slate-900/90 text-white text-[10px] font-medium px-2.5 py-1 shadow-lg backdrop-blur">
            <MousePointer2 className="w-3 h-3" />
            <span>fork here</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Floating chips */}
      <motion.div
        className="absolute -left-6 top-[28%] hidden md:block"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.8, duration: 0.5 }}
      >
        <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs shadow-lg border border-slate-200/80">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-slate-700">Context preserved</span>
        </div>
      </motion.div>

      <motion.div
        className="absolute -right-4 bottom-[18%] hidden md:block"
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 2.1, duration: 0.5 }}
      >
        <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs shadow-lg border border-slate-200/80">
          <GitBranch className="w-3.5 h-3.5 text-indigo-500" />
          <span className="font-medium text-slate-700">2 branches · 1 root</span>
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
  accent: "indigo" | "violet";
}) {
  const ring =
    accent === "indigo"
      ? "ring-indigo-200/80 shadow-indigo-100"
      : "ring-violet-200/80 shadow-violet-100";
  const bar =
    accent === "indigo"
      ? "from-indigo-500 to-blue-500"
      : "from-violet-500 to-fuchsia-500";

  return (
    <div
      className={`relative rounded-2xl bg-white ring-1 ${ring} shadow-[0_20px_40px_-20px_rgba(15,23,42,0.18)] overflow-hidden`}
    >
      <div className={`h-0.5 bg-gradient-to-r ${bar} w-full`} />
      <div className="p-3.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ModelProviderIcon
              modelId={model.id}
              provider={model.provider}
              size={20}
            />
            <div>
              <div className="text-[11px] font-semibold text-slate-900 leading-none">
                {model.name}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-slate-400 mt-0.5">
                {model.provider}
              </div>
            </div>
          </div>
          <div className="text-[9px] font-mono text-slate-400">
            {Math.round(progress * 100)}%
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-600 min-h-[48px]">
          {text}
          {progress < 1 && (
            <span className="inline-block w-1 h-3 bg-slate-400 ml-0.5 align-middle animate-pulse" />
          )}
        </p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Side-by-side problem comparison
   ──────────────────────────────────────────────────────────────────────── */

function ProblemComparison() {
  return (
    <div className="grid md:grid-cols-2 gap-5 items-stretch">
      {/* Before */}
      <FadeIn>
        <div className="relative h-full rounded-2xl border border-slate-200 bg-slate-50/60 p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Before
            </div>
            <span className="text-[10px] font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-full border border-rose-100">
              linear chat
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-semibold text-slate-900 leading-tight mb-2">
            One thread. Context drifts. Decisions get lost.
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            You open four tabs, paste the same question into each, try to
            remember which model said what, and lose the thread.
          </p>

          <div className="space-y-2">
            {[
              { u: "What's the difference between DFS and BFS?", r: "Answer on trees…" },
              { u: "What about in Python?", r: "Wait — sorting or trees?" },
              { u: "Can you show example code?", r: "Which context again?" },
            ].map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-xl border border-slate-200 bg-white p-3 text-[12px]"
              >
                <div className="text-slate-500 text-[10px] mb-1 font-mono uppercase">
                  you
                </div>
                <div className="text-slate-800 mb-2">{m.u}</div>
                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] mb-1 font-mono uppercase">
                  model
                </div>
                <div className="text-slate-500 italic">{m.r}</div>
              </motion.div>
            ))}
          </div>

          {/* Frustration glyph */}
          <div className="pointer-events-none absolute -bottom-8 -right-8 w-48 h-48 rounded-full bg-rose-100/40 blur-2xl" />
        </div>
      </FadeIn>

      {/* After */}
      <FadeIn delay={0.15}>
        <div className="relative h-full rounded-2xl border border-slate-900/10 bg-white p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.15)] overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">
              After · ContextTree
            </div>
            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
              branching canvas
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-semibold text-slate-900 leading-tight mb-2">
            One canvas. Every path alive. Compare answers side-by-side.
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            Pick any message, fork it to a different model, keep going. Context
            is inherited automatically — never contaminated.
          </p>

          <MiniTree />

          <div className="pointer-events-none absolute -top-8 -right-8 w-48 h-48 rounded-full bg-indigo-100/50 blur-2xl" />
        </div>
      </FadeIn>
    </div>
  );
}

function MiniTree() {
  return (
    <div className="relative rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:18px_18px] opacity-30" />
      <div className="relative h-48">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 200">
          <motion.path
            d="M 150 30 C 150 60, 70 80, 70 120"
            stroke="#a5b4fc"
            strokeWidth="1.5"
            fill="none"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9 }}
          />
          <motion.path
            d="M 150 30 C 150 60, 230 80, 230 120"
            stroke="#c4b5fd"
            strokeWidth="1.5"
            fill="none"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.1 }}
          />
          <motion.path
            d="M 70 120 C 70 150, 40 160, 40 180"
            stroke="#a5b4fc"
            strokeWidth="1.5"
            fill="none"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.6 }}
          />
          <motion.path
            d="M 70 120 C 70 150, 110 160, 110 180"
            stroke="#a5b4fc"
            strokeWidth="1.5"
            fill="none"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.7 }}
          />
        </svg>

        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-medium px-2.5 py-1 rounded-md shadow-sm">
          DFS vs BFS?
        </div>

        <div className="absolute top-[58%] left-[12%] bg-white border border-indigo-200 text-indigo-900 text-[10px] font-medium px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
          <ModelProviderIcon modelId="llama" provider="Meta" size={12} />
          Llama
        </div>
        <div className="absolute top-[58%] right-[12%] bg-white border border-violet-200 text-violet-900 text-[10px] font-medium px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
          <ModelProviderIcon modelId="deepseek" provider="DeepSeek" size={12} />
          DeepSeek
        </div>

        <div className="absolute bottom-1 left-[5%] bg-white border border-slate-200 text-slate-700 text-[10px] font-medium px-2 py-0.5 rounded-md">
          Python
        </div>
        <div className="absolute bottom-1 left-[30%] bg-white border border-slate-200 text-slate-700 text-[10px] font-medium px-2 py-0.5 rounded-md">
          Go
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   How it works
   ──────────────────────────────────────────────────────────────────────── */

const STEPS = [
  {
    n: "01",
    title: "Prompt",
    desc: "Drop a message on your canvas. Choose any model — Llama, Mixtral, DeepSeek, Gemma and more.",
    icon: MessageSquare,
    art: <StepPromptArt />,
  },
  {
    n: "02",
    title: "Branch",
    desc: "Fork any point in the conversation. Each branch inherits only its parent context — zero contamination.",
    icon: GitBranch,
    art: <StepBranchArt />,
  },
  {
    n: "03",
    title: "Compare",
    desc: "Run the same prompt across models, watch replies stream in parallel, keep the path that wins.",
    icon: Layers,
    art: <StepCompareArt />,
  },
];

function StepPromptArt() {
  return (
    <div className="relative h-32 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 p-3 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(99,102,241,0.08),transparent_60%)]" />
      <div className="relative bg-slate-900 text-white rounded-lg px-3 py-2 text-[11px] shadow-lg inline-flex items-center gap-2">
        <MessageSquare className="w-3 h-3" />
        Build a story about…
      </div>
      <div className="flex gap-1.5 mt-3 relative">
        {["llama-3.3-70b-versatile", "deepseek-r1-distill-llama-70b", "mixtral-8x7b", "gemma-7b"].map(
          (m, i) => (
            <motion.div
              key={m}
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * i }}
            >
              <ModelProviderIcon modelId={m} size={22} />
            </motion.div>
          )
        )}
      </div>
    </div>
  );
}

function StepBranchArt() {
  return (
    <div className="relative h-32 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 overflow-hidden">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 128">
        <motion.path
          d="M 100 20 L 100 60"
          stroke="#0f172a"
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        />
        <motion.path
          d="M 100 60 C 100 80, 60 90, 50 110"
          stroke="#6366f1"
          strokeWidth="2"
          fill="none"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        />
        <motion.path
          d="M 100 60 C 100 80, 140 90, 150 110"
          stroke="#a855f7"
          strokeWidth="2"
          fill="none"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        />
        <circle cx="100" cy="20" r="4" fill="#0f172a" />
        <circle cx="100" cy="60" r="4" fill="#0f172a" />
        <circle cx="50" cy="110" r="4" fill="#6366f1" />
        <circle cx="150" cy="110" r="4" fill="#a855f7" />
      </svg>
      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-mono uppercase tracking-wider text-slate-400">
        root
      </div>
      <div className="absolute bottom-1 left-[18%] text-[9px] font-medium text-indigo-600">
        path a
      </div>
      <div className="absolute bottom-1 right-[18%] text-[9px] font-medium text-violet-600">
        path b
      </div>
    </div>
  );
}

function StepCompareArt() {
  return (
    <div className="relative h-32 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 p-3 overflow-hidden">
      <div className="grid grid-cols-2 gap-2">
        {[
          { color: "indigo", w: "92%" },
          { color: "violet", w: "78%" },
        ].map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 4 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className={`rounded-lg border ${
              c.color === "indigo"
                ? "border-indigo-200 bg-indigo-50/40"
                : "border-violet-200 bg-violet-50/40"
            } p-2`}
          >
            <div className="space-y-1">
              <div className="h-1 bg-slate-200 rounded w-4/5" />
              <div className="h-1 bg-slate-200 rounded w-full" />
              <div className="h-1 bg-slate-200 rounded w-3/4" />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="text-[9px] font-medium text-slate-500">
                quality
              </div>
              <div className="text-[9px] font-bold text-slate-800">{c.w}</div>
            </div>
            <div className="mt-1 h-1 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: c.w }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                className={`h-full ${
                  c.color === "indigo" ? "bg-indigo-500" : "bg-violet-500"
                }`}
              />
            </div>
          </motion.div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[9px] font-medium text-emerald-700">
        <Check className="w-3 h-3" />
        Keeping path A
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Supported models marquee
   ──────────────────────────────────────────────────────────────────────── */

const MARQUEE_MODELS = [
  { id: "llama-3.3-70b-versatile", provider: "Meta", label: "Llama 3.3" },
  { id: "deepseek-r1-distill-llama-70b", provider: "DeepSeek", label: "DeepSeek R1" },
  { id: "mixtral-8x7b", provider: "Mistral", label: "Mixtral 8x7B" },
  { id: "gemma-7b", provider: "Google", label: "Gemma" },
  { id: "qwen-2.5-72b", provider: "Alibaba", label: "Qwen 2.5" },
  { id: "kimi-k2", provider: "Moonshot", label: "Kimi K2" },
  { id: "allam", provider: "SDAIA", label: "Allam" },
  { id: "compound-beta", provider: "Groq", label: "Compound" },
];

function ModelsMarquee() {
  const items = [...MARQUEE_MODELS, ...MARQUEE_MODELS];
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-slate-50 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-slate-50 to-transparent z-10" />
      <motion.div
        className="flex gap-3 py-2"
        initial={{ x: 0 }}
        animate={{ x: "-50%" }}
        transition={{
          duration: 32,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {items.map((m, i) => (
          <div
            key={i}
            className="shrink-0 inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm"
          >
            <ModelProviderIcon modelId={m.id} provider={m.provider} size={18} />
            <span>{m.label}</span>
            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-mono">
              {m.provider}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Features
   ──────────────────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: GitBranch,
    title: "Visual branching",
    desc: "Fork at any message. Every branch is a clean, isolated thread on an infinite canvas.",
  },
  {
    icon: Layers,
    title: "Context isolation",
    desc: "A branch inherits only its ancestors. No bleed-over, no silent contamination.",
  },
  {
    icon: Cpu,
    title: "10+ open models",
    desc: "Llama, Mixtral, DeepSeek, Gemma, Qwen, Kimi and more — one prompt, many brains.",
  },
  {
    icon: FileText,
    title: "Attach context",
    desc: "Drop docs, notes, and structured data into nodes. They flow down the tree automatically.",
  },
  {
    icon: FlaskConical,
    title: "Experiment mode",
    desc: "Sweep prompts, temperatures and models in parallel. Find the best configuration fast.",
    badge: "Soon",
  },
  {
    icon: Workflow,
    title: "Reusable flows",
    desc: "Save a canvas as a template. Replay the branching logic on a new task in one click.",
    badge: "Soon",
  },
];

const FAQS = [
  {
    question: "What is branching AI chat?",
    answer:
      "Branching AI chat lets you fork a conversation from any message, keep each path isolated, and compare different answers without losing the original thread.",
  },
  {
    question: "How does ContextTree avoid context drift?",
    answer:
      "ContextTree stores conversations as a tree. Each branch inherits only the selected parent context, so later experiments do not pollute other paths.",
  },
  {
    question: "Is ContextTree a ChatGPT alternative?",
    answer:
      "ContextTree is a ChatGPT alternative for people who need branching conversations, multi-model comparison, and visual organization instead of one linear chat history.",
  },
  {
    question: "Can I compare multiple AI models in one workspace?",
    answer:
      "Yes. ContextTree is a multi-model AI canvas for testing prompts across supported LLMs and keeping the strongest branch.",
  },
];

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

/* ──────────────────────────────────────────────────────────────────────────
   Main landing page
   ──────────────────────────────────────────────────────────────────────── */

export function LandingPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [navElevated, setNavElevated] = useState(false);

  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, -60]);

  useEffect(() => {
    const id = setInterval(() => setActiveStep((p) => (p + 1) % 3), 3400);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onScroll = () => setNavElevated(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleGetStarted = () => router.push("/auth/signin");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden selection:bg-slate-900 selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }}
      />
      {/* Ambient gradient wash */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-1/3 left-1/2 -translate-x-1/2 w-[1200px] h-[1200px] rounded-full bg-[radial-gradient(closest-side,rgba(99,102,241,0.10),transparent_70%)]" />
        <div className="absolute top-[30%] -right-40 w-[700px] h-[700px] rounded-full bg-[radial-gradient(closest-side,rgba(168,85,247,0.09),transparent_70%)]" />
      </div>

      {/* NAV */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          navElevated
            ? "bg-white/75 backdrop-blur-xl border-b border-slate-200/80"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image
              src="/tree-icon.svg"
              alt="ContextTree"
              width={26}
              height={26}
              className="w-7 h-7"
            />
            <span className="text-[17px] font-semibold tracking-tight text-slate-900">
              ContextTree
            </span>
            <span className="ml-2 hidden sm:inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 border border-slate-200">
              <Sparkles className="w-2.5 h-2.5" /> Beta
            </span>
          </div>
          <div className="hidden md:flex items-center gap-7 text-sm text-slate-600 font-medium">
            <a href="#what" className="hover:text-slate-900 transition-colors">
              What it is
            </a>
            <a href="#how" className="hover:text-slate-900 transition-colors">
              How it works
            </a>
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Features
            </a>
            <a href="/chatgpt-alternative" className="hover:text-slate-900 transition-colors">
              vs ChatGPT
            </a>
            <a href="#models" className="hover:text-slate-900 transition-colors">
              Models
            </a>
          </div>
          <button
            onClick={handleGetStarted}
            className="group inline-flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-xl shadow-sm hover:shadow-md hover:bg-slate-800 transition-all"
          >
            Get Started
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-32 md:pt-40 pb-20 md:pb-28 px-6">
        <motion.div style={{ y: heroY }} className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] gap-12 lg:gap-16 items-center">
            <div className="relative z-10">
              <FadeIn>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 backdrop-blur px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  Open beta · free forever for core
                </div>
              </FadeIn>

              <FadeIn delay={0.05}>
                <h1 className="mt-6 text-[44px] md:text-[60px] lg:text-[68px] leading-[1.02] tracking-[-0.02em] font-semibold text-slate-900">
                  Branching AI chat.
                  <br />
                  <span className="relative inline-block">
                    <span className="bg-gradient-to-br from-slate-900 via-indigo-700 to-violet-700 bg-clip-text text-transparent">
                      Multi-model AI canvas,
                    </span>
                  </span>
                  <br />
                  built for context.
                </h1>
              </FadeIn>

              <FadeIn delay={0.12}>
                <p className="mt-6 max-w-xl text-lg text-slate-600 leading-relaxed">
                  ContextTree is an AI conversation tree for power users. Pick
                  any message, fork the AI conversation to a different model,
                  and compare branches side by side without context drift.
                </p>
              </FadeIn>

              <FadeIn delay={0.18}>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleGetStarted}
                    className="btn-sheen group relative inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-slate-900/20 hover:shadow-xl hover:shadow-slate-900/25 transition-all hover:bg-slate-800 active:scale-[0.98]"
                  >
                    <span>Start free</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10 pointer-events-none" />
                  </button>
                  <a
                    href="#how"
                    className="inline-flex items-center gap-2 rounded-xl bg-white/80 backdrop-blur border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-white transition-all"
                  >
                    <CornerDownRight className="w-4 h-4 text-slate-400" />
                    See how it works
                  </a>
                </div>
              </FadeIn>

              <FadeIn delay={0.24}>
                <div className="mt-10 flex items-center gap-5 text-[11px] text-slate-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    No credit card
                  </div>
                  <div className="h-3 w-px bg-slate-200" />
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    10+ open models
                  </div>
                  <div className="h-3 w-px bg-slate-200" />
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    Auto-save
                  </div>
                </div>
              </FadeIn>
            </div>

            <FadeIn delay={0.2}>
              <HeroCanvas />
            </FadeIn>
          </div>
        </motion.div>
      </section>

      {/* MODELS STRIP */}
      <section id="models" className="py-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Powered by the best open-source models
          </div>
          <ModelsMarquee />
        </div>
      </section>

      {/* WHAT IT IS — The aha moment */}
      <section id="what" className="px-6 py-24 md:py-32">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-600 mb-5">
                <Zap className="w-3 h-3 text-amber-500" /> Why it exists
              </div>
              <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-slate-900 leading-[1.08]">
                Linear AI chat loses context.
                <br />
                <span className="text-slate-500">
                  ContextTree keeps every branch organized.
                </span>
              </h2>
            </div>
          </FadeIn>

          <ProblemComparison />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="relative px-6 py-24 md:py-32 bg-white border-y border-slate-200/60">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600 mb-5">
                <Workflow className="w-3 h-3 text-indigo-500" /> How it works
              </div>
              <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-slate-900 leading-[1.08]">
                Fork AI conversations in three moves.
              </h2>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-5">
            {STEPS.map((step, i) => (
              <FadeIn key={i} delay={0.08 * i}>
                <motion.div
                  animate={{
                    scale: activeStep === i ? 1.02 : 1,
                  }}
                  transition={{ duration: 0.4, ease: EASE_OUT }}
                  className={`group relative h-full rounded-2xl border p-6 transition-all duration-500 ${
                    activeStep === i
                      ? "bg-slate-900 text-white border-slate-900 shadow-[0_40px_80px_-40px_rgba(15,23,42,0.35)]"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className={`text-[10px] font-mono font-bold tracking-widest ${
                        activeStep === i ? "text-indigo-300" : "text-slate-400"
                      }`}
                    >
                      {step.n}
                    </div>
                    <div
                      className={`h-px flex-1 ${
                        activeStep === i ? "bg-slate-700" : "bg-slate-200"
                      }`}
                    />
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        activeStep === i
                          ? "bg-white/10 text-white"
                          : "bg-slate-100 text-slate-900"
                      }`}
                    >
                      <step.icon className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p
                    className={`text-sm leading-relaxed mb-5 ${
                      activeStep === i ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    {step.desc}
                  </p>
                  {step.art}
                </motion.div>
              </FadeIn>
            ))}
          </div>

          <div className="flex justify-center gap-1.5 mt-10">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeStep === i
                    ? "w-8 bg-slate-900"
                    : "w-1.5 bg-slate-300 hover:bg-slate-400"
                }`}
                aria-label={`Step ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="px-6 py-24 md:py-32">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-600 mb-4">
                  <Sparkles className="w-3 h-3 text-violet-500" /> Features
                </div>
                <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-slate-900 leading-[1.08] max-w-2xl">
                  Built like a real tool.
                  <br />
                  <span className="text-slate-500">
                    Not another chat wrapper.
                  </span>
                </h2>
              </div>
              <p className="text-slate-600 max-w-sm text-base leading-relaxed">
                Keyboard-first, auto-saving, infinite canvas. The details that
                matter when you spend hours in it.
              </p>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <FadeIn key={i} delay={0.04 * i}>
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.25, ease: EASE_OUT }}
                  className="group relative h-full rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-slate-300 hover:shadow-[0_20px_40px_-20px_rgba(15,23,42,0.1)]"
                >
                  {f.badge && (
                    <span className="absolute top-5 right-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold px-2 py-0.5 border border-slate-200">
                      {f.badge}
                    </span>
                  )}
                  <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center shadow-sm">
                    <f.icon className="w-[18px] h-[18px] text-white" strokeWidth={2} />
                    <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
                  </div>
                  <h3 className="mt-5 text-base font-semibold text-slate-900">
                    {f.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                    {f.desc}
                  </p>
                  <div className="mt-4 flex items-center text-[11px] font-medium text-slate-400 group-hover:text-indigo-600 transition-colors">
                    Learn more
                    <ArrowUpRight className="w-3 h-3 ml-0.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </motion.div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-6 py-24 md:py-32 bg-white border-y border-slate-200/60">
        <div className="max-w-4xl mx-auto">
          <FadeIn>
            <div className="mb-10">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600 mb-4">
                FAQ
              </div>
              <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-slate-900 leading-[1.08]">
                Branching AI chat, explained.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
                A quick guide for people looking for a ChatGPT alternative that handles long conversations, branching, and multi-model comparison.
              </p>
            </div>
          </FadeIn>

          <div className="grid gap-3">
            {FAQS.map((item, index) => (
              <FadeIn key={item.question} delay={0.04 * index}>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-base font-semibold text-slate-900">
                    {item.question}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {item.answer}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="relative rounded-3xl overflow-hidden bg-slate-900 text-white px-8 py-16 md:px-16 md:py-20">
              {/* Aurora */}
              <div className="absolute inset-0 opacity-60">
                <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-indigo-600/40 blur-3xl" />
                <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-violet-600/40 blur-3xl" />
              </div>

              {/* Grid */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:28px_28px]" />

              <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-10">
                <div>
                  <h2 className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.1] max-w-xl">
                    Start branching your conversations today.
                  </h2>
                  <p className="mt-4 text-slate-400 max-w-lg text-base">
                    Sign up in seconds. Open a canvas. Drop a prompt. Fork it.
                    That's it — you're thinking in trees now.
                  </p>
                </div>
                <div className="flex flex-col gap-3 md:min-w-[220px]">
                  <button
                    onClick={handleGetStarted}
                    className="btn-sheen group inline-flex items-center justify-center gap-2 rounded-xl bg-white text-slate-900 px-6 py-3.5 font-medium text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                  >
                    Start free
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                  <div className="text-[11px] text-slate-500 text-center font-medium">
                    Free beta access · no credit card
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 pb-10">
        <div className="max-w-7xl mx-auto border-t border-slate-200 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Image
              src="/tree-icon.svg"
              alt="ContextTree"
              width={20}
              height={20}
              className="w-5 h-5 opacity-80"
            />
            <span className="text-sm font-semibold text-slate-700">
              ContextTree
            </span>
            <span className="text-xs text-slate-400">
              © {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-6 text-xs font-medium text-slate-500">
            <a href="#what" className="hover:text-slate-900 transition-colors">
              What
            </a>
            <a href="#how" className="hover:text-slate-900 transition-colors">
              How
            </a>
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Features
            </a>
            <a
              href="/chatgpt-alternative"
              className="hover:text-slate-900 transition-colors"
            >
              vs ChatGPT
            </a>
            <a
              href="#models"
              className="hover:text-slate-900 transition-colors"
            >
              Models
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
