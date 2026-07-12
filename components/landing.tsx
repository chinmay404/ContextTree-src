"use client";

/**
 * Context Tree — explorer-first landing (V2, spec: V2/04-REDESIGN-SPEC.md §8).
 * One page, self-contained. Tokens scoped under .ctx3 so nothing leaks.
 *
 * v2 revision (owner feedback): less copy, more picture. Every "move" is
 * shown as a mini node-diagram; text is one line. Real tree icon in the nav.
 *
 * Signature element: the hero lineage tree — hover any node and only its
 * ancestor path stays lit. Scoped context, demonstrated instead of claimed.
 */

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bricolage_Grotesque } from "next/font/google";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-bricolage",
  display: "swap",
});

/* ── Tokens + component CSS (scoped) ──────────────────────────────────── */

const CSS = `
.ctx3 {
  --field: #0B1020;
  --field-2: #10182E;
  --field-3: #151F3A;
  --paper: #E9E4D6;
  --dim: #8A92A8;
  --line: #26304A;
  --amber: #E3A44A;
  --amber-soft: rgba(227, 164, 74, 0.14);
  --teal: #52B8AC;
  --teal-soft: rgba(82, 184, 172, 0.13);
  --display: var(--font-bricolage), 'Bricolage Grotesque', system-ui, sans-serif;
  --body: var(--font-geist-sans), system-ui, sans-serif;
  --mono: var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace;
  background: var(--field);
  color: var(--paper);
  font-family: var(--body);
  -webkit-font-smoothing: antialiased;
}
.ctx3 *, .ctx3 *::before, .ctx3 *::after { box-sizing: border-box; }
.ctx3 ::selection { background: var(--amber); color: var(--field); }

.ctx3 .wrap { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
.ctx3 .mono { font-family: var(--mono); }

.ctx3 .eyebrow {
  font-family: var(--mono); font-size: 12px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--amber);
}
.ctx3 h1 {
  font-family: var(--display); font-weight: 600;
  font-size: clamp(44px, 6.8vw, 80px); line-height: 1.0;
  letter-spacing: -0.02em; margin: 18px 0 18px;
}
.ctx3 h2 {
  font-family: var(--display); font-weight: 600;
  font-size: clamp(26px, 3.6vw, 40px); line-height: 1.08;
  letter-spacing: -0.015em; margin: 0 0 10px;
}
.ctx3 .lede { font-size: 17.5px; line-height: 1.6; color: var(--dim); max-width: 42ch; }
.ctx3 .lede strong { color: var(--paper); font-weight: 500; }

.ctx3 a { color: inherit; text-decoration: none; }
.ctx3 :is(a, button, summary):focus-visible {
  outline: 2px solid var(--amber); outline-offset: 3px; border-radius: 4px;
}

.ctx3 .btn {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--body); font-size: 15px; font-weight: 600;
  padding: 13px 22px; border-radius: 10px; border: 1px solid transparent;
  cursor: pointer; transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
}
.ctx3 .btn:active { transform: translateY(1px); }
.ctx3 .btn-primary { background: var(--amber); color: #17110A; }
.ctx3 .btn-primary:hover { background: #EDB35F; }
.ctx3 .btn-ghost { border-color: var(--line); color: var(--paper); background: transparent; }
.ctx3 .btn-ghost:hover { border-color: var(--dim); }

/* nav */
.ctx3 .nav { display: flex; align-items: center; justify-content: space-between; padding: 22px 0; }
.ctx3 .brand { display: inline-flex; align-items: center; gap: 10px; font-family: var(--display); font-weight: 600; font-size: 17px; letter-spacing: -0.01em; }
.ctx3 .brand svg { color: var(--amber); }
.ctx3 .nav-links { display: flex; align-items: center; gap: 26px; font-size: 14px; color: var(--dim); }
.ctx3 .nav-links a:hover { color: var(--paper); }
@media (max-width: 720px) { .ctx3 .nav-links .hide-sm { display: none; } }

/* hero */
.ctx3 .hero { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); gap: 48px; align-items: center; padding: 52px 0 84px; }
@media (max-width: 960px) { .ctx3 .hero { grid-template-columns: 1fr; padding-top: 28px; } }
.ctx3 .trustline { margin-top: 20px; font-family: var(--mono); font-size: 12.5px; color: var(--dim); letter-spacing: 0.02em; }
.ctx3 .trustline b { color: var(--paper); font-weight: 500; }

/* the lineage tree (hero) */
.ctx3 .tree { position: relative; min-height: 520px; }
@media (max-width: 960px) { .ctx3 .tree { min-height: 470px; max-width: 560px; } }
.ctx3 .tree svg.edges { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.ctx3 .edge { fill: none; stroke: var(--line); stroke-width: 1.5; transition: stroke 200ms ease, opacity 200ms ease; }
.ctx3 .node {
  position: absolute; width: 46%; min-width: 200px;
  background: var(--field-2); border: 1px solid var(--line); border-radius: 12px;
  padding: 11px 13px; transition: opacity 220ms ease, border-color 220ms ease, transform 220ms ease;
  cursor: default;
}
.ctx3 .chip {
  display: inline-block; font-family: var(--mono); font-size: 10.5px;
  letter-spacing: 0.08em; padding: 2px 8px; border-radius: 99px;
  border: 1px solid var(--line); color: var(--dim);
}
.ctx3 .node .chip { margin-bottom: 7px; }
.ctx3 .node p { margin: 0; font-size: 13px; line-height: 1.45; color: var(--paper); }
.ctx3 .node .sub { display: block; margin-top: 5px; font-family: var(--mono); font-size: 10.5px; color: var(--dim); }
.ctx3 .tone-teal { border-color: rgba(82,184,172,0.45); background: linear-gradient(0deg, var(--teal-soft), var(--teal-soft)), var(--field-2); }
.ctx3 .tone-teal .chip, .ctx3 .chip.teal { color: var(--teal); border-color: rgba(82,184,172,0.5); }
.ctx3 .tone-amber { border-color: rgba(227,164,74,0.5); background: linear-gradient(0deg, var(--amber-soft), var(--amber-soft)), var(--field-2); }
.ctx3 .tone-amber .chip, .ctx3 .chip.amber { color: var(--amber); border-color: rgba(227,164,74,0.55); }
.ctx3 .tree.focused .node { opacity: 0.28; }
.ctx3 .tree.focused .node.lit { opacity: 1; transform: translateY(-1px); }
.ctx3 .tree.focused .edge { opacity: 0.25; }
.ctx3 .tree.focused .edge.lit { opacity: 1; stroke: var(--amber); }
.ctx3 .tree.focused .edge.lit-teal { opacity: 1; stroke: var(--teal); }
.ctx3 .tree-hint { position: absolute; bottom: -6px; left: 0; font-family: var(--mono); font-size: 11.5px; color: var(--dim); }

@keyframes ctx3-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.ctx3 .node { animation: ctx3-rise 500ms ease backwards; }
@media (prefers-reduced-motion: reduce) {
  .ctx3 .node { animation: none; }
  .ctx3 .node, .ctx3 .edge, .ctx3 .btn { transition: none; }
}

/* moves — diagram-led */
.ctx3 .moves { border-top: 1px solid var(--line); padding: 76px 0 30px; }
.ctx3 .moves-head { max-width: 60ch; margin-bottom: 8px; }
.ctx3 .move {
  display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
  gap: 40px; align-items: center; padding: 40px 0; border-bottom: 1px solid var(--line);
}
.ctx3 .move:last-child { border-bottom: none; }
@media (max-width: 860px) { .ctx3 .move { grid-template-columns: 1fr; gap: 20px; } }
.ctx3 .move h3 { font-family: var(--display); font-weight: 600; font-size: clamp(22px, 2.6vw, 28px); margin: 10px 0 6px; letter-spacing: -0.01em; line-height: 1.15; }
.ctx3 .move p { color: var(--dim); line-height: 1.6; font-size: 15px; margin: 0; max-width: 40ch; }
.ctx3 .eyebrow.teal { color: var(--teal); }

/* mini-diagram canvas */
.ctx3 .mini {
  position: relative; background:
    radial-gradient(circle at 1px 1px, rgba(138,146,168,0.14) 1px, transparent 0) 0 0 / 22px 22px,
    var(--field-2);
  border: 1px solid var(--line); border-radius: 16px; min-height: 240px;
}
.ctx3 .mini svg.edges { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.ctx3 .mini .mnode {
  position: absolute; background: var(--field-3); border: 1px solid var(--line);
  border-radius: 10px; padding: 8px 12px; font-family: var(--mono); font-size: 12px;
  color: var(--paper); white-space: nowrap; display: flex; align-items: center; gap: 8px;
}
.ctx3 .mini .mnode .dot { width: 7px; height: 7px; border-radius: 99px; background: var(--dim); }
.ctx3 .mini .mnode.tone-amber .dot { background: var(--amber); }
.ctx3 .mini .mnode.tone-teal .dot { background: var(--teal); }
.ctx3 .mini .tag {
  position: absolute; font-family: var(--mono); font-size: 10.5px; color: var(--dim);
  letter-spacing: 0.04em;
}
.ctx3 .mini .tag.amber { color: var(--amber); }
.ctx3 .mini .tag.teal { color: var(--teal); }
.ctx3 .mini .tag.ok { color: #7BC98A; }

/* receipt */
.ctx3 .receipt-band { padding: 84px 0; border-top: 1px solid var(--line); }
.ctx3 .receipt-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 48px; align-items: center; }
@media (max-width: 860px) { .ctx3 .receipt-grid { grid-template-columns: 1fr; } }
.ctx3 .receipt {
  background: var(--field-2); border: 1px solid var(--line); border-radius: 14px;
  font-family: var(--mono); font-size: 13px; padding: 24px; color: var(--dim);
}
.ctx3 .receipt .line { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px dashed var(--line); }
.ctx3 .receipt .line:last-of-type { border-bottom: none; }
.ctx3 .receipt .total { color: var(--paper); font-weight: 600; }
.ctx3 .receipt .save { color: var(--amber); font-weight: 600; }
.ctx3 .receipt .strike { text-decoration: line-through; opacity: 0.6; }
.ctx3 .bar { height: 10px; border-radius: 99px; background: var(--field-3); margin: 6px 0 14px; overflow: hidden; }
.ctx3 .bar > i { display: block; height: 100%; border-radius: 99px; }

/* pricing */
.ctx3 .pricing { padding: 84px 0; border-top: 1px solid var(--line); }
.ctx3 .plans { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 24px; margin-top: 40px; max-width: 820px; }
@media (max-width: 760px) { .ctx3 .plans { grid-template-columns: 1fr; } }
.ctx3 .plan { border: 1px solid var(--line); border-radius: 16px; padding: 28px; background: var(--field-2); display: flex; flex-direction: column; }
.ctx3 .plan.founding { border-color: rgba(227,164,74,0.6); }
.ctx3 .plan .name { font-family: var(--mono); font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--dim); }
.ctx3 .plan.founding .name { color: var(--amber); }
.ctx3 .plan .price { font-family: var(--display); font-size: 44px; font-weight: 600; margin: 12px 0 2px; }
.ctx3 .plan .per { font-size: 13px; color: var(--dim); margin-bottom: 18px; }
.ctx3 .plan ul { list-style: none; margin: 0 0 24px; padding: 0; color: var(--dim); font-size: 14.5px; line-height: 2; }
.ctx3 .plan ul li::before { content: "— "; color: var(--amber); }
.ctx3 .plan .btn { margin-top: auto; justify-content: center; }

/* faq */
.ctx3 .faq { padding: 76px 0 96px; border-top: 1px solid var(--line); max-width: 760px; }
.ctx3 details { border-bottom: 1px solid var(--line); }
.ctx3 summary {
  cursor: pointer; list-style: none; display: flex; justify-content: space-between;
  align-items: center; gap: 16px; padding: 20px 0;
  font-family: var(--display); font-weight: 500; font-size: 18px;
}
.ctx3 summary::-webkit-details-marker { display: none; }
.ctx3 summary::after { content: "+"; font-family: var(--mono); color: var(--amber); font-size: 18px; }
.ctx3 details[open] summary::after { content: "–"; }
.ctx3 details p { margin: 0 0 22px; color: var(--dim); line-height: 1.7; font-size: 15px; max-width: 62ch; }

/* footer */
.ctx3 footer { border-top: 1px solid var(--line); padding: 32px 0 44px; display: flex; justify-content: space-between; gap: 20px; flex-wrap: wrap; color: var(--dim); font-size: 13.5px; align-items: center; }
.ctx3 footer nav { display: flex; gap: 22px; }
.ctx3 footer a:hover { color: var(--paper); }
`;

