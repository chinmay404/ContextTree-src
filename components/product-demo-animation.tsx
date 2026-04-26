"use client";

import React, { useEffect, useRef, useState } from "react";

const STAGE_WIDTH = 1920;
const STAGE_HEIGHT = 1080;
const DURATION = 12;

const COLORS = {
  bg: "oklch(0.992 0.002 250)",
  panel: "#ffffff",
  border: "oklch(0.92 0.005 250)",
  borderSoft: "oklch(0.95 0.004 250)",
  text: "oklch(0.22 0.01 260)",
  textDim: "oklch(0.50 0.01 260)",
  textFaint: "oklch(0.70 0.008 260)",
  accent: "oklch(0.55 0.17 268)",
  accentSoft: "oklch(0.95 0.03 268)",
  accentLine: "oklch(0.70 0.12 268)",
  userBubble: "oklch(0.96 0.005 260)",
  aiBubble: "#ffffff",
};

const FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
const MONO = 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace';

const Easing = {
  linear: (t: number) => t,
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => --t * t * t + 1,
  easeInOutCubic: (t: number) =>
    t < 0.5
      ? 4 * t * t * t
      : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeOutBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

function interpolate(
  input: number[],
  output: number[],
  ease: (t: number) => number = Easing.linear,
) {
  return (time: number) => {
    if (time <= input[0]) return output[0];
    if (time >= input[input.length - 1]) return output[output.length - 1];

    for (let i = 0; i < input.length - 1; i++) {
      if (time >= input[i] && time <= input[i + 1]) {
        const span = input[i + 1] - input[i];
        const local = span === 0 ? 0 : (time - input[i]) / span;
        const eased = ease(local);
        return output[i] + (output[i + 1] - output[i]) * eased;
      }
    }

    return output[output.length - 1];
  };
}

function fadeIn(
  time: number,
  start: number,
  duration = 0.4,
  ease: (t: number) => number = Easing.easeOutCubic,
) {
  if (time <= start) return 0;
  if (time >= start + duration) return 1;
  return ease((time - start) / duration);
}

function fadeOut(
  time: number,
  start: number,
  duration = 0.4,
  ease: (t: number) => number = Easing.easeInCubic,
) {
  if (time <= start) return 1;
  if (time >= start + duration) return 0;
  return 1 - ease((time - start) / duration);
}

function window01(
  time: number,
  start: number,
  end: number,
  fadeInDuration = 0.3,
  fadeOutDuration = 0.3,
) {
  const entry = fadeIn(time, start, fadeInDuration);
  const exit = fadeOut(time, end - fadeOutDuration, fadeOutDuration);
  return Math.min(entry, exit);
}

const TimelineContext = React.createContext({ time: 0 });
const useTime = () => React.useContext(TimelineContext).time;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

function ResponsiveStage({ children }: React.PropsWithChildren) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [time, setTime] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const resize = () =>
      setSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setTime(9.8);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();

    const tick = (now: number) => {
      setTime(((now - startedAt) / 1000) % DURATION);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion]);

  const scale = size.width
    ? Math.min(size.width / STAGE_WIDTH, size.height / STAGE_HEIGHT)
    : 1;
  const left = (size.width - STAGE_WIDTH * scale) / 2;
  const top = (size.height - STAGE_HEIGHT * scale) / 2;

  return (
    <div
      ref={ref}
      className="relative aspect-video w-full overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.28)]"
      aria-label="Animated product demo showing a linear AI chat becoming a branching ContextTree canvas"
    >
      <TimelineContext.Provider value={{ time }}>
        <div
          style={{
            position: "absolute",
            left,
            top,
            width: STAGE_WIDTH,
            height: STAGE_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            background: COLORS.bg,
            overflow: "hidden",
          }}
        >
          {children}
        </div>
      </TimelineContext.Provider>
    </div>
  );
}

function GridDots({ opacity = 1, x = 0, y = 0 }) {
  const dots = [];
  const step = 32;

  for (let i = 0; i < 60; i++) {
    for (let j = 0; j < 36; j++) {
      dots.push(
        <circle
          key={`${i}-${j}`}
          cx={i * step}
          cy={j * step}
          r={1.1}
          fill="oklch(0.86 0.005 260)"
        />,
      );
    }
  }

  return (
    <svg
      width={1920}
      height={1152}
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity,
        pointerEvents: "none",
      }}
    >
      {dots}
    </svg>
  );
}

