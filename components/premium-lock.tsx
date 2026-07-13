import type { ReactNode } from "react";

import { Lock } from "lucide-react";

// Wraps premium-only UI. When `locked`, the children are shown but greyed and
// non-interactive, under an "Unlock with Founding" overlay — the money-honest
// "show what you're missing" pattern (design principle: never hide the value).
export function PremiumLock({ locked, children }: { locked: boolean; children: ReactNode }) {
  if (!locked) return <>{children}</>;
  return (
    <div className="relative">
      <div aria-disabled className="pointer-events-none select-none opacity-40">
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-card/50 backdrop-blur-[1px]">
        <span className="flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 type-meta text-primary">
          <Lock size={12} strokeWidth={2} />
          Unlock with Founding
        </span>
      </div>
    </div>
  );
}
