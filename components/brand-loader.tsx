"use client";

/**
 * BrandLoader — the tree mark as loading animation (from Brand Loaders.dc.html).
 * Variants map to placements:
 *  draw  — full splash / app launch (mark draws itself top-down)
 *  pulse — skeleton / content placeholders (soft wave down the tree)
 *  flow  — processing / syncing (connectors stream, nodes breathe)
 *  pop   — onboarding / first load (nodes spring in with overshoot)
 *  dots  — buttons / inline "thinking" (dots travel parent → children)
 *  ring  — generic small spinner (static mark, orbiting arc)
 * Color via currentColor; keyframes live in globals.css (brand-*).
 */

import { cn } from "@/lib/utils";

export type BrandLoaderVariant =
  | "draw"
  | "pulse"
  | "flow"
  | "pop"
  | "dots"
  | "ring";

interface BrandLoaderProps {
  variant?: BrandLoaderVariant;
  size?: number;
  className?: string;
  label?: string;
}

const TOP = { x: 35, y: 10, w: 30, h: 20 };
const BRANCHES = "M50 30 L50 45 M35 55 L50 45 L65 55";
const KID_L = { x: 15, y: 65, w: 25, h: 20 };
const KID_R = { x: 60, y: 65, w: 25, h: 20 };

function TreePaths({ styles }: { styles: Record<string, React.CSSProperties> }) {
  return (
    <>
      <rect
        x={TOP.x} y={TOP.y} width={TOP.w} height={TOP.h} rx={4}
        pathLength={1} fill="none" stroke="currentColor" strokeWidth={3}
        style={styles.top}
      />
      <path
        d={BRANCHES} pathLength={1} fill="none" stroke="currentColor"
        strokeWidth={3} strokeLinecap="round" style={styles.line}
      />
      <rect
        x={KID_L.x} y={KID_L.y} width={KID_L.w} height={KID_L.h} rx={4}
        pathLength={1} fill="none" stroke="currentColor" strokeWidth={3}
        style={styles.kidL}
      />
      <rect
        x={KID_R.x} y={KID_R.y} width={KID_R.w} height={KID_R.h} rx={4}
        pathLength={1} fill="none" stroke="currentColor" strokeWidth={3}
        style={styles.kidR}
      />
    </>
  );
}

const springEase = "cubic-bezier(.34,1.4,.64,1)";

export function BrandLoader({
  variant = "ring",
  size = 24,
  className,
  label = "Loading",
}: BrandLoaderProps) {
  const common = { width: size, height: size, viewBox: "0 0 100 100" };

  let body: React.ReactNode;
  switch (variant) {
    case "draw":
      body = (
        <svg {...common} aria-hidden>
          <TreePaths
            styles={{
              top: { strokeDasharray: 1, animation: "brand-draw-top 2.6s ease-in-out infinite" },
              line: { strokeDasharray: 1, animation: "brand-draw-line 2.6s ease-in-out infinite" },
              kidL: { strokeDasharray: 1, animation: "brand-draw-kids 2.6s ease-in-out infinite" },
              kidR: { strokeDasharray: 1, animation: "brand-draw-kids 2.6s ease-in-out infinite" },
            }}
          />
        </svg>
      );
      break;
    case "pulse":
      body = (
        <svg {...common} aria-hidden>
          <TreePaths
            styles={{
              top: { animation: "brand-node-pulse 1.5s ease-in-out infinite" },
              line: { animation: "brand-node-pulse 1.5s ease-in-out .25s infinite" },
              kidL: { animation: "brand-node-pulse 1.5s ease-in-out .5s infinite" },
              kidR: { animation: "brand-node-pulse 1.5s ease-in-out .5s infinite" },
            }}
          />
        </svg>
      );
      break;
    case "flow":
      body = (
        <svg {...common} aria-hidden>
          <TreePaths
            styles={{
              top: { animation: "brand-breathe 2s ease-in-out infinite" },
              line: { strokeDasharray: "6 6", animation: "brand-dash-flow 1s linear infinite" },
              kidL: { animation: "brand-breathe 2s ease-in-out 1s infinite" },
              kidR: { animation: "brand-breathe 2s ease-in-out 1s infinite" },
            }}
          />
        </svg>
      );
      break;
    case "pop":
      body = (
        <svg {...common} aria-hidden>
          <TreePaths
            styles={{
              top: {
                transformBox: "fill-box", transformOrigin: "center",
                animation: `brand-pop-top 2.2s ${springEase} infinite`,
              },
              line: { animation: "brand-pop-line 2.2s ease infinite" },
              kidL: {
                transformBox: "fill-box", transformOrigin: "center",
                animation: `brand-pop-kid-l 2.2s ${springEase} infinite`,
              },
              kidR: {
                transformBox: "fill-box", transformOrigin: "center",
                animation: `brand-pop-kid-r 2.2s ${springEase} infinite`,
              },
            }}
          />
        </svg>
      );
      break;
    case "dots":
      body = (
        <svg {...common} aria-hidden>
          <g opacity={0.25}>
            <TreePaths styles={{}} />
          </g>
          <circle r={3.5} fill="currentColor">
            <animateMotion
              dur="1.4s"
              repeatCount="indefinite"
              path="M50 30 L50 45 L35 55 L27.5 65"
            />
          </circle>
          <circle r={3.5} fill="currentColor">
            <animateMotion
              dur="1.4s"
              begin="0.7s"
              repeatCount="indefinite"
              path="M50 30 L50 45 L65 55 L72.5 65"
            />
          </circle>
        </svg>
      );
      break;
    case "ring":
    default:
      body = (
        <svg {...common} aria-hidden>
          <g style={{ transformOrigin: "50px 50px", animation: "brand-ring-spin 1.2s linear infinite" }}>
            <circle
              cx={50} cy={50} r={46} fill="none" stroke="currentColor"
              strokeWidth={3} strokeLinecap="round"
              strokeDasharray="80 209" opacity={0.9}
            />
          </g>
          <g transform="translate(21,21) scale(0.58)">
            <TreePaths styles={{}} />
          </g>
        </svg>
      );
      break;
  }

  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-flex items-center justify-center text-primary", className)}
    >
      {body}
    </span>
  );
}
