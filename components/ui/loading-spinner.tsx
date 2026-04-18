import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  text,
  className,
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: { ring: "h-4 w-4", border: "border-[1.5px]", dot: "h-0.5 w-0.5" },
    md: { ring: "h-8 w-8", border: "border-2", dot: "h-1 w-1" },
    lg: { ring: "h-12 w-12", border: "border-[2.5px]", dot: "h-1.5 w-1.5" },
  };

  const { ring, border, dot } = sizeMap[size];

  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-4", className)}
    >
      <div className="relative">
        {/* Ambient glow */}
        <div
          className={cn(
            ring,
            "absolute inset-0 rounded-full bg-indigo-500/10 blur-md animate-pulse"
          )}
        />
        {/* Track ring */}
        <div
          className={cn(ring, border, "rounded-full border-slate-200 relative")}
        />
        {/* Primary spinning arc */}
        <div
          className={cn(
            ring,
            border,
            "absolute inset-0 rounded-full border-transparent border-t-slate-900 border-r-slate-900 animate-spin"
          )}
        />
        {/* Secondary soft arc */}
        <div
          className={cn(
            ring,
            border,
            "absolute inset-0 rounded-full border-transparent border-t-indigo-400 animate-spin-slow"
          )}
        />
        {/* Center pulse dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(dot, "rounded-full bg-slate-900 animate-pulse")}
          />
        </div>
      </div>
      {text && (
        <p className="text-sm font-medium text-slate-500 tracking-tight">
          {text}
        </p>
      )}
    </div>
  );
}
