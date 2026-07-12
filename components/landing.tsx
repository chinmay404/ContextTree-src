"use client";

/**
 * Context Tree — explorer-first landing, v3 (V2/04-REDESIGN-SPEC.md §8).
 * Self-contained; tokens scoped under .ctx3.
 *
 * v3 (owner: "use the icon, too many words, explain visually"):
 * - Diagrams rebuilt as a git-graph rail (spine + CSS elbow connectors);
 *   alignment is structural, works at every width.
 * - Section grammar is the tree glyph, not caps-mono eyebrows.
 * - Copy: one line per idea.
 * - Hover a hero node → only its lineage stays lit (scoped context, felt).
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Bricolage_Grotesque } from "next/font/google";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-bricolage",
  display: "swap",
});

/* ── Scoped CSS ───────────────────────────────────────────────────────── */

const CSS = `
.ctx3 {
  /* Studio palette (app/globals.css .dark) — marketing must match the app */
  --field: #0a0a0b;                      /* --background */
  --field-2: #121214;                    /* --card */
  --field-3: #1a1a1d;                    /* --popover */
  --ink: #ededef;                        /* --foreground */
  --dim: #a0a0a8;                        /* --muted-foreground */
  --line: rgba(255, 255, 255, 0.08);     /* --border hairline */
  --rail: rgba(255, 255, 255, 0.16);     /* diagram strokes: hairline is too faint at 2px */
  --accent: #7c66dc;                     /* --primary */
  --amber: #d9873a;                      /* --lineage-2 (amber branch hue) */
  --amber-dim: rgba(217, 135, 58, 0.16);
  --teal: #3aa6b9;                       /* --lineage-5 (teal branch hue) */
  --teal-dim: rgba(58, 166, 185, 0.14);
  --ok: #30a46c;                         /* --semantic-success */
  --display: var(--font-bricolage), 'Bricolage Grotesque', system-ui, sans-serif;
  --body: var(--font-geist-sans), system-ui, sans-serif;
  --mono: var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace;
  background: var(--field);
  color: var(--ink);
  font-family: var(--body);
  -webkit-font-smoothing: antialiased;
}
.ctx3 *, .ctx3 *::before, .ctx3 *::after { box-sizing: border-box; }
.ctx3 ::selection { background: var(--accent); color: #ffffff; }
.ctx3 .wrap { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
.ctx3 .mono { font-family: var(--mono); }
.ctx3 h1, .ctx3 h2, .ctx3 h3 { font-family: var(--display); text-wrap: balance; }
.ctx3 h1 { font-weight: 650; font-size: clamp(44px, 6.6vw, 78px); line-height: 1.0; letter-spacing: -0.02em; margin: 0 0 18px; }
.ctx3 h2 { font-weight: 600; font-size: clamp(26px, 3.4vw, 38px); line-height: 1.1; letter-spacing: -0.015em; margin: 0 0 8px; }
.ctx3 h3 { font-weight: 600; font-size: clamp(22px, 2.4vw, 27px); line-height: 1.18; letter-spacing: -0.01em; margin: 0 0 8px; }
.ctx3 .lede { font-size: 17px; line-height: 1.65; color: var(--dim); max-width: 44ch; text-wrap: pretty; }
.ctx3 .lede strong { color: var(--ink); font-weight: 500; }
.ctx3 a { color: inherit; text-decoration: none; }
.ctx3 :is(a, button, summary):focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 4px; }

.ctx3 .btn {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 15px; font-weight: 600; padding: 13px 22px; border-radius: 10px;
  border: 1px solid transparent; cursor: pointer;
  transition: transform 150ms cubic-bezier(0.22,1,0.36,1), background 150ms ease, border-color 150ms ease;
}
.ctx3 .btn:active { transform: translateY(1px); }
.ctx3 .btn-primary { background: var(--accent); color: #ffffff; }
.ctx3 .btn-primary:hover { background: #8b77e0; }
.ctx3 .btn-ghost { border-color: var(--line); color: var(--ink); background: var(--field-2); }
.ctx3 .btn-ghost:hover { border-color: var(--dim); }

/* nav */
.ctx3 .nav { display: flex; align-items: center; justify-content: space-between; padding: 22px 0; }
.ctx3 .brand { display: inline-flex; align-items: center; gap: 10px; font-family: var(--display); font-weight: 600; font-size: 17px; white-space: nowrap; }
.ctx3 .brand svg { color: var(--accent); flex: none; }
.ctx3 .nav-links { display: flex; align-items: center; gap: 24px; font-size: 14px; color: var(--dim); white-space: nowrap; }
.ctx3 .nav-links a:hover { color: var(--ink); }
@media (max-width: 720px) {
  .ctx3 .nav-links .hide-sm { display: none; }
  .ctx3 .nav-links { gap: 14px; }
  .ctx3 .brand { font-size: 15px; }
}

/* hero */
.ctx3 .hero { position: relative; display: grid; grid-template-columns: minmax(0, 10fr) minmax(0, 9fr); gap: clamp(28px, 5vw, 64px); align-items: center; padding: clamp(36px, 6vw, 72px) 0 clamp(56px, 7vw, 96px); }
@media (max-width: 940px) { .ctx3 .hero { grid-template-columns: 1fr; } }
.ctx3 .hero-mark { position: absolute; right: -40px; top: -30px; color: var(--ink); opacity: 0.035; pointer-events: none; }
.ctx3 .trust { margin-top: 20px; font-family: var(--mono); font-size: 12.5px; color: var(--dim); }
.ctx3 .trust b { color: var(--ink); font-weight: 500; }

/* ── the rail (git-graph) system — used by hero tree and mini diagrams ── */
.ctx3 .rail { display: flex; flex-direction: column; }
.ctx3 .rrow { display: flex; align-items: stretch; min-height: 12px; }
.ctx3 .spine { flex: none; width: 30px; position: relative; }
.ctx3 .spine::before { /* the continuous trunk line */
  content: ""; position: absolute; left: 14px; top: 0; bottom: 0;
  width: 2px; background: var(--rail); transition: background 200ms ease;
}
.ctx3 .rrow.first .spine::before { top: 50%; }
.ctx3 .rrow.last  .spine::before { bottom: 50%; }
.ctx3 .spine .dot {
  position: absolute; left: 15px; top: 50%; transform: translate(-50%, -50%);
  width: 11px; height: 11px; border-radius: 99px;
  background: var(--field); border: 2px solid var(--dim);
  transition: border-color 200ms ease, background 200ms ease;
}
.ctx3 .rrow .gap { flex: none; width: 12px; }
/* branch elbow: drops from the trunk, curves right into the card */
.ctx3 .elbow { flex: none; width: 34px; position: relative; }
.ctx3 .elbow::before {
  content: ""; position: absolute; left: -16px; top: -14px; bottom: 50%;
  width: 26px; border-left: 2px solid var(--rail); border-bottom: 2px solid var(--rail);
  border-bottom-left-radius: 14px; transition: border-color 200ms ease;
}
.ctx3 .rrow.branch { margin-left: 30px; }
.ctx3 .rrow.branch.deep { margin-left: 64px; }
.ctx3 .rrow.branch .spine { display: none; }

/* node cards */
.ctx3 .ncard {
  background: var(--field-2); border: 1px solid var(--line); border-radius: 12px;
  padding: 10px 14px; margin: 6px 0; min-width: 0;
  transition: opacity 200ms ease, border-color 200ms ease, transform 200ms ease;
}
.ctx3 .ncard p { margin: 0; font-size: 13.5px; line-height: 1.45; color: var(--ink); }
.ctx3 .chip { display: inline-block; font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.06em; padding: 2px 8px; border-radius: 99px; border: 1px solid var(--line); color: var(--dim); }
.ctx3 .ncard .chip { margin-bottom: 6px; }
.ctx3 .tag { font-family: var(--mono); font-size: 11px; color: var(--dim); align-self: center; margin-left: 12px; white-space: nowrap; }
.ctx3 .tag.amber { color: var(--amber); } .ctx3 .tag.teal { color: var(--teal); } .ctx3 .tag.ok { color: var(--ok); }
.ctx3 .tone-teal.ncard  { border-color: rgba(58,166,185,0.45); background: linear-gradient(0deg, var(--teal-dim), var(--teal-dim)), var(--field-2); }
.ctx3 .tone-amber.ncard { border-color: rgba(217,135,58,0.5);  background: linear-gradient(0deg, var(--amber-dim), var(--amber-dim)), var(--field-2); }
.ctx3 .tone-teal .chip  { color: var(--teal); border-color: rgba(58,166,185,0.5); }
.ctx3 .tone-amber .chip { color: var(--amber); border-color: rgba(217,135,58,0.55); }
.ctx3 .rrow.branch.tone-t .elbow::before { border-color: rgba(58,166,185,0.55); }
.ctx3 .rrow.branch.tone-a .elbow::before { border-color: rgba(217,135,58,0.6); }

/* hero tree interactivity: hovering a node dims everything outside its lineage */
.ctx3 .rail.focusable .ncard { cursor: default; }
.ctx3 .rail.focused .rrow:not(.lit) .ncard { opacity: 0.25; }
.ctx3 .rail.focused .rrow:not(.lit) .spine::before,
.ctx3 .rail.focused .rrow:not(.lit) .elbow::before { opacity: 0.3; }
.ctx3 .rail.focused .rrow.lit .ncard { transform: translateX(2px); }
.ctx3 .rail.focused .rrow.lit .spine .dot { border-color: var(--accent); }
.ctx3 .rail.focused .rrow.lit.tone-t .elbow::before { border-color: var(--teal); }
.ctx3 .rail.focused .rrow.lit.tone-a .elbow::before { border-color: var(--amber); }
.ctx3 .rail.focused .rrow.lit .spine::before { background: var(--accent); }
.ctx3 .hint { margin-top: 10px; font-family: var(--mono); font-size: 11.5px; color: var(--dim); padding-left: 30px; }

/* transform-only entrance: content stays readable even if animation is
   throttled (hidden tab, headless, low-power) — never gate visibility on it */
@keyframes rise { from { transform: translateY(10px); } to { transform: none; } }
.ctx3 .hero .rrow { animation: rise 480ms cubic-bezier(0.22,1,0.36,1) backwards; }
@media (prefers-reduced-motion: reduce) {
  .ctx3 .hero .rrow { animation: none; }
  .ctx3 .ncard, .ctx3 .btn, .ctx3 .spine::before, .ctx3 .elbow::before, .ctx3 .spine .dot { transition: none; }
}

/* moves */
.ctx3 .moves { border-top: 1px solid var(--line); padding: clamp(48px, 7vw, 84px) 0 20px; }
.ctx3 .move {
  display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
  gap: clamp(24px, 4vw, 56px); align-items: center;
  padding: clamp(32px, 4vw, 48px) 0; border-bottom: 1px solid var(--line);
}
.ctx3 .move:last-of-type { border-bottom: none; }
@media (max-width: 860px) { .ctx3 .move { grid-template-columns: 1fr; } }
.ctx3 .move p { color: var(--dim); font-size: 15.5px; line-height: 1.6; margin: 0; max-width: 42ch; text-wrap: pretty; }
.ctx3 .glyph { display: inline-flex; width: 44px; height: 44px; border-radius: 12px; align-items: center; justify-content: center; margin-bottom: 14px; border: 1px solid var(--line); background: var(--field-2); }
.ctx3 .glyph.amber { color: var(--amber); border-color: rgba(217,135,58,0.4); }
.ctx3 .glyph.teal  { color: var(--teal);  border-color: rgba(58,166,185,0.4); }
.ctx3 .mini { background: var(--field-2); border: 1px solid var(--line); border-radius: 16px; padding: clamp(14px, 2.5vw, 26px); }
.ctx3 .mini .ncard { background: var(--field-3); }
.ctx3 .mini .rail { max-width: 460px; }

/* receipt */
.ctx3 .receipt-band { padding: clamp(48px, 7vw, 84px) 0; border-top: 1px solid var(--line); }
.ctx3 .receipt-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: clamp(28px, 5vw, 56px); align-items: center; }
@media (max-width: 860px) { .ctx3 .receipt-grid { grid-template-columns: 1fr; } }
.ctx3 .receipt { background: var(--field-2); border: 1px solid var(--line); border-radius: 16px; font-family: var(--mono); font-size: 13px; padding: 24px; color: var(--dim); }
.ctx3 .receipt .row { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; }
.ctx3 .receipt .ink { color: var(--ink); font-weight: 600; }
.ctx3 .receipt .save { color: var(--accent); font-weight: 600; }
.ctx3 .receipt .strike { text-decoration: line-through; opacity: 0.6; }
.ctx3 .bar { height: 10px; border-radius: 99px; background: var(--field-3); margin: 4px 0 12px; overflow: hidden; }
.ctx3 .bar > i { display: block; height: 100%; border-radius: 99px; }
.ctx3 .receipt .foot { border-top: 1px dashed var(--line); margin-top: 10px; padding-top: 10px; font-size: 11px; }

/* pricing */
.ctx3 .pricing { padding: clamp(48px, 7vw, 84px) 0; border-top: 1px solid var(--line); }
.ctx3 .plans { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-top: 36px; max-width: 780px; }
.ctx3 .plan { border: 1px solid var(--line); border-radius: 16px; padding: 28px; background: var(--field-2); display: flex; flex-direction: column; }
.ctx3 .plan.founding { border-color: rgba(124,102,220,0.6); }
.ctx3 .plan .name { font-family: var(--display); font-weight: 600; font-size: 15px; color: var(--dim); }
.ctx3 .plan.founding .name { color: var(--accent); }
.ctx3 .plan .price { font-family: var(--display); font-size: 46px; font-weight: 650; margin: 10px 0 2px; }
.ctx3 .plan .per { font-size: 13px; color: var(--dim); margin-bottom: 16px; }
.ctx3 .plan ul { list-style: none; margin: 0 0 24px; padding: 0; color: var(--dim); font-size: 14.5px; line-height: 2.05; }
.ctx3 .plan ul li::before { content: "— "; color: var(--accent); }
.ctx3 .plan .btn { margin-top: auto; justify-content: center; }

/* faq */
.ctx3 .faq { padding: clamp(48px, 7vw, 80px) 0 96px; border-top: 1px solid var(--line); max-width: 740px; }
.ctx3 details { border-bottom: 1px solid var(--line); }
.ctx3 summary { cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 19px 0; font-family: var(--display); font-weight: 500; font-size: 17.5px; }
.ctx3 summary::-webkit-details-marker { display: none; }
.ctx3 summary::after { content: "+"; font-family: var(--mono); color: var(--accent); font-size: 18px; flex: none; }
.ctx3 details[open] summary::after { content: "–"; }
.ctx3 details p { margin: 0 0 20px; color: var(--dim); line-height: 1.7; font-size: 15px; max-width: 62ch; }

/* footer */
.ctx3 footer { border-top: 1px solid var(--line); padding: 30px 0 44px; display: flex; justify-content: space-between; gap: 20px; flex-wrap: wrap; color: var(--dim); font-size: 13.5px; align-items: center; }
.ctx3 footer nav { display: flex; gap: 22px; }
.ctx3 footer a:hover { color: var(--ink); }
`;

