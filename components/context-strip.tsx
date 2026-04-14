"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Menu, CheckCircle2, Loader2 } from "lucide-react";
import UserAuth from "@/components/user-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ContextStripProps {
  canvasName?: string;
  isSynced?: boolean;
  onToggleSidebar?: () => void;
  className?: string;
}

export function ContextStrip({
  canvasName,
  isSynced = true,
  onToggleSidebar,
  className,
}: ContextStripProps) {
  return (
    <div className={cn("h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-50", className)}>
      {/* Left: Sidebar Toggle, App Name, Breadcrumbs */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          onClick={onToggleSidebar}
          title="Toggle Sidebar"
        >
          <Menu size={20} />
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <img src="/tree-icon.svg" alt="ContextTree" className="w-8 h-8" />
            <span className="text-lg font-bold text-slate-900 tracking-tight">ContextTree</span>
          </div>

          <ChevronRight size={16} className="text-slate-300" />

          <AnimatePresence mode="wait">
            <motion.span
              key={canvasName || "untitled"}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 4 }}
              transition={{ duration: 0.15 }}
              className="text-sm text-slate-600 font-medium truncate max-w-[300px]"
            >
              {canvasName || "Untitled Canvas"}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* Right: Sync Status & User */}
      <div className="flex items-center gap-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={isSynced ? "synced" : "saving"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1.5 text-xs text-slate-400 select-none"
          >
            {isSynced ? (
              <>
                <CheckCircle2 size={12} className="text-emerald-500/80" />
                <span>Synced</span>
              </>
            ) : (
              <>
                <Loader2 size={12} className="text-slate-400 animate-spin" />
                <span>Saving...</span>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="h-4 w-px bg-slate-200" />

        <div className="scale-90 origin-right">
            <UserAuth />
        </div>
      </div>
    </div>
  );
}
