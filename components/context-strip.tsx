"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  PanelLeft,
  Loader2,
  Search,
  Command,
} from "lucide-react";
import UserAuth from "@/components/user-auth";
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
        "h-14 flex items-center justify-between px-3 md:px-4 fixed top-0 left-0 right-0 z-50",
        className
      )}
      style={{
        background: "rgba(251, 249, 244, 0.82)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid var(--at-paper-edge)",
      }}
    >
      {/* Left: sidebar toggle, wordmark, breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          className="atelier-button"
          data-variant="ghost"
          onClick={onToggleSidebar}
          title="Toggle Sidebar"
          style={{ padding: 0, width: 32, height: 32 }}
        >
          <PanelLeft size={16} />
        </button>

        <div className="flex items-center gap-2.5">
          <a href="/" className="group flex items-center gap-2 select-none">
            <img
              src="/tree-icon.svg"
              alt="ContextTree"
              className="w-6 h-6 transition-transform duration-300 group-hover:rotate-[6deg]"
            />
            <span
              style={{
                fontFamily: "var(--at-font-sans)",
                fontWeight: 600,
                fontSize: 15,
                color: "var(--at-ink)",
                letterSpacing: "-0.01em",
              }}
            >
              ContextTree
            </span>
          </a>

          <ChevronRight size={13} style={{ color: "var(--at-paper-edge)" }} />

          <AnimatePresence mode="wait">
            <motion.span
              key={canvasName || "untitled"}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 4 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="truncate max-w-[220px] md:max-w-[320px]"
              style={{
                fontFamily: "var(--at-font-serif)",
                fontStyle: "italic",
                fontSize: 14,
                color: "var(--at-ink-soft)",
              }}
            >
              {canvasName || "Untitled canvas"}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* Right: search · sync · user */}
      <div className="flex items-center gap-2 md:gap-3">
        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            className="atelier-button hidden md:inline-flex"
            style={{
              height: 30,
              paddingTop: 0,
              paddingBottom: 0,
              fontFamily: "var(--at-font-sans)",
            }}
            title="Quick search"
          >
            <Search size={12} style={{ color: "var(--at-ink-muted)" }} />
            <span style={{ color: "var(--at-ink-muted)" }}>Search</span>
            <span
              className="ml-2 inline-flex items-center gap-0.5"
              style={{
                background: "var(--at-paper)",
                border: "1px solid var(--at-paper-edge)",
                borderRadius: "var(--at-radius-sm)",
                padding: "1px 5px",
                fontSize: 10,
                fontFamily: "var(--at-font-mono)",
                color: "var(--at-ink-muted)",
              }}
            >
              {isMac ? <Command size={10} /> : <span>Ctrl</span>}
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
            className="hidden sm:flex items-center gap-1.5 select-none"
            style={{
              fontFamily: "var(--at-font-mono)",
              fontSize: 10.5,
              color: "var(--at-ink-muted)",
            }}
          >
            {isSynced ? (
              <>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "var(--at-moss-soft)" }} />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "var(--at-moss)" }} />
                </span>
                <span>Synced</span>
              </>
            ) : (
              <>
                <Loader2 size={11} className="animate-spin" style={{ color: "var(--at-amber)" }} />
                <span>Saving…</span>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="hidden sm:block h-4 w-px" style={{ background: "var(--at-paper-edge)" }} />

        <div className="scale-90 origin-right">
          <UserAuth />
        </div>
      </div>
    </div>
  );
}
