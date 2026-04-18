"use client";

/**
 * HeroSection — editorial × organic × modern SaaS.
 * Two-column on desktop, stacks on mobile. 3D knowledge tree on the right.
 * Marginalia annotations as the signature detail.
 */

import React, { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
} from "framer-motion";
import { ArrowRight, Play, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const KnowledgeTree3D = dynamic(() => import("./KnowledgeTree3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#2D5F3F]/20 border-t-[#2D5F3F] animate-spin" />
    </div>
  ),
});

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function HeroSection({ onWatchDemo }: { onWatchDemo?: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const router = useRouter();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const scrollProgressRef = useRef(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    scrollProgressRef.current = v;
  });

  const copyY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen overflow-hidden bg-[#FBF9F4]"
    >
      <BackgroundLayers />

      <div className="relative max-w-[1240px] mx-auto px-6 md:px-8 pt-32 md:pt-40 pb-24 md:pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          <motion.div
            style={{ y: copyY }}
            className="lg:col-span-7 relative"
          >
            <CopyStack
              onStart={() => router.push("/auth/signin")}
              onWatchDemo={onWatchDemo}
            />
          </motion.div>

          <div className="lg:col-span-5 relative h-[420px] md:h-[520px] lg:h-[600px]">
            <KnowledgeTree3D
              scrollProgressRef={scrollProgressRef}
              className="w-full h-full"
            />
            <TreeScaleMarker />
          </div>
        </div>
      </div>

      <ScrollIndicator />
    </section>
  );
}