/* ── Brand icon (public/tree-icon.svg, inlined so currentColor works) ──── */

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

/* ── Hero tree ────────────────────────────────────────────────────────── */

type TreeNode = {
  id: string;
  parent: string | null;
  x: number;
  y: number;
  chip: string;
  text: string;
  sub?: string;
  tone?: "teal" | "amber";
};

const NODES: TreeNode[] = [
  { id: "n1", parent: null, x: 2, y: 0, chip: "GPT-5", text: "Why do transformers use attention instead of recurrence?" },
  { id: "n2", parent: "n1", x: 2, y: 24, chip: "GPT-5", text: "Attention lets every token look at every other token at once…" },
  { id: "s1", parent: "n2", x: 54, y: 38, chip: "side question", text: "Wait — what exactly is a token?", sub: "main thread: untouched", tone: "teal" },
  { id: "n3", parent: "n2", x: 2, y: 52, chip: "GPT-5", text: "Now explain multi-head attention like I'm rusty on linear algebra." },
  { id: "c1", parent: "n3", x: 54, y: 74, chip: "→ continued on Claude", text: "Same thread, second opinion.", sub: "context traveled with it", tone: "amber" },
];

function ancestors(id: string): Set<string> {
  const byId = new Map(NODES.map((n) => [n.id, n]));
  const lit = new Set<string>();
  let cur: TreeNode | undefined = byId.get(id);
  while (cur) {
    lit.add(cur.id);
    cur = cur.parent ? byId.get(cur.parent) : undefined;
  }
  return lit;
}

