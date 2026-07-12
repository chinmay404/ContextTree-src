"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  PanelLeft,
  Search,
  Command,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import UserAuth from "@/components/user-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ContextStripProps {
  canvasName?: string;
  onToggleSidebar?: () => void;
  onOpenSearch?: () => void;
  className?: string;
}

export function ContextStrip({
  canvasName,
  onToggleSidebar,
  onOpenSearch,
  className,
}: ContextStripProps) {
  const [isMac, setIsMac] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    if (typeof navigator !== "undefined") {
      setIsMac(/Mac|iPhone|iPad/i.test(navigator.platform));
    }
  }, []);

  return (
    <div
      className={cn(
        "fixed left-0 right-0 top-0 z-50 h-14 border-b border-border bg-card px-3 md:px-4",
        className
      )}
    >
      <div className="grid h-full grid-cols-[minmax(0,1fr)_minmax(0,420px)_auto] items-center gap-3">
        {/* Left: Sidebar Toggle, App Name, Breadcrumbs */}
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={onToggleSidebar}
            title="Toggle Sidebar"
          >
            <PanelLeft size={17} />
          </Button>

          <div className="flex min-w-0 items-center gap-3">
            <a href="/" className="group flex items-center gap-2 select-none">
              <div className="relative">
                <img
                  src="/tree-icon.svg"
                  alt="ContextTree"
                  className="h-7 w-7 transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <span className="text-[15px] font-semibold tracking-tight text-foreground">
                ContextTree
              </span>
            </a>

            <ChevronRight size={14} className="shrink-0 text-muted-foreground" />

            <AnimatePresence mode="wait">
              <motion.span
                key={canvasName || "untitled"}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 4 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="truncate text-sm font-medium text-muted-foreground"
              >
                {canvasName || "Untitled Canvas"}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        {/* Center: Search */}
        {onOpenSearch && (
          <div className="hidden md:flex md:justify-center">
            <button
              type="button"
              onClick={onOpenSearch}
              className="inline-flex h-9 w-full max-w-[420px] items-center gap-2 rounded-xl border border-border bg-muted px-3 text-sm font-medium text-muted-foreground transition-all hover:border-border hover:bg-accent hover:text-foreground"
              title="Quick search"
            >
              <Search size={14} className="text-muted-foreground" />
              <span className="flex-1 text-left">Search canvases, nodes, and messages</span>
              <span className="inline-flex items-center gap-0.5 rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                {isMac ? <Command size={10} /> : <span className="text-[10px]">Ctrl</span>}
                <span>K</span>
              </span>
            </button>
          </div>
        )}

        {/* Right: Feedback, mobile search, user */}
        <div className="flex items-center justify-end gap-2">
          {onOpenSearch ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onOpenSearch}
              className="h-9 w-9 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
              title="Quick search"
            >
              <Search className="h-4 w-4" />
            </Button>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="h-9 w-9 text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Toggle theme"
          >
            {mounted ? (
              theme === "light" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )
            ) : null}
          </Button>

          <div className="origin-right scale-90">
            <UserAuth />
          </div>
        </div>
      </div>
    </div>
  );
}
