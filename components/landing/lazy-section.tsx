"use client";

import { Suspense, lazy } from "react";
import { motion } from "framer-motion";

interface LazySectionProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export default function LazySection({
  children,
  fallback,
  className,
}: LazySectionProps) {
  const defaultFallback = (
    <div
      className={`flex items-center justify-center py-20 ${className || ""}`}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
      />
    </div>
  );

  return <Suspense fallback={fallback || defaultFallback}>{children}</Suspense>;
}