function HeroTree() {
  const [focus, setFocus] = useState<string | null>(null);
  const lit = useMemo(() => (focus ? ancestors(focus) : new Set<string>()), [focus]);

  const edges = NODES.filter((n) => n.parent).map((n) => {
    const p = NODES.find((m) => m.id === n.parent)!;
    const sameColumn = Math.abs(p.x - n.x) < 10;
    const x1 = p.x + (sameColumn ? 12 : 30);
    const y1 = p.y + 16;
    const x2 = n.x + (sameColumn ? 12 : 4);
    const y2 = n.y + 7;
    const d = sameColumn
      ? `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`
      : `M ${x1} ${y1} C ${x1 + 14} ${y1 + 6}, ${x2 - 16} ${y2 - 8}, ${x2} ${y2}`;
    return { id: `${n.parent}-${n.id}`, d, child: n };
  });

  return (
    <div
      className={`tree ${focus ? "focused" : ""}`}
      onMouseLeave={() => setFocus(null)}
      aria-label="Example conversation tree: a main thread, a side question, and a branch continued on another AI"
      role="img"
    >
      <svg className="edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {edges.map((e) => (
          <path
            key={e.id}
            d={e.d}
            className={`edge ${focus && lit.has(e.child.id) ? (e.child.tone === "teal" ? "lit-teal" : "lit") : ""}`}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      {NODES.map((n, i) => (
        <div
          key={n.id}
          className={`node ${n.tone ? `tone-${n.tone}` : ""} ${focus && lit.has(n.id) ? "lit" : ""}`}
          style={{ left: `${n.x}%`, top: `${n.y}%`, animationDelay: `${120 + i * 130}ms` }}
          onMouseEnter={() => setFocus(n.id)}
          onFocus={() => setFocus(n.id)}
          tabIndex={0}
        >
          <span className="chip">{n.chip}</span>
          <p>{n.text}</p>
          {n.sub && <span className="sub">{n.sub}</span>}
        </div>
      ))}
      <span className="tree-hint">hover a node — only its own lineage lights up</span>
    </div>
  );
}

