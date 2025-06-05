"use client";

import { useEffect } from "react";
import { initPerformanceOptimizations } from "@/utils/performance";

export default function PerformanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    initPerformanceOptimizations();
  }, []);

  return <>{children}</>;
}
