"use client";

import React from "react";
import { ChevronRight, Menu, CheckCircle2, RefreshCw } from "lucide-react";
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
          className="h-9 w-9 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
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
          
          <ChevronRight size={18} className="text-slate-300" />
          
          <span className="text-base text-slate-700 font-medium truncate max-w-[300px]">
            {canvasName || "Untitled Canvas"}
          </span>
        </div>
      </div>

      {/* Right: Sync Status & User */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 select-none">
          {isSynced ? (
            <>
              <CheckCircle2 size={12} className="text-green-500/80" />
              <span>Synced</span>
            </>
          ) : (
            <>
              <RefreshCw size={12} className="text-slate-400 animate-spin" />
              <span>Saving...</span>
            </>
          )}
        </div>
        
        <div className="h-4 w-px bg-slate-200" />
        
        <div className="scale-90 origin-right">
            <UserAuth />
        </div>
      </div>
    </div>
  );
}