function AppChrome({ children, title = "ContextTree" }: React.PropsWithChildren<{ title?: string }>) {
  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        top: 60,
        width: 1760,
        height: 960,
        background: COLORS.panel,
        borderRadius: 14,
        border: `1px solid ${COLORS.border}`,
        boxShadow:
          "0 24px 60px rgba(20, 24, 50, 0.10), 0 2px 6px rgba(20, 24, 50, 0.04)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          height: 44,
          borderBottom: `1px solid ${COLORS.borderSoft}`,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 10,
          background: "oklch(0.985 0.003 250)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 5, background: "oklch(0.88 0.005 30)" }} />
          <div style={{ width: 10, height: 10, borderRadius: 5, background: "oklch(0.88 0.005 90)" }} />
          <div style={{ width: 10, height: 10, borderRadius: 5, background: "oklch(0.88 0.005 150)" }} />
        </div>
        <div
          style={{
            flex: 1,
            textAlign: "center",
            fontFamily: FONT,
            fontSize: 13,
            color: COLORS.textDim,
            fontWeight: 500,
          }}
        >
          <span style={{ color: COLORS.text, fontWeight: 600 }}>{title}</span>
          <span style={{ color: COLORS.textFaint }}> / DFS vs BFS</span>
        </div>
        <div style={{ width: 60 }} />
      </div>
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

function ChatMessage({
  role,
  children,
  x,
  y,
  width,
  opacity = 1,
  scale = 1,
  ty = 0,
}: React.PropsWithChildren<{
  role: "user" | "ai";
  x: number;
  y: number;
  width: number;
  opacity?: number;
  scale?: number;
  ty?: number;
}>) {
  const isUser = role === "user";

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        opacity,
        transform: `translateY(${ty}px) scale(${scale})`,
        transformOrigin: "left top",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: FONT,
          fontSize: 12,
          color: COLORS.textDim,
          fontWeight: 500,
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 5,
            background: isUser ? COLORS.userBubble : COLORS.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isUser ? COLORS.text : "#fff",
            fontSize: 10,
            fontWeight: 700,
            fontFamily: MONO,
            border: isUser ? `1px solid ${COLORS.border}` : "none",
          }}
        >
          {isUser ? "U" : "*"}
        </div>
        <span>{isUser ? "You" : "Assistant"}</span>
      </div>
      <div
        style={{
          background: isUser ? COLORS.userBubble : COLORS.aiBubble,
          border: `1px solid ${isUser ? COLORS.border : COLORS.borderSoft}`,
          borderRadius: 10,
          padding: "12px 16px",
          fontFamily: FONT,
          fontSize: 15,
          lineHeight: 1.55,
          color: COLORS.text,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function TextLine({
  width,
  opacity = 1,
  color = COLORS.text,
}: {
  width: number;
  opacity?: number;
  color?: string;
}) {
  return (
    <div
      style={{
        height: 9,
        width,
        background: color,
        opacity,
        borderRadius: 3,
        marginBottom: 8,
      }}
    />
  );
}

function LinearChat() {
  const t = useTime();
  const chatOpacity = fadeOut(t, 5.6, 0.7);
  const driftFade = fadeIn(t, 3.0, 1.5);
  const m1 = fadeIn(t, 0.2, 0.4);
  const m2 = fadeIn(t, 0.7, 0.45);
  const m3 = fadeIn(t, 1.6, 0.4);
  const m4 = fadeIn(t, 2.0, 0.45);
  const m5 = fadeIn(t, 2.7, 0.4);
  const m6 = fadeIn(t, 3.1, 0.45);
  const scrollY = interpolate(
    [0, 1.5, 2.5, 3.3, 4.5],
    [0, -20, -60, -110, -150],
    Easing.easeInOutCubic,
  )(t);
  const olderFade = 1 - 0.55 * driftFade;
  const hoverFade = fadeIn(t, 3.8, 0.3);
  const selectPulse = window01(t, 4.0, 5.4, 0.2, 0.4);
  const btnIn = fadeIn(t, 4.2, 0.35, Easing.easeOutBack);
  const btnPress = window01(t, 4.85, 5.0, 0.05, 0.1);
  const exitT = fadeIn(t, 5.5, 0.7, Easing.easeInOutCubic);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: chatOpacity,
        transform: `scale(${1 - 0.06 * exitT})`,
        transformOrigin: "50% 40%",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 240,
          borderRight: `1px solid ${COLORS.borderSoft}`,
          background: "oklch(0.992 0.002 250)",
          padding: "20px 16px",
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 11,
            color: COLORS.textFaint,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 600,
            marginBottom: 14,
          }}
        >
          Conversations
        </div>
        <div
          style={{
            background: COLORS.accentSoft,
            borderRadius: 6,
            padding: "8px 10px",
            fontFamily: FONT,
            fontSize: 13,
            color: COLORS.text,
            fontWeight: 500,
            marginBottom: 4,
          }}
        >
          DFS vs BFS
        </div>
        {["API rate limiting", "React memo patterns", "SQL window funcs", "Postgres indexes"].map(
          (label) => (
            <div
              key={label}
              style={{
                padding: "8px 10px",
                fontFamily: FONT,
                fontSize: 13,
                color: COLORS.textDim,
              }}
            >
              {label}
            </div>
          ),
        )}
      </div>

      <div style={{ position: "absolute", left: 240, top: 0, right: 0, bottom: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: scrollY + 40, padding: "0 80px" }}>
          <div style={{ position: "relative", height: 88, marginBottom: 18, opacity: olderFade }}>
            <ChatMessage role="user" x={0} y={0} width={760} opacity={m1} ty={(1 - m1) * 12}>
              What's the difference between DFS and BFS?
            </ChatMessage>
          </div>

          <div
            style={{
              position: "relative",
              height: 196,
              marginBottom: 18,
              opacity: m2,
              transform: `translateY(${(1 - m2) * 12}px)`,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: -10,
                top: -10,
                width: 800,
                height: 196,
                background: COLORS.accentSoft,
                border: `1.5px solid ${COLORS.accent}`,
                borderRadius: 12,
                opacity: hoverFade * (0.6 + 0.4 * selectPulse),
                boxShadow: `0 0 0 4px oklch(0.95 0.04 268 / ${0.5 * selectPulse})`,
              }}
            />
            <ChatMessage role="ai" x={0} y={0} width={780}>
              <TextLine width={680} />
              <TextLine width={720} />
              <TextLine width={640} />
              <TextLine width={700} />
              <TextLine width={420} />
              <div style={{ height: 10 }} />
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 12,
                  color: COLORS.textDim,
                  background: "oklch(0.97 0.003 260)",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: `1px solid ${COLORS.borderSoft}`,
                  width: "fit-content",
                }}
              >
                DFS: stack / BFS: queue
              </div>
            </ChatMessage>
            <div
              style={{
                position: "absolute",
                right: 18,
                top: 14,
                opacity: btnIn,
                transform: `translateY(${(1 - btnIn) * 6}px) scale(${1 - 0.04 * btnPress})`,
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 12px",
                background: COLORS.panel,
                border: `1px solid ${COLORS.accent}`,
                borderRadius: 7,
                fontFamily: FONT,
                fontSize: 12,
                fontWeight: 600,
                color: COLORS.accent,
                boxShadow: `0 4px 12px oklch(0.55 0.17 268 / ${0.18 + 0.2 * btnPress})`,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="3" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                <circle cx="9" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                <circle cx="6" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                <path
                  d="M6 7.5V6 M6 6 H3.6 V4.2 M6 6 H8.4 V4.2"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
              Branch
            </div>
          </div>

          <div style={{ position: "relative", height: 76, marginBottom: 18, opacity: olderFade }}>
            <ChatMessage role="user" x={0} y={0} width={620} opacity={m3} ty={(1 - m3) * 12}>
              Show Python code
            </ChatMessage>
          </div>
          <div
            style={{
              position: "relative",
              height: 168,
              marginBottom: 18,
              opacity: m4 * olderFade,
              transform: `translateY(${(1 - m4) * 12}px)`,
            }}
          >
            <ChatMessage role="ai" x={0} y={0} width={780}>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 12.5,
                  color: COLORS.text,
                  background: "oklch(0.97 0.003 260)",
                  padding: "12px 14px",
                  borderRadius: 6,
                  border: `1px solid ${COLORS.borderSoft}`,
                  lineHeight: 1.7,
                }}
              >
                <div>def dfs(graph, start):</div>
                <div>&nbsp;&nbsp;stack, seen = [start], set()</div>
                <div>&nbsp;&nbsp;while stack:</div>
                <div>&nbsp;&nbsp;&nbsp;&nbsp;node = stack.pop()</div>
              </div>
            </ChatMessage>
          </div>

          <div style={{ position: "relative", height: 76, marginBottom: 18, opacity: olderFade }}>
            <ChatMessage role="user" x={0} y={0} width={580} opacity={m5} ty={(1 - m5) * 12}>
              What about memory usage?
            </ChatMessage>
          </div>
          <div
            style={{
              position: "relative",
              height: 130,
              marginBottom: 18,
              opacity: m6 * olderFade,
              transform: `translateY(${(1 - m6) * 12}px)`,
            }}
          >
            <ChatMessage role="ai" x={0} y={0} width={780}>
              <TextLine width={650} />
              <TextLine width={720} />
              <TextLine width={580} />
              <TextLine width={400} />
            </ChatMessage>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 80,
            background: `linear-gradient(180deg, ${COLORS.panel} 0%, transparent 100%)`,
            pointerEvents: "none",
            opacity: 0.7 + 0.3 * driftFade,
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 80,
            right: 80,
            bottom: 36,
            height: 56,
            background: COLORS.panel,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            padding: "0 18px",
            gap: 12,
            boxShadow: "0 2px 8px rgba(20,24,50,0.04)",
          }}
        >
          <div style={{ fontFamily: FONT, fontSize: 14, color: COLORS.textFaint, flex: 1 }}>
            Ask a follow-up...
          </div>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 7,
              background: COLORS.accentSoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M2 7h10M8 3l4 4-4 4"
                stroke={COLORS.accent}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function NodeCard({
  x,
  y,
  width,
  height,
  title,
  subtitle,
  body = [],
  accent,
  opacity = 1,
  scale = 1,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  subtitle: string;
  body?: Array<{ w: number }>;
  accent?: boolean;
  opacity?: number;
  scale?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        background: COLORS.panel,
        border: `1px solid ${accent ? COLORS.accent : COLORS.border}`,
        borderRadius: 10,
        boxShadow: accent
          ? "0 8px 24px oklch(0.55 0.17 268 / 0.16), 0 2px 6px rgba(20,24,50,0.06)"
          : "0 4px 14px rgba(20,24,50,0.06)",
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: "center",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          height: 28,
          borderBottom: `1px solid ${COLORS.borderSoft}`,
          background: accent ? COLORS.accentSoft : "oklch(0.985 0.003 250)",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 6,
          flexShrink: 0,
        }}
      >
        <div style={{ width: 6, height: 6, borderRadius: 3, background: accent ? COLORS.accent : COLORS.textFaint }} />
        <div
          style={{
            fontFamily: MONO,
            fontSize: 10.5,
            color: accent ? COLORS.accent : COLORS.textDim,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontWeight: 600,
          }}
        >
          {subtitle}
        </div>
      </div>
      <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontFamily: FONT,
            fontSize: 17,
            fontWeight: 600,
            color: COLORS.text,
            marginBottom: 12,
          }}
        >
          {title}
        </div>
        {body.map((item, index) => (
          <TextLine key={index} width={item.w} color={COLORS.textFaint} />
        ))}
      </div>
    </div>
  );
}

