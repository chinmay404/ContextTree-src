import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export function LoadingSpinner({ size = "md", text, className }: LoadingSpinnerProps) {
  const sizeMap = {
    sm: { ring: "h-4 w-4", border: "border-[1.5px]" },
    md: { ring: "h-7 w-7", border: "border-2" },
    lg: { ring: "h-10 w-10", border: "border-2" },
  };

  const { ring, border } = sizeMap[size];

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div className="relative">
        {/* Track ring */}
        <div className={cn(ring, border, "rounded-full border-slate-200")} />
        {/* Spinning arc */}
        <div
          className={cn(
            ring,
            border,
            "absolute inset-0 rounded-full border-transparent border-t-slate-900 animate-spin"
          )}
        />
      </div>
      {text && (
        <p className="text-sm font-medium text-slate-500 tracking-tight">{text}</p>
      )}
    </div>
  );
}