/* ── Brand glyph (public/tree-icon.svg inlined; currentColor) ─────────── */

function TreeIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <rect x="35" y="10" width="30" height="20" rx="4" fill="none" stroke="currentColor" strokeWidth="7" />
      <path d="M50 30 L50 45 M35 55 L50 45 L65 55" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <rect x="15" y="65" width="25" height="20" rx="4" fill="none" stroke="currentColor" strokeWidth="7" />
      <rect x="60" y="65" width="25" height="20" rx="4" fill="none" stroke="currentColor" strokeWidth="7" />
    </svg>
  );
}

/* Move glyphs — same stroke language as the brand icon, one drawing per move */

function GlyphSwitch({ size = 24 }: { size?: number }) {
  // a node handing off to another node: cross-AI continuation
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <rect x="8" y="24" width="30" height="22" rx="5" fill="none" stroke="currentColor" strokeWidth="7" />
      <rect x="62" y="54" width="30" height="22" rx="5" fill="none" stroke="currentColor" strokeWidth="7" />
      <path d="M38 35 C 58 35, 58 65, 62 65" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <path d="M52 52 L 60 64 L 46 66" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GlyphSide({ size = 24 }: { size?: number }) {
  // a straight trunk with one branch curving away and rejoining nothing
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <path d="M30 10 L30 90" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <path d="M30 38 C 30 58, 58 48, 62 62" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <rect x="52" y="62" width="26" height="20" rx="5" fill="none" stroke="currentColor" strokeWidth="7" />
    </svg>
  );
}