/* ── Mini diagrams (one per move; picture first, words second) ────────── */

function MiniSwitch() {
  return (
    <div className="mini" aria-label="Diagram: a GPT conversation branches onto Claude and Gemini, carrying its context" role="img">
      <svg className="edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path className="edge" d="M 22 22 C 22 45, 22 45, 22 62" vectorEffect="non-scaling-stroke" />
        <path className="edge lit" style={{ opacity: 1, stroke: "var(--amber)" }} d="M 28 20 C 52 26, 58 30, 62 40" vectorEffect="non-scaling-stroke" />
        <path className="edge lit-teal" style={{ opacity: 1, stroke: "var(--teal)" }} d="M 28 22 C 52 40, 56 58, 60 72" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mnode" style={{ left: "8%", top: "10%" }}><span className="dot" />GPT-5 · your thread</div>
      <div className="mnode" style={{ left: "8%", top: "62%" }}><span className="dot" />…continues</div>
      <div className="mnode tone-amber" style={{ left: "56%", top: "34%" }}><span className="dot" />Claude&apos;s take</div>
      <div className="mnode tone-teal" style={{ left: "54%", top: "70%" }}><span className="dot" />Gemini, cheaper</div>
      <span className="tag amber" style={{ left: "38%", top: "16%" }}>context travels →</span>
    </div>
  );
}

