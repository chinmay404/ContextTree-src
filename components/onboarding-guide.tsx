"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, MousePointerClick, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function OnboardingGuide() {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Check if user has already completed the guide
    const hasSeen = localStorage.getItem("context-tree-guide-completed");
    if (!hasSeen) {
      // Small delay to let the UI load first
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

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

  const steps = [
    {
      id: "welcome",
      title: "Welcome to ContextTree",
      message: "This is your workspace for building advanced conversational flows with AI. Let's take a quick look around.",
      targetClass: "fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] z-[100]",
      cardWidth: "max-w-md",
      showArrow: false,
    },
    {
      id: "create",
      title: "1. Manage Workspaces",
      message: "Your project list lives here. Click the '+' button to create a new semantic canvas for a new flow.",
      targetClass: "fixed top-[70px] left-[260px] z-[100]",
      cardWidth: "w-72",
      arrow: "left"
    },
    {
      id: "canvas",
      title: "2. Build Your Flow",
      message: "This is your infinite canvas. Right-click anywhere to open the Node Palette and add Start, Branch, or Context nodes.",
      targetClass: "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100]",
      cardWidth: "w-72",
      arrow: "none" 
    },
    {
      id: "console",
      title: "3. Contextual Console",
      message: "Select any node to reveal this panel. It's where you define prompts, run AI models, and inspect the conversation history.",
      targetClass: "fixed top-[70px] right-[80px] z-[100]", // Positioned to point somewhat towards the right panel area
      cardWidth: "w-80",
      arrow: "right"
    }
  ];

  const current = steps[step];

  return (
    <div className={cn("transition-all duration-500 ease-in-out", current.targetClass)}>
      {/* Optional: Spotlight effect could go here, but keeping it minimal as requested */}
      
      <div className={cn(
        "bg-white border border-slate-200 shadow-2xl rounded-xl p-5 relative animate-in fade-in zoom-in-95 duration-300",
        current.cardWidth
      )}>
        {/* Arrow Logic */}
        {current.arrow === "left" && (
           <div className="absolute top-6 -left-2 w-4 h-4 bg-white border-l border-b border-slate-200 transform rotate-45" />
        )}
        {current.arrow === "right" && (
           <div className="absolute top-6 -right-2 w-4 h-4 bg-white border-r border-t border-slate-200 transform rotate-45" />
        )}

        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
             <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold ring-1 ring-indigo-100">
                {step + 1}
             </div>
             <h3 className="font-semibold text-slate-900 text-sm">{current.title}</h3>
          </div>
          <button 
            onClick={handleDismiss} 
            className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded transition-colors"
          >
             <X size={14} />
          </button>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed mb-6 font-normal">
          {current.message}
        </p>

        <div className="flex justify-between items-center pt-2 border-t border-slate-100/60">
           <div className="flex gap-1.5">
             {steps.map((_, i) => (
               <div 
                 key={i} 
                 className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all duration-300", 
                    i === step ? "bg-indigo-600 w-3" : "bg-slate-200"
                 )} 
               />
             ))}
           </div>
           
           <Button 
             size="sm" 
             onClick={handleNext} 
             className="h-8 text-xs bg-indigo-700 hover:bg-indigo-800 text-white shadow-sm hover:shadow px-4 rounded-lg"
           >
             {step === steps.length - 1 ? "Get Started" : "Next"} 
             {step < steps.length - 1 && <ChevronRight size={12} className="ml-1" />}
           </Button>
        </div>
      </div>
    </div>
  );
}