function BranchNode({
  x,
  y,
  width,
  height,
  title,
  kind,
  codeLines = [],
  textLines = [],
  progress,
  tagOpacity,
  tagLabel,
  tagColor,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  kind: "code" | "text";
  codeLines?: string[];
  textLines?: number[];
  progress: number;
  tagOpacity: number;
  tagLabel: string;
  tagColor: string;
}) {
  if (progress <= 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        background: COLORS.panel,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        boxShadow: "0 6px 18px rgba(20,24,50,0.06), 0 1px 3px rgba(20,24,50,0.04)",
        opacity: Math.min(1, progress * 1.4),
        transform: `scale(${0.85 + 0.15 * progress})`,
        transformOrigin: "left center",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          height: 32,
          borderBottom: `1px solid ${COLORS.borderSoft}`,
          background: "oklch(0.99 0.002 250)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          flexShrink: 0,
        }}
      >
        <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.text }}>
          {title}
        </div>
        <div
          style={{
            opacity: tagOpacity,
            transform: `scale(${0.9 + 0.1 * tagOpacity})`,
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "3px 8px",
            background: COLORS.panel,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 4,
            fontFamily: MONO,
            fontSize: 10,
            fontWeight: 600,
            color: COLORS.textDim,
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: 3, background: tagColor }} />
          {tagLabel}
        </div>
      </div>
      <div style={{ padding: "12px 14px", flex: 1 }}>
        {kind === "code" ? (
          <div
            style={{
              fontFamily: MONO,
              fontSize: 11.5,
              color: COLORS.text,
              background: "oklch(0.97 0.003 260)",
              padding: "10px 12px",
              borderRadius: 5,
              border: `1px solid ${COLORS.borderSoft}`,
              lineHeight: 1.7,
            }}
          >
            {codeLines.map((line, index) => (
              <div
                key={line}
                style={{
                  opacity: progress > 0.5 + index * 0.1 ? 1 : 0,
                  transition: "opacity 200ms",
                }}
              >
                {line}
              </div>
            ))}
          </div>
        ) : (
          <div>
            {textLines.map((widthValue, index) => (
              <div
                key={widthValue}
                style={{
                  opacity: progress > 0.5 + index * 0.08 ? 1 : 0,
                  transition: "opacity 200ms",
                }}
              >
                <TextLine width={widthValue} color={COLORS.textFaint} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BranchingCanvas() {
  const t = useTime();
  const canvasIn = fadeIn(t, 5.9, 0.7, Easing.easeOutCubic);
  if (canvasIn <= 0) return null;

  const rootIn = fadeIn(t, 6.1, 0.5, Easing.easeOutBack);
  const branchProgress = (start: number) => fadeIn(t, start, 0.7, Easing.easeOutCubic);
  const b1 = branchProgress(7.0);
  const b2 = branchProgress(7.4);
  const b3 = branchProgress(7.8);
  const tag1 = fadeIn(t, 8.4, 0.35, Easing.easeOutBack);
  const tag2 = fadeIn(t, 8.6, 0.35, Easing.easeOutBack);
  const tag3 = fadeIn(t, 8.8, 0.35, Easing.easeOutBack);
  const captionIn = fadeIn(t, 9.6, 0.6, Easing.easeOutCubic);
  const loopFade = fadeOut(t, 11.4, 0.6);

  const root = { x: 280, y: 380, width: 360, height: 180 };
  const branch = { x: 920, width: 320, height: 200, ys: [120, 380, 640] };
  const rootRight = { x: root.x + root.width, y: root.y + root.height / 2 };
  const branchLefts = branch.ys.map((by) => ({ x: branch.x, y: by + branch.height / 2 }));

  const pathFor = (end: { x: number; y: number }, progress: number) => {
    const dx = end.x - rootRight.x;
    const cp1x = rootRight.x + dx * 0.5;
    const cp2x = rootRight.x + dx * 0.5;
    const ex = rootRight.x + (end.x - rootRight.x) * progress;
    const ey = rootRight.y + (end.y - rootRight.y) * progress;
    return {
      d: `M ${rootRight.x} ${rootRight.y} C ${cp1x} ${rootRight.y}, ${cp2x} ${ey}, ${ex} ${ey}`,
      ex,
      ey,
    };
  };

  return (
    <div style={{ position: "absolute", inset: 0, opacity: canvasIn * loopFade }}>
      <div style={{ position: "absolute", inset: 0, background: COLORS.bg }}>
        <GridDots opacity={0.7} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 52,
          borderBottom: `1px solid ${COLORS.borderSoft}`,
          background: "oklch(0.995 0.002 250 / 0.9)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.text }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="4" cy="4" r="2.2" stroke={COLORS.accent} strokeWidth="1.5" />
            <circle cx="12" cy="4" r="2.2" stroke={COLORS.accent} strokeWidth="1.5" />
            <circle cx="8" cy="12" r="2.2" stroke={COLORS.accent} strokeWidth="1.5" />
            <path d="M8 9.8 V8 M8 8 H4 V6.2 M8 8 H12 V6.2" stroke={COLORS.accent} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Canvas - DFS vs BFS
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 11,
            color: COLORS.textFaint,
            padding: "4px 8px",
            background: "oklch(0.97 0.003 260)",
            border: `1px solid ${COLORS.borderSoft}`,
            borderRadius: 5,
            opacity: fadeIn(t, 9.0, 0.5),
          }}
        >
          {`${1 + Math.round(b1) + Math.round(b2) + Math.round(b3)} branches / live`}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textDim }}>
          1 root / 3 forks
        </div>
      </div>

      <svg width={1760} height={960} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
        {[b1, b2, b3].map((progress, index) => {
          if (progress <= 0) return null;
          const path = pathFor(branchLefts[index], progress);
          return (
            <g key={index}>
              <path
                d={path.d}
                stroke={COLORS.accentLine}
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                opacity={0.85}
              />
              {progress > 0.1 && progress < 0.95 ? (
                <circle cx={path.ex} cy={path.ey} r={3.5} fill={COLORS.accent} />
              ) : null}
            </g>
          );
        })}
      </svg>

      <NodeCard
        x={root.x}
        y={root.y}
        width={root.width}
        height={root.height}
        title="DFS vs BFS"
        subtitle="Root conversation"
        body={[{ w: 280 }, { w: 220 }, { w: 250 }]}
        accent
        opacity={rootIn}
        scale={0.85 + 0.15 * rootIn}
      />
      <BranchNode
        x={branch.x}
        y={branch.ys[0]}
        width={branch.width}
        height={branch.height}
        title="Python example"
        kind="code"
        codeLines={["stack = [start]", "while stack:", "  n = stack.pop()"]}
        progress={b1}
        tagOpacity={tag1}
        tagLabel="Llama 3"
        tagColor="oklch(0.62 0.14 35)"
      />
      <BranchNode
        x={branch.x}
        y={branch.ys[1]}
        width={branch.width}
        height={branch.height}
        title="Go implementation"
        kind="code"
        codeLines={["for len(stack) > 0 {", "  n := stack[len-1]", "  stack = stack[:len-1]"]}
        progress={b2}
        tagOpacity={tag2}
        tagLabel="DeepSeek"
        tagColor="oklch(0.55 0.15 230)"
      />
      <BranchNode
        x={branch.x}
        y={branch.ys[2]}
        width={branch.width}
        height={branch.height}
        title="Interview answer"
        kind="text"
        textLines={[260, 240, 220, 180]}
        progress={b3}
        tagOpacity={tag3}
        tagLabel="Claude"
        tagColor="oklch(0.55 0.15 28)"
      />

      <div
        style={{
          position: "absolute",
          left: 80,
          bottom: 80,
          opacity: captionIn,
          transform: `translateY(${(1 - captionIn) * 8}px)`,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 28,
            fontWeight: 600,
            color: COLORS.text,
            letterSpacing: "-0.02em",
            lineHeight: 1.25,
            maxWidth: 720,
          }}
        >
          Fork any message. Compare models. Keep context clean.
        </div>
        <div
          style={{
            marginTop: 14,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: FONT,
            fontSize: 13,
            color: COLORS.textDim,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              background: COLORS.panel,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 6,
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: 4, background: COLORS.accent }} />
            <span style={{ fontWeight: 600, color: COLORS.text }}>ContextTree</span>
          </div>
          <span>/</span>
          <span>contexttree.app</span>
        </div>
      </div>
    </div>
  );
}

function ContextTreeScene() {
  const t = useTime();
  const chromeOpacity = fadeOut(t, 5.7, 0.5);
  const canvasFull = fadeIn(t, 5.9, 0.5);

  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: COLORS.bg }} />
      <div style={{ position: "absolute", inset: 0, opacity: chromeOpacity }}>
        <AppChrome>
          <LinearChat />
        </AppChrome>
      </div>
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 60,
          width: 1760,
          height: 960,
          opacity: canvasFull,
          borderRadius: 14,
          border: `1px solid ${COLORS.border}`,
          boxShadow:
            "0 24px 60px rgba(20, 24, 50, 0.10), 0 2px 6px rgba(20, 24, 50, 0.04)",
          overflow: "hidden",
          background: COLORS.bg,
        }}
      >
        <BranchingCanvas />
      </div>
    </>
  );
}

export function ProductDemoAnimation() {
  return (
    <ResponsiveStage>
      <ContextTreeScene />
    </ResponsiveStage>
  );
}
