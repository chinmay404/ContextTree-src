"use client";

import type React from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitBranch,
  FileText,
  Plus,
  Group,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const nodeTypes = [
  {
    id: "branch",
    label: "Branch",
    icon: GitBranch,
    color:
      "bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-sm",
  },
  {
    id: "context",
    label: "Context",
    icon: FileText,
    color:
      "bg-gradient-to-br from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white shadow-sm",
  },
  {
    id: "group",
    label: "Group Box",
    icon: Group,
    color:
      "bg-gradient-to-br from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white shadow-sm",
  },
];

export function NodePalette() {
  const [isExpanded, setIsExpanded] = useState(false);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="relative">
      {/* Main Toggle Button */}
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-12 h-12 rounded-2xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg hover:shadow-xl transition-all duration-300 text-slate-600 hover:text-slate-900 hover:bg-white hover:scale-105"
        size="sm"
      >
        <motion.div
          animate={{ rotate: isExpanded ? 45 : 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <Plus size={20} />
        </motion.div>
      </Button>

      {/* Expanded Palette */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="absolute bottom-16 right-0"
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="bg-white/98 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-2xl p-3">
              <div className="flex flex-col gap-2">
                {nodeTypes.map((nodeType, index) => {
                  const Icon = nodeType.icon;
                  return (
                    <motion.div
                      key={nodeType.id}
                      draggable
                      onDragStart={(event) => onDragStart(event, nodeType.id)}
                      className={`w-11 h-11 rounded-xl cursor-move transition-all duration-200 ease-out flex items-center justify-center shadow-md hover:shadow-lg hover:scale-110 active:scale-95 ${nodeType.color}`}
                      title={nodeType.label}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.04, duration: 0.15 }}
                    >
                      <Icon size={18} strokeWidth={2} />
                    </motion.div>
                  );
                })}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200/50">
                <p className="text-[10px] text-slate-400 text-center font-medium tracking-wide uppercase">
                  Drag to canvas
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
}