function GlyphPromote({ size = 24 }: { size?: number }) {
  // two siblings, one starred: compare and promote
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <rect x="10" y="55" width="28" height="22" rx="5" fill="none" stroke="currentColor" strokeWidth="7" opacity="0.45" />
      <rect x="60" y="55" width="28" height="22" rx="5" fill="none" stroke="currentColor" strokeWidth="7" />
      <path d="M24 55 C 24 35, 74 35, 74 55" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <path d="M74 14 L78 24 L88 25 L80 32 L82 42 L74 36 L66 42 L68 32 L60 25 L70 24 Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ── Rail primitives ──────────────────────────────────────────────────── */

type RowProps = {
  children: React.ReactNode;
  branch?: "amber" | "teal";
  deep?: boolean;
  first?: boolean;
  last?: boolean;
  lit?: boolean;
  tag?: { text: string; tone?: "amber" | "teal" | "ok" };
  onHover?: () => void;
  delay?: number;
};

function Row({ children, branch, deep, first, last, lit, tag, onHover, delay }: RowProps) {
  const cls = [
    "rrow",
    branch ? `branch tone-${branch === "teal" ? "t" : "a"}` : "",
    deep ? "deep" : "",
    first ? "first" : "",
    last ? "last" : "",
    lit ? "lit" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} style={delay !== undefined ? { animationDelay: `${delay}ms` } : undefined}>
      {branch ? <div className="elbow" /> : (
        <div className="spine"><span className="dot" /></div>
      )}
      <div className="gap" />
      <div
        onMouseEnter={onHover}
        onFocus={onHover}
        tabIndex={onHover ? 0 : undefined}
        style={{ minWidth: 0, flex: "0 1 auto" }}
      >
        {children}
      </div>
      {tag && <span className={`tag ${tag.tone ?? ""}`}>{tag.text}</span>}
    </div>
  );
}