function MiniSide() {
  return (
    <div className="mini" aria-label="Diagram: a side question branches off; the main thread stays clean" role="img">
      <svg className="edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path className="edge" d="M 22 24 C 22 42, 22 42, 22 56" vectorEffect="non-scaling-stroke" />
        <path className="edge" d="M 22 70 C 22 80, 22 80, 22 88" vectorEffect="non-scaling-stroke" />
        <path className="edge lit-teal" style={{ opacity: 1, stroke: "var(--teal)" }} d="M 30 60 C 50 62, 54 48, 58 42" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mnode" style={{ left: "8%", top: "12%" }}><span className="dot" />main thread</div>
      <div className="mnode" style={{ left: "8%", top: "48%" }}><span className="dot" />deep in the topic…</div>
      <div className="mnode" style={{ left: "8%", top: "80%" }}><span className="dot" />…continues clean</div>
      <div className="mnode tone-teal" style={{ left: "56%", top: "30%" }}><span className="dot" />&quot;wait, what&apos;s a token?&quot;</div>
      <span className="tag ok" style={{ left: "34%", top: "84%" }}>✓ never sees the detour</span>
    </div>
  );
}

function MiniCompare() {
  return (
    <div className="mini" aria-label="Diagram: two versions compared, the winner promoted and exported" role="img">
      <svg className="edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path className="edge" d="M 42 22 C 30 32, 26 38, 24 46" vectorEffect="non-scaling-stroke" />
        <path className="edge lit" style={{ opacity: 1, stroke: "var(--amber)" }} d="M 58 22 C 68 32, 72 38, 74 46" vectorEffect="non-scaling-stroke" />
        <path className="edge lit" style={{ opacity: 1, stroke: "var(--amber)" }} d="M 74 62 C 72 72, 68 78, 60 84" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mnode" style={{ left: "32%", top: "10%" }}><span className="dot" />the decision point</div>
      <div className="mnode" style={{ left: "6%", top: "44%", opacity: 0.55 }}><span className="dot" />Version A</div>
      <div className="mnode tone-amber" style={{ left: "58%", top: "44%" }}><span className="dot" />Version B ★</div>
      <div className="mnode tone-amber" style={{ left: "34%", top: "80%" }}><span className="dot" />export draft.md</div>
      <span className="tag amber" style={{ left: "60%", top: "66%" }}>promoted</span>
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
          <a href="/" className="brand">
            <TreeIcon />
            Context Tree
          </a>
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
          <div>
            <span className="eyebrow">For people who think in branches</span>
            <h1>Explore in every direction.</h1>
            <p className="lede">
              <strong>Every branch carries only its own history.</strong> Side
              questions never pollute your thread. Any branch can run on a
              different AI.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={start}>Start free — bring your key</button>
              <a className="btn btn-ghost" href="#moves">See the moves</a>
            </div>
            <p className="trustline">
              <b>your keys</b> · <b>your data</b> · export anytime · no card required
            </p>
          </div>
          <HeroTree />
        </section>
      </div>

      <div className="wrap moves" id="moves">
        <div className="moves-head">
          <span className="eyebrow" style={{ color: "var(--dim)" }}>Three moves no chat app has</span>
        </div>

        <div className="move">
          <div>
            <span className="eyebrow">Continue on another AI</span>
            <h3>Started with GPT.<br />Want Claude&apos;s take? One click.</h3>
            <p>The branch carries your context to any model — GPT, Claude, Gemini, Groq.</p>
          </div>
          <MiniSwitch />
        </div>

        <div className="move">
          <div>
            <span className="eyebrow teal">Side question</span>
            <h3>Ask the dumb question.<br />Your thread never sees it.</h3>
            <p>Every detour is its own branch. Ask, understand, come back clean.</p>
          </div>
          <MiniSide />
        </div>

        <div className="move">
          <div>
            <span className="eyebrow">Compare &amp; keep the best</span>
            <h3>Fork the decision.<br />Promote the winner.</h3>
            <p>Run versions side by side, then compile the winning path to Markdown.</p>
          </div>
          <MiniCompare />
        </div>
      </div>

      <div className="wrap receipt-band">
        <div className="receipt-grid">
          <div>
            <span className="eyebrow">Scoped context is cheaper context</span>
            <h2>Stop re-paying for history your question doesn&apos;t need.</h2>
            <p className="lede">
              A linear chat re-sends everything, every turn. A branch sends only
              its own lineage. Your key — so the difference is your money.
            </p>
          </div>
          <div className="receipt" aria-label="Token cost comparison">
            <div className="line" style={{ borderBottom: "none" }}><span>one long linear chat</span><span className="strike">48,210 tok/turn</span></div>
            <div className="bar"><i style={{ width: "100%", background: "var(--line)" }} /></div>
            <div className="line" style={{ borderBottom: "none" }}><span>same work, branched</span><span className="total">19,830 tok/turn</span></div>
            <div className="bar"><i style={{ width: "41%", background: "var(--amber)" }} /></div>
            <div className="line"><span>context you stopped re-sending</span><span className="save">−59%</span></div>
            <div className="line" style={{ paddingTop: 10 }}>
              <span style={{ fontSize: 11 }}>research: ~58% context reduction from branching (arXiv:2512.13914)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="wrap pricing" id="pricing">
        <span className="eyebrow">Pricing</span>
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
        <span className="eyebrow">FAQ</span>
        <h2>Fair questions.</h2>
        <div style={{ marginTop: 20 }}>
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
          <span className="brand" style={{ fontSize: 14 }}>
            <TreeIcon size={20} />
            Context Tree
          </span>
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
