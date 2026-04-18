"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  PanelLeft,
  CheckCircle2,
  Loader2,
  Search,
  Command,
} from "lucide-react";
import UserAuth from "@/components/user-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ContextStripProps {
  canvasName?: string;
  isSynced?: boolean;
  onToggleSidebar?: () => void;
  onOpenSearch?: () => void;
  className?: string;
}

export function ContextStrip({
  canvasName,
  isSynced = true,
  onToggleSidebar,
  onOpenSearch,
  className,
}: ContextStripProps) {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(/Mac|iPhone|iPad/i.test(navigator.platform));
    }
  }, []);

  return (
    <div
      className={cn(
        "h-14 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl flex items-center justify-between px-3 md:px-4 fixed top-0 left-0 right-0 z-50",
        className
      )}
    >
      {/* Subtle gradient underline */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200/80 to-transparent" />

      {/* Left: Sidebar Toggle, App Name, Breadcrumbs */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          onClick={onToggleSidebar}
          title="Toggle Sidebar"
        >
          <PanelLeft size={17} />
        </Button>

        <div className="flex items-center gap-3">
          <a
            href="/"
            className="group flex items-center gap-2 select-none"
          >
            <div className="relative">
              <img
                src="/tree-icon.svg"
                alt="ContextTree"
                className="w-7 h-7 transition-transform duration-300 group-hover:scale-105"
              />
              <div className="pointer-events-none absolute inset-0 rounded-md bg-indigo-400/20 opacity-0 blur-md group-hover:opacity-60 transition-opacity" />
            </div>
            <span className="text-[15px] font-semibold text-slate-900 tracking-tight">
              ContextTree
            </span>
          </a>

          <ChevronRight size={14} className="text-slate-300" />

          <AnimatePresence mode="wait">
            <motion.span
              key={canvasName || "untitled"}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 4 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="text-sm text-slate-600 font-medium truncate max-w-[220px] md:max-w-[320px]"
            >
              {canvasName || "Untitled Canvas"}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* Right: Search shortcut, Sync, User */}
      <div className="flex items-center gap-2 md:gap-3">
        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            className="hidden md:inline-flex items-center gap-2 h-8 rounded-lg border border-slate-200 bg-slate-50/80 pl-2.5 pr-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 hover:border-slate-300 hover:bg-white transition-all"
            title="Quick search"
          >
            <Search size={13} className="text-slate-400" />
            <span>Search</span>
            <span className="ml-3 inline-flex items-center gap-0.5 rounded-md bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
              {isMac ? (
                <Command size={10} />
              ) : (
                <span className="text-[10px]">Ctrl</span>
              )}
              <span>K</span>
            </span>
          </button>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={isSynced ? "synced" : "saving"}
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 2 }}
            transition={{ duration: 0.2 }}
            className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 select-none"
          >
            {isSynced ? (
              <>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                <span className="font-medium">Synced</span>
              </>
            ) : (
              <>
                <Loader2 size={11} className="text-slate-400 animate-spin" />
                <span className="font-medium">Saving…</span>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="hidden sm:block h-4 w-px bg-slate-200" />

        <div className="scale-90 origin-right">
          <UserAuth />
        </div>
      </div>
    </div>
  );
}