/* ── Backgrounds ─────────────────────────────────────────────────────── */
function BackgroundLayers() {
  return (
    <>
      {/* Paper noise */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-multiply"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.9'/%3E%3C/svg%3E")`,
        }}
      />
      {/* Grid paper */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(10, 14, 26, 0.035) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(10, 14, 26, 0.035) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
          maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 60%, transparent 100%)",
        }}
      />
      {/* Moss halo */}
      <div
        className="pointer-events-none absolute top-1/2 right-0 -translate-y-1/2 w-[900px] h-[700px] -translate-x-[10%]"
        style={{
          background:
            "radial-gradient(ellipse 55% 55% at 60% 50%, rgba(45, 95, 63, 0.10) 0%, transparent 70%)",
        }}
      />
      {/* Amber accent */}
      <div
        className="pointer-events-none absolute top-0 right-0 w-[500px] h-[400px]"
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at 70% 30%, rgba(201, 123, 47, 0.07) 0%, transparent 70%)",
        }}
      />
    </>
  );
}

/* ── Copy stack ──────────────────────────────────────────────────────── */
function CopyStack({
  onStart,
  onWatchDemo,
}: {
  onStart: () => void;
  onWatchDemo?: () => void;
}) {
  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: EASE_OUT }}
        className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.14em] uppercase text-[#6B7280] mb-8"
      >
        <span className="w-6 h-px bg-[#C97B2F]" />
        <span>01 · For Deep Learners</span>
      </motion.div>

      <h1 className="font-serif-display text-[3rem] sm:text-[4rem] lg:text-[5.5rem] leading-[0.95] tracking-[-0.03em] text-[#0A0E1A] font-normal">
        <Line delay={0.2}>Learn anything</Line>
        <Line delay={0.28}>
          <em className="italic text-[#C97B2F] font-normal">deeply</em>.
          Never&nbsp;lose
        </Line>
        <Line delay={0.36} className="text-[#2A3142]">
          the thread.
        </Line>
      </h1>

      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.48, ease: EASE_OUT }}
        className="mt-8 text-[18px] md:text-[20px] leading-[1.55] text-[#2A3142] max-w-[480px]"
      >
        When you're studying a hard topic with AI, one side-question shouldn't
        destroy the whole conversation. ContextTree is a visual canvas where
        every rabbit hole becomes its own{" "}
        <span className="underline decoration-[#E8E2D1] decoration-1 underline-offset-[5px]">
          branch
        </span>{" "}
        — and your{" "}
        <span className="underline decoration-[#E8E2D1] decoration-1 underline-offset-[5px]">
          main thread
        </span>{" "}
        stays clean.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.56, ease: EASE_OUT }}
        className="mt-10 flex flex-wrap items-center gap-4"
      >
        <button
          onClick={onStart}
          className="group inline-flex items-center gap-2 bg-[#2D5F3F] hover:bg-[#234A32] text-[#FBF9F4] text-[15px] font-medium px-6 py-3.5 rounded-xl transition-all hover:-translate-y-0.5"
          style={{
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.12), 0 1px 2px rgba(10,14,26,0.08), 0 8px 24px -12px rgba(45,95,63,0.4)",
          }}
        >
          Start learning free
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>

        <button
          onClick={onWatchDemo}
          className="group inline-flex items-center gap-2 border-[1.5px] border-[#2A3142]/60 hover:border-[#2D5F3F] text-[#2A3142] text-[15px] font-medium px-6 py-3.5 rounded-xl transition-colors"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Watch 90-second demo
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.72, ease: EASE_OUT }}
        className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] font-medium text-[#6B7280]"
      >
        <TrustItem label="Free forever for core" />
        <span className="w-1 h-1 rounded-full bg-[#E8E2D1]" />
        <TrustItem label="Works with Claude, GPT-4, Gemini (BYOK)" />
        <span className="w-1 h-1 rounded-full bg-[#E8E2D1]" />
        <TrustItem label="No credit card" />
      </motion.div>

      <Marginalia />
    </div>
  );
}

function Line({
  children,
  delay,
  className = "",
}: {
  children: React.ReactNode;
  delay: number;
  className?: string;
}) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: EASE_OUT }}
      className={`block font-serif-display ${className}`}
    >
      {children}
    </motion.span>
  );
}

function TrustItem({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Check className="w-3.5 h-3.5 text-[#2D5F3F]" strokeWidth={2.5} />
      {label}
    </span>
  );
}

/* ── Marginalia ──────────────────────────────────────────────────────── */
function Marginalia() {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -12, rotate: -4 }}
        animate={{ opacity: 1, x: 0, rotate: -4 }}
        transition={{ duration: 0.5, delay: 1.2, ease: EASE_OUT }}
        className="hidden xl:block absolute pointer-events-none font-serif-display italic"
        style={{
          top: "calc(3rem + 80px)",
          right: "-180px",
          fontSize: "14px",
          color: "#C97B2F",
          fontWeight: 400,
          letterSpacing: "0.01em",
        }}
      >
        <svg
          width="40"
          height="20"
          viewBox="0 0 40 20"
          fill="none"
          className="inline-block mr-1 -translate-y-[2px]"
        >
          <path
            d="M 2 10 Q 15 6, 30 10 L 26 6 M 30 10 L 26 14"
            stroke="#C97B2F"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        the whole point
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -12, rotate: -2 }}
        animate={{ opacity: 1, x: 0, rotate: -2 }}
        transition={{ duration: 0.5, delay: 1.4, ease: EASE_OUT }}
        className="hidden xl:block absolute pointer-events-none font-serif-display italic"
        style={{
          top: "calc(3rem + 210px)",
          right: "-140px",
          fontSize: "13px",
          color: "#C97B2F",
          fontWeight: 400,
        }}
      >
        most tools lose this
        <svg
          width="18"
          height="24"
          viewBox="0 0 18 24"
          fill="none"
          className="inline-block ml-1 translate-y-[4px]"
        >
          <path
            d="M 9 2 Q 5 12, 9 22 L 5 18 M 9 22 L 13 18"
            stroke="#C97B2F"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </motion.div>
    </>
  );
}

function TreeScaleMarker() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 1.6 }}
      className="hidden lg:flex absolute right-4 top-1/2 -translate-y-1/2 flex-col items-center gap-3 pointer-events-none"
    >
      <div className="text-[9px] font-semibold tracking-[0.2em] uppercase text-[#6B7280]/70 [writing-mode:vertical-rl] rotate-180">
        Fig. 01 · Knowledge Tree
      </div>
    </motion.div>
  );
}

function ScrollIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 1.4 }}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
    >
      <div className="relative h-8 w-px bg-[#6B7280]/30 overflow-hidden">
        <motion.span
          initial={{ y: -4 }}
          animate={{ y: 34 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#2D5F3F]"
        />
      </div>
      <span className="text-[10px] font-semibold tracking-[0.24em] uppercase text-[#6B7280]/70">
        Scroll
      </span>
    </motion.div>
  );
}
