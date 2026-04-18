"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  X,
  ChevronRight,
  GitBranch,
  MessageSquare,
  Layers,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type GuideStep = {
  id: string;
  title: string;
  message: string;
  cardClass: string;
  cardWidth: string;
  arrow: "none" | "left" | "right" | "top";
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: string;
};

export function OnboardingGuide() {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const hasSeen = localStorage.getItem("context-tree-guide-completed");
    if (!hasSeen) {
      const timer = setTimeout(() => setIsVisible(true), 900);
      return () => clearTimeout(timer);
    }
  }, []);

  const steps: GuideStep[] = [
    {
      id: "welcome",
      title: "Welcome to ContextTree",
      message:
        "A visual workspace for building and branching AI conversations. Let's take a 30-second tour.",
      cardClass:
        "fixed inset-0 flex items-center justify-center bg-slate-950/30 backdrop-blur-sm z-[100]",
      cardWidth: "max-w-md",
      arrow: "none",
      icon: Sparkles,
      accent: "from-indigo-500 to-violet-500",
    },
    {
      id: "create",
      title: "Manage your canvases",
      message:
        "Every project lives as its own canvas. Hit ＋ in the sidebar to start a new flow.",
      cardClass: "fixed top-[74px] left-[260px] z-[100]",
      cardWidth: "w-72",
      arrow: "left",
      icon: Layers,
      accent: "from-blue-500 to-indigo-500",
    },
    {
      id: "canvas",
      title: "Build visually",
      message:
        "Right-click anywhere on the canvas to drop a node — Start, Branch, or Context. Drag to connect.",
      cardClass:
        "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100]",
      cardWidth: "w-80",
      arrow: "none",
      icon: GitBranch,
      accent: "from-indigo-500 to-violet-500",
    },
    {
      id: "console",
      title: "The Contextual Console",
      message:
        "Select any node to open this panel. It's where you write prompts, run models, and watch replies stream in.",
      cardClass: "fixed top-[74px] right-[24px] z-[100]",
      cardWidth: "w-80",
      arrow: "right",
      icon: MessageSquare,
      accent: "from-violet-500 to-fuchsia-500",
    },
  ];

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("context-tree-guide-completed", "true");
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleDismiss();
    }
  };

  if (!isVisible) return null;

  const current = steps[step];
  const Icon = current.icon;

  return (
    <AnimatePresence>
      <motion.div
        key={current.id}
        className={cn(current.cardClass)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "relative bg-white border border-slate-200 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)] rounded-2xl p-5 overflow-hidden",
            current.cardWidth
          )}
        >
          {/* Accent ribbon */}
          <div
            className={cn(
              "absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r",
              current.accent
            )}
          />

          {/* Arrow */}
          {current.arrow === "left" && (
            <div className="absolute top-6 -left-[7px] w-3.5 h-3.5 bg-white border-l border-b border-slate-200 transform rotate-45" />
          )}
          {current.arrow === "right" && (
            <div className="absolute top-6 -right-[7px] w-3.5 h-3.5 bg-white border-r border-t border-slate-200 transform rotate-45" />
          )}

          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br text-white shadow-sm",
                  current.accent
                )}
              >
                <Icon size={14} />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 mb-0.5">
                  Step {step + 1} of {steps.length}
                </div>
                <h3 className="font-semibold text-slate-900 text-sm leading-tight">
                  {current.title}
                </h3>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-100 rounded-md transition-colors"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            {current.message}
          </p>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <motion.div
                  key={i}
                  layout
                  className={cn(
                    "h-1.5 rounded-full transition-colors",
                    i === step ? "w-6 bg-slate-900" : "w-1.5 bg-slate-200"
                  )}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
                >
                  Back
                </button>
              )}
              <Button
                size="sm"
                onClick={handleNext}
                className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-sm px-4 rounded-lg"
              >
                {step === steps.length - 1 ? "Let's go" : "Next"}
                {step < steps.length - 1 && (
                  <ChevronRight size={12} className="ml-1" />
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
