"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type ShimmerTextProps = {
  children: React.ReactNode;
  className?: string;
};

export function ShimmerText({ children, className }: ShimmerTextProps) {
  return (
    <motion.span
      className={cn(
        "relative inline-flex bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-transparent",
        className
      )}
      initial={{ backgroundPositionX: "0%" }}
      animate={{ backgroundPositionX: ["0%", "200%", "0%"] }}
      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      style={{ backgroundSize: "200% 100%" }}
    >
      <span className="relative z-10 drop-shadow-[0_8px_32px_rgba(15,23,42,0.25)]">
        {children}
      </span>
      <motion.span
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-500/60 to-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.1, 0.45, 0.1] }}
        transition={{
          duration: 4,
          repeat: Infinity,
          delay: 1.6,
          ease: "easeInOut",
        }}
      />
    </motion.span>
  );
}

type HeroBackGlowProps = {
  className?: string;
};

const orbitConfigs = [
  {
    size: 360,
    top: "-18%",
    left: "-12%",
    color: "from-slate-200/60 via-slate-100/20 to-transparent",
    drift: { x: 14, y: 24 },
    delay: 0,
  },
  {
    size: 280,
    top: "55%",
    left: "75%",
    color: "from-slate-300/50 via-white/20 to-transparent",
    drift: { x: -18, y: 16 },
    delay: 1.2,
  },
  {
    size: 220,
    top: "68%",
    left: "18%",
    color: "from-slate-200/45 via-white/10 to-transparent",
    drift: { x: 10, y: -14 },
    delay: 2.4,
  },
];

export function HeroBackGlow({ className }: HeroBackGlowProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      <div className="absolute inset-x-[-40%] top-[15%] h-64 rounded-full bg-gradient-to-r from-slate-300/20 via-white/40 to-slate-200/15 blur-3xl" />
      <motion.div
        className="absolute inset-x-[12%] bottom-[18%] h-[2px] bg-gradient-to-r from-transparent via-slate-300/40 to-transparent"
        animate={{ opacity: [0.2, 0.6, 0.2], y: [0, -6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      {orbitConfigs.map((orbit) => (
        <motion.div
          key={`${orbit.top}-${orbit.left}`}
          className={cn(
            "absolute rounded-full bg-gradient-to-br blur-3xl",
            orbit.color
          )}
          style={{
            top: orbit.top,
            left: orbit.left,
            width: orbit.size,
            height: orbit.size,
          }}
          animate={{
            x: [0, orbit.drift.x, 0],
            y: [0, orbit.drift.y, 0],
            opacity: [0.22, 0.5, 0.22],
          }}
          transition={{
            duration: 18,
            delay: orbit.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
      <motion.div
        className="absolute right-[18%] top-[30%] h-10 w-10 rounded-full border border-slate-300/30"
        animate={{
          x: [0, 8, -6, 0],
          y: [0, -6, 10, 0],
          opacity: [0.1, 0.4, 0.2, 0.1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-[12%] top-[38%] h-6 w-6 rounded-full bg-slate-300/60 shadow-[0_0_24px_rgba(148,163,184,0.4)]"
        animate={{
          x: [0, 18, 6, 0],
          y: [0, 6, -10, 0],
          opacity: [0.35, 0.65, 0.4, 0.35],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1.2,
        }}
      />
    </div>
  );
}