function Card({ chip, text, tone }: { chip?: string; text: string; tone?: "amber" | "teal" }) {
  return (
    <div className={`ncard ${tone ? `tone-${tone}` : ""}`}>
      {chip && <span className="chip">{chip}</span>}
      <p>{text}</p>
    </div>
  );
}

/* ── Hero tree: lineage lights up on hover ────────────────────────────── */

const LINEAGE: Record<string, string[]> = {
  n1: ["n1"],
  n2: ["n1", "n2"],
  s1: ["n1", "n2", "s1"],
  n3: ["n1", "n2", "n3"],
  c1: ["n1", "n2", "n3", "c1"],
};

function HeroTree() {
  const [focus, setFocus] = useState<string | null>(null);
  const lit = focus ? new Set(LINEAGE[focus]) : null;
  const is = (id: string) => (lit ? lit.has(id) : false);

  return (
    <div>
      <div
        className={`rail focusable ${focus ? "focused" : ""}`}
        onMouseLeave={() => setFocus(null)}
        role="img"
        aria-label="A conversation tree: a main thread, a side question that stays separate, and a branch continued on Claude"
      >
        <Row first lit={is("n1")} onHover={() => setFocus("n1")} delay={100}>
          <Card chip="GPT-5" text="Plan a 10-day Japan trip in April — two of us, mid budget." />
        </Row>
        <Row lit={is("n2")} onHover={() => setFocus("n2")} delay={220}>
          <Card chip="GPT-5" text="Tokyo days 1–4, Kyoto 5–7, Osaka 8–10. Here's the route…" />
        </Row>
        <Row branch="teal" lit={is("s1")} onHover={() => setFocus("s1")} delay={340}>
          <Card tone="teal" chip="side question" text="Wait — do we even need a visa?" />
        </Row>
        <Row last lit={is("n3")} onHover={() => setFocus("n3")} delay={460}>
          <Card chip="GPT-5" text="Now make Kyoto more food-focused." />
        </Row>
        <Row branch="amber" lit={is("c1")} onHover={() => setFocus("c1")} delay={580}>
          <Card tone="amber" chip="→ continued on Claude" text="Same thread. Second opinion. Context came along." />
        </Row>
      </div>
      <p className="hint">hover a node — only its own lineage lights up</p>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export function Landing() {
  const router = useRouter();
  const start = () => router.push("/auth/signin");

  return (
    <div className={`ctx3 ${bricolage.variable}`}>
      <style>{CSS}</style>

      <div className="wrap">
        <header className="nav">
          <a href="/" className="brand"><TreeIcon />Context Tree</a>
          <nav className="nav-links">
            <a href="#moves" className="hide-sm">How it works</a>
            <a href="#pricing" className="hide-sm">Pricing</a>
            <a href="#faq" className="hide-sm">FAQ</a>
            <a href="/auth/signin">Sign in</a>
            <button className="btn btn-primary" onClick={start} style={{ padding: "9px 16px", fontSize: 14 }}>
              Start exploring
            </button>
          </nav>
        </header>

        <section className="hero">
          <span className="hero-mark"><TreeIcon size={420} /></span>
          <div>
            <h1>Explore in every direction.</h1>
            <p className="lede">
              An AI studio with one rule: <strong>every branch knows only its
              own history.</strong> Detours stay detours. Any branch can run
              on a different AI.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={start}>Start free — bring your key</button>
              <a className="btn btn-ghost" href="#moves">See the moves</a>
            </div>
            <p className="trust"><b>your keys</b> · <b>your data</b> · export anytime · no card</p>
          </div>
          <HeroTree />
        </section>
      </div>

      <div className="wrap moves" id="moves">
        <div className="move">
          <div>
            <span className="glyph amber"><GlyphSwitch /></span>
            <h3>Started with GPT.<br />Want Claude&apos;s take? One click.</h3>
            <p>The branch carries your context to any model.</p>
          </div>
          <div className="mini">
            <div className="rail" role="img" aria-label="A GPT thread branches to Claude and to Gemini; context travels with each branch">
              <Row first><Card chip="GPT-5" text="your thread" /></Row>
              <Row branch="amber" tag={{ text: "context travels →", tone: "amber" }}>
                <Card tone="amber" chip="Claude" text="second opinion" />
              </Row>
              <Row last><Card chip="GPT-5" text="…continues" /></Row>
              <Row branch="teal"><Card tone="teal" chip="Gemini Flash" text="same question, cheaper" /></Row>
            </div>
          </div>
        </div>

        <div className="move">
          <div>
            <span className="glyph teal"><GlyphSide /></span>
            <h3>Ask the dumb question.<br />Your thread never sees it.</h3>
            <p>Every detour is its own branch. Ask, understand, come back clean.</p>
          </div>
          <div className="mini">
            <div className="rail" role="img" aria-label="A side question branches off the main thread; the main thread continues untouched">
              <Row first><Card text="deep in the mortgage numbers…" /></Row>
              <Row branch="teal"><Card tone="teal" chip="side question" text="wait — what's a down payment again?" /></Row>
              <Row last tag={{ text: "✓ never saw the detour", tone: "ok" }}>
                <Card text="…continues clean" />
              </Row>
            </div>
          </div>
        </div>

        <div className="move">
          <div>
            <span className="glyph amber"><GlyphPromote /></span>
            <h3>Fork the decision.<br />Promote the winner.</h3>
            <p>Run versions side by side, then compile the winning path to Markdown.</p>
          </div>
          <div className="mini">
            <div className="rail" role="img" aria-label="Two versions branch from a decision; version B is promoted and exported as Markdown">
              <Row first last><Card text="the decision point" /></Row>
              <Row branch="amber" tag={{ text: "promoted ★", tone: "amber" }}>
                <Card tone="amber" chip="version B" text="the one that works" />
              </Row>
              <Row branch="amber" deep><Card chip="export" text="draft.md — the winning path, compiled" /></Row>
            </div>
          </div>
        </div>
      </div>

      <div className="wrap receipt-band">
        <div className="receipt-grid">
          <div>
            <h2>Stop re-paying for history your question doesn&apos;t need.</h2>
            <p className="lede">
              Linear chats re-send everything, every turn. A branch sends only
              its lineage. Your key — so the difference is your money.
            </p>
          </div>
          <div className="receipt" aria-label="Token cost comparison: linear chat versus branched">
            <div className="row"><span>one long linear chat</span><span className="strike">48,210 tok/turn</span></div>
            <div className="bar"><i style={{ width: "100%", background: "var(--rail)" }} /></div>
            <div className="row"><span>same work, branched</span><span className="ink">19,830 tok/turn</span></div>
            <div className="bar"><i style={{ width: "41%", background: "var(--accent)" }} /></div>
            <div className="row"><span>context you stopped re-sending</span><span className="save">−59%</span></div>
            <div className="foot">research: ~58% context reduction from branching · arXiv:2512.13914</div>
          </div>
        </div>
      </div>

      <div className="wrap pricing" id="pricing">
        <h2>Pay once. Bring your key.</h2>
        <div className="plans">
          <div className="plan">
            <span className="name">Free</span>
            <div className="price">$0</div>
            <div className="per">forever · bring your own key</div>
            <ul>
              <li>2 canvases</li>
              <li>All core moves</li>
              <li>Export included</li>
            </ul>
            <button className="btn btn-ghost" onClick={start}>Start free</button>
          </div>
          <div className="plan founding">
            <span className="name">Founding license</span>
            <div className="price">$59</div>
            <div className="per">one time · first 100 · then $79</div>
            <ul>
              <li>Unlimited canvases</li>
              <li>Codex: pinned context cards</li>
              <li>ChatGPT history import</li>
              <li>Founding badge + priority fixes</li>
            </ul>
            <button className="btn btn-primary" onClick={start}>Become a founder</button>
          </div>
        </div>
      </div>

      <div className="wrap faq" id="faq">
        <h2>Fair questions.</h2>
        <div style={{ marginTop: 18 }}>
          <details>
            <summary>Doesn&apos;t ChatGPT already have branching?</summary>
            <p>
              It has a fork button — each fork becomes another flat chat in your
              sidebar, same model, no map. Context Tree gives you the tree:
              see every branch, scope what each knows, switch models, compare,
              export. The button makes a copy; the canvas manages an exploration.
            </p>
          </details>
          <details>
            <summary>What does &quot;bring your own key&quot; mean?</summary>
            <p>
              You paste your own API key (OpenAI, Anthropic, Google, or Groq)
              and pay the provider directly for what you use — usually far less
              than a $20/month subscription. Keys are stored encrypted.
            </p>
          </details>
          <details>
            <summary>Who owns my conversations?</summary>
            <p>
              You do. Export any canvas or your whole account as Markdown/JSON
              anytime; delete everything with one action. No training on your
              data, no selling it.
            </p>
          </details>
          <details>
            <summary>Is $59 really one-time?</summary>
            <p>
              Yes — the license never expires. An optional cloud-sync
              subscription may come later; the studio you buy is yours.
              14-day refund, no questions.
            </p>
          </details>
          <details>
            <summary>Who is this for?</summary>
            <p>
              Explorers: learners untangling hard topics, coders comparing
              approaches, researchers running parallel inquiries, writers
              drafting a scene five ways. If your thinking branches, the tool
              finally matches it.
            </p>
          </details>
        </div>
      </div>

      <div className="wrap">
        <footer>
          <span className="brand" style={{ fontSize: 14 }}><TreeIcon size={20} />Context Tree</span>
          <nav>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/auth/signin">Sign in</a>
          </nav>
        </footer>
      </div>
    </div>
  );
}

export default Landing;
