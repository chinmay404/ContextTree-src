"use client";

import { type SyntheticEvent, useEffect, useMemo, useState } from "react";
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
  target?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: string;
};

type RectLike = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type CardPosition = {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  transform?: string;
};

const GUIDE_STORAGE_KEY = "context-tree-guide-completed";
const CARD_WIDTH = 360;
const EDGE_GAP = 20;
const TOOLTIP_GAP = 18;

const stopEvent = (event: SyntheticEvent) => {
  event.preventDefault();
  event.stopPropagation();
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const rectFromElement = (target?: string): RectLike | null => {
  if (!target || typeof window === "undefined") return null;
  const element = document.querySelector(target);
  if (!(element instanceof HTMLElement)) return null;

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
};

const fallbackRect = (stepId: string): RectLike | null => {
  if (typeof window === "undefined") return null;

  const width = window.innerWidth;
  const height = window.innerHeight;

  switch (stepId) {
    case "create":
      return {
        top: 86,
        left: 16,
        width: 280,
        height: 48,
      };
    case "canvas":
      return {
        top: 92,
        left: 264,
        width: Math.max(width - 640, 420),
        height: Math.max(height - 156, 320),
      };
    case "console":
      return {
        top: 88,
        left: Math.max(width - 420, width * 0.68),
        width: Math.min(360, width - 32),
        height: Math.max(height - 132, 260),
      };
    default:
      return null;
  }
};

const resolveTargetRect = (step: GuideStep) =>
  rectFromElement(step.target) ?? fallbackRect(step.id);

const getCardPosition = (
  stepId: string,
  targetRect: RectLike | null,
  isMobile: boolean
): CardPosition => {
  if (typeof window === "undefined") {
    return {
      top: 120,
      left: EDGE_GAP,
    };
  }

  if (stepId === "welcome" || isMobile || !targetRect) {
    return {
      top: window.innerHeight / 2,
      left: window.innerWidth / 2,
      transform: "translate(-50%, -50%)",
    };
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const maxLeft = Math.max(EDGE_GAP, viewportWidth - CARD_WIDTH - EDGE_GAP);

  if (stepId === "create") {
    const preferredLeft = targetRect.left + targetRect.width + TOOLTIP_GAP;
    const top = clamp(targetRect.top - 8, 84, viewportHeight - 280);

    if (preferredLeft <= maxLeft) {
      return {
        top,
        left: preferredLeft,
      };
    }

    return {
      top: clamp(targetRect.top + targetRect.height + TOOLTIP_GAP, 96, viewportHeight - 280),
      left: clamp(targetRect.left, EDGE_GAP, maxLeft),
    };
  }

  if (stepId === "canvas") {
    const centeredLeft = clamp(
      targetRect.left + targetRect.width / 2 - CARD_WIDTH / 2,
      EDGE_GAP,
      maxLeft
    );

    return {
      top: clamp(targetRect.top + 36, 96, viewportHeight - 280),
      left: centeredLeft,
    };
  }

  if (stepId === "console") {
    const left = clamp(
      targetRect.left - CARD_WIDTH - TOOLTIP_GAP,
      EDGE_GAP,
      maxLeft
    );
    const top = clamp(targetRect.top + 18, 96, viewportHeight - 280);

    if (targetRect.left - CARD_WIDTH - TOOLTIP_GAP >= EDGE_GAP) {
      return {
        top,
        left,
      };
    }

    return {
      top,
      left: clamp(targetRect.left, EDGE_GAP, maxLeft),
    };
  }

  return {
    top: 120,
    left: EDGE_GAP,
  };
};

export function OnboardingGuide() {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<RectLike | null>(null);

  const steps: GuideStep[] = useMemo(
    () => [
      {
        id: "welcome",
        title: "Welcome to ContextTree",
        message:
          "A visual workspace for building and branching AI conversations. Here's a quick tour to get you oriented.",
        icon: Sparkles,
        accent: "from-indigo-500 to-violet-500",
      },
      {
        id: "create",
        title: "Create new canvases here",
        message:
          "Use the plus button in the workspace sidebar to start a fresh project any time.",
        target: "[data-tour='create-canvas']",
        icon: Layers,
        accent: "from-blue-500 to-indigo-500",
      },
      {
        id: "canvas",
        title: "Map ideas on the canvas",
        message:
          "This is your main workspace. Add nodes, connect branches, and organize context visually here.",
        target: "[data-tour='canvas-surface']",
        icon: GitBranch,
        accent: "from-indigo-500 to-violet-500",
      },
      {
        id: "console",
        title: "Chat from the right-side console",
        message:
          "When you select a node, its conversation opens here so you can prompt, stream, and branch without losing context.",
        target: "[data-tour='right-panel']",
        icon: MessageSquare,
        accent: "from-violet-500 to-fuchsia-500",
      },
    ],
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasSeen = localStorage.getItem(GUIDE_STORAGE_KEY);
    if (hasSeen) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const showWhenReady = () => {
      const hasCanvas = !!document.querySelector("[data-tour='canvas-surface']");
      const hasCreateButton = !!document.querySelector("[data-tour='create-canvas']");

      if (hasCanvas && hasCreateButton) {
        setIsVisible(true);
        return;
      }

      if (attempts < 8) {
        attempts += 1;
        timer = setTimeout(showWhenReady, 250);
        return;
      }

      setIsVisible(true);
    };

    timer = setTimeout(showWhenReady, 900);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const updateTarget = () => {
      setTargetRect(resolveTargetRect(steps[step]));
    };

    updateTarget();

    let frame = 0;
    const onViewportChange = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateTarget);
    };

    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => onViewportChange())
        : null;

    const target = steps[step].target
      ? document.querySelector(steps[step].target)
      : null;

    if (observer && target instanceof HTMLElement) {
      observer.observe(target);
    }

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [isVisible, step, steps]);

  useEffect(() => {
    if (!isVisible) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsVisible(false);
        localStorage.setItem(GUIDE_STORAGE_KEY, "true");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isVisible]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(GUIDE_STORAGE_KEY, "true");
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    handleDismiss();
  };

  if (!isVisible) return null;

  const current = steps[step];
  const Icon = current.icon;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 960;
  const cardPosition = getCardPosition(current.id, targetRect, isMobile);

  return (
    <AnimatePresence>
      <motion.div
        key={current.id}
        className="fixed inset-0 z-[120]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        onMouseDown={stopEvent}
        onClick={stopEvent}
      >
        <div className="absolute inset-0 bg-slate-950/42 backdrop-blur-[2px]" />

        {current.id !== "welcome" && targetRect && (
          <motion.div
            className="pointer-events-none absolute rounded-[22px] border border-white/80 bg-white/8 shadow-[0_0_0_9999px_rgba(15,23,42,0.34)]"
            initial={false}
            animate={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          />
        )}

        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            top: cardPosition.top,
            left: cardPosition.left,
            right: cardPosition.right,
            bottom: cardPosition.bottom,
          }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          style={{
            transform: cardPosition.transform,
            width: isMobile ? "calc(100vw - 32px)" : CARD_WIDTH,
          }}
          className="absolute rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.45)]"
        >
          <div
            className={cn(
              "absolute left-0 right-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r",
              current.accent
            )}
          />

          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm",
                  current.accent
                )}
              >
                <Icon size={14} />
              </div>
              <div>
                <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Step {step + 1} of {steps.length}
                </div>
                <h3 className="text-sm font-semibold leading-tight text-slate-900">
                  {current.title}
                </h3>
              </div>
            </div>

            <button
              onMouseDown={stopEvent}
              onClick={(event) => {
                stopEvent(event);
                handleDismiss();
              }}
              className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>

          <p className="mb-5 text-sm leading-relaxed text-slate-600">
            {current.message}
          </p>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <div className="flex gap-1">
              {steps.map((_, index) => (
                <motion.div
                  key={index}
                  layout
                  className={cn(
                    "h-1.5 rounded-full transition-colors",
                    index === step ? "w-6 bg-slate-900" : "w-1.5 bg-slate-200"
                  )}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onMouseDown={stopEvent}
                onClick={(event) => {
                  stopEvent(event);
                  handleDismiss();
                }}
                className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-700"
              >
                Skip tour
              </button>

              {step > 0 && (
                <button
                  onMouseDown={stopEvent}
                  onClick={(event) => {
                    stopEvent(event);
                    setStep((currentStep) => currentStep - 1);
                  }}
                  className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
                >
                  Back
                </button>
              )}

              <Button
                size="sm"
                onMouseDown={stopEvent}
                onClick={(event) => {
                  stopEvent(event);
                  handleNext();
                }}
                className="h-8 rounded-lg bg-slate-900 px-4 text-xs text-white shadow-sm hover:bg-slate-800"
              >
                {step === steps.length - 1 ? "Finish" : "Next"}
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
