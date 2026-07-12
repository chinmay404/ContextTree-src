"use client";

/**
 * Context Tree — explorer-first landing (V2, spec: V2/04-REDESIGN-SPEC.md §8).
 * One page, self-contained. Tokens scoped under .ctx3 so nothing leaks.
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
.ctx3 .display { font-family: var(--display); }
.ctx3 .mono { font-family: var(--mono); }

.ctx3 .eyebrow {
  font-family: var(--mono); font-size: 12px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--amber);
}
.ctx3 h1 {
  font-family: var(--display); font-weight: 600;
  font-size: clamp(42px, 6.5vw, 76px); line-height: 1.02;
  letter-spacing: -0.02em; margin: 18px 0 20px;
}
.ctx3 h2 {
  font-family: var(--display); font-weight: 600;
  font-size: clamp(28px, 4vw, 44px); line-height: 1.08;
  letter-spacing: -0.015em; margin: 0 0 12px;
}
.ctx3 .lede { font-size: 18px; line-height: 1.65; color: var(--dim); max-width: 46ch; }
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
.ctx3 .nav-links { display: flex; align-items: center; gap: 26px; font-size: 14px; color: var(--dim); }
.ctx3 .nav-links a:hover { color: var(--paper); }
@media (max-width: 720px) { .ctx3 .nav-links .hide-sm { display: none; } }

/* hero */
.ctx3 .hero { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); gap: 48px; align-items: center; padding: 56px 0 88px; }
@media (max-width: 960px) { .ctx3 .hero { grid-template-columns: 1fr; padding-top: 32px; } }
.ctx3 .trustline { margin-top: 22px; font-family: var(--mono); font-size: 12.5px; color: var(--dim); letter-spacing: 0.02em; }
.ctx3 .trustline b { color: var(--paper); font-weight: 500; }

/* the lineage tree */
.ctx3 .tree { position: relative; min-height: 520px; }
@media (max-width: 960px) { .ctx3 .tree { min-height: 480px; max-width: 560px; } }
.ctx3 .tree svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.ctx3 .tree .edge { fill: none; stroke: var(--line); stroke-width: 1.5; transition: stroke 200ms ease, opacity 200ms ease; }
.ctx3 .node {
  position: absolute; width: 46%; min-width: 200px;
  background: var(--field-2); border: 1px solid var(--line); border-radius: 12px;
  padding: 11px 13px; transition: opacity 220ms ease, border-color 220ms ease, transform 220ms ease;
  cursor: default;
}
.ctx3 .node .chip {
  display: inline-block; font-family: var(--mono); font-size: 10.5px;
  letter-spacing: 0.08em; padding: 2px 8px; border-radius: 99px;
  border: 1px solid var(--line); color: var(--dim); margin-bottom: 7px;
}
.ctx3 .node p { margin: 0; font-size: 13px; line-height: 1.45; color: var(--paper); }
.ctx3 .node .sub { display: block; margin-top: 5px; font-family: var(--mono); font-size: 10.5px; color: var(--dim); }
.ctx3 .node-teal { border-color: rgba(82,184,172,0.45); background: linear-gradient(0deg, var(--teal-soft), var(--teal-soft)), var(--field-2); }
.ctx3 .node-teal .chip { color: var(--teal); border-color: rgba(82,184,172,0.5); }
.ctx3 .node-amber { border-color: rgba(227,164,74,0.5); background: linear-gradient(0deg, var(--amber-soft), var(--amber-soft)), var(--field-2); }
.ctx3 .node-amber .chip { color: var(--amber); border-color: rgba(227,164,74,0.55); }
.ctx3 .tree.focused .node { opacity: 0.28; }
.ctx3 .tree.focused .node.lit { opacity: 1; transform: translateY(-1px); }
.ctx3 .tree.focused .edge { opacity: 0.25; }
.ctx3 .tree.focused .edge.lit { opacity: 1; stroke: var(--amber); }
.ctx3 .tree.focused .edge.lit-teal { opacity: 1; stroke: var(--teal); }
.ctx3 .tree-hint {
  position: absolute; bottom: -8px; left: 0;
  font-family: var(--mono); font-size: 11.5px; color: var(--dim);
}

@keyframes ctx3-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.ctx3 .node { animation: ctx3-rise 500ms ease backwards; }
@media (prefers-reduced-motion: reduce) {
  .ctx3 .node { animation: none; }
  .ctx3 .node, .ctx3 .edge, .ctx3 .btn { transition: none; }
}

/* moves */
.ctx3 .moves { border-top: 1px solid var(--line); padding: 80px 0 30px; }
.ctx3 .move {
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 44px; align-items: center; padding: 44px 0; border-bottom: 1px solid var(--line);
}
.ctx3 .move:last-child { border-bottom: none; }
@media (max-width: 860px) { .ctx3 .move { grid-template-columns: 1fr; gap: 24px; } }
.ctx3 .move h3 { font-family: var(--display); font-weight: 600; font-size: 26px; margin: 10px 0 10px; letter-spacing: -0.01em; }
.ctx3 .move p { color: var(--dim); line-height: 1.65; font-size: 15.5px; margin: 0; max-width: 48ch; }
.ctx3 .move .eyebrow.teal { color: var(--teal); }
.ctx3 .diagram {
  background: var(--field-2); border: 1px solid var(--line); border-radius: 14px;
  padding: 22px; font-family: var(--mono); font-size: 12.5px; color: var(--dim);
}
.ctx3 .diagram .row { display: flex; align-items: center; gap: 10px; padding: 7px 0; flex-wrap: wrap; }
.ctx3 .pill { border: 1px solid var(--line); border-radius: 99px; padding: 3px 10px; color: var(--paper); white-space: nowrap; }
.ctx3 .pill.amber { color: var(--amber); border-color: rgba(227,164,74,0.55); }
.ctx3 .pill.teal { color: var(--teal); border-color: rgba(82,184,172,0.5); }
.ctx3 .arrow { color: var(--dim); }
.ctx3 .faded { opacity: 0.45; }

/* receipt */
.ctx3 .receipt-band { padding: 90px 0; border-top: 1px solid var(--line); }
.ctx3 .receipt-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 48px; align-items: center; }
@media (max-width: 860px) { .ctx3 .receipt-grid { grid-template-columns: 1fr; } }
.ctx3 .receipt {
  background: var(--field-2); border: 1px solid var(--line); border-radius: 14px;
  font-family: var(--mono); font-size: 13px; padding: 24px; color: var(--dim);
}
.ctx3 .receipt .line { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px dashed var(--line); }
.ctx3 .receipt .line:last-of-type { border-bottom: none; }
.ctx3 .receipt .total { color: var(--paper); font-weight: 600; }
.ctx3 .receipt .save { color: var(--amber); }
.ctx3 .receipt .strike { text-decoration: line-through; opacity: 0.6; }

/* pricing */
.ctx3 .pricing { padding: 90px 0; border-top: 1px solid var(--line); }
.ctx3 .plans { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 24px; margin-top: 44px; max-width: 820px; }
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
.ctx3 .faq { padding: 80px 0 100px; border-top: 1px solid var(--line); max-width: 760px; }
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
.ctx3 footer { border-top: 1px solid var(--line); padding: 32px 0 44px; display: flex; justify-content: space-between; gap: 20px; flex-wrap: wrap; color: var(--dim); font-size: 13.5px; }
.ctx3 footer nav { display: flex; gap: 22px; }
.ctx3 footer a:hover { color: var(--paper); }
`;

/* ── Hero tree data ───────────────────────────────────────────────────── */

type TreeNode = {
  id: string;
  parent: string | null;
  x: number; // % of container width
  y: number; // % of container height
  chip: string;
  text: string;
  sub?: string;
  tone?: "teal" | "amber";
};

const NODES: TreeNode[] = [
  { id: "n1", parent: null, x: 2, y: 0, chip: "GPT-5", text: "Why do transformers use attention instead of recurrence?" },
  { id: "n2", parent: "n1", x: 2, y: 24, chip: "GPT-5", text: "Attention lets every token look at every other token at once…" },
  { id: "s1", parent: "n2", x: 54, y: 38, chip: "side question", text: "Wait — what exactly is a token?", sub: "context: its own lineage only", tone: "teal" },
  { id: "n3", parent: "n2", x: 2, y: 52, chip: "GPT-5", text: "Now explain multi-head attention like I'm rusty on linear algebra." },
  { id: "c1", parent: "n3", x: 54, y: 74, chip: "→ continued on Claude", text: "Same thread, second opinion. Full context came along.", sub: "carried: summary + lineage", tone: "amber" },
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

  // Edge anchor points (in % coordinates, matching node positions).
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
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
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
          className={`node ${n.tone ? `node-${n.tone}` : ""} ${focus && lit.has(n.id) ? "lit" : ""}`}
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
      <span className="tree-hint">hover a node — only its own lineage lights up. that&apos;s scoped context.</span>
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
          <a href="/" className="mono" style={{ fontSize: 15, fontWeight: 600 }}>
            <span style={{ color: "var(--amber)" }}>⌥</span> context tree
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
            <h1 className="display">Explore in every direction.</h1>
            <p className="lede">
              Context Tree is an AI studio built on one rule: <strong>every branch
              carries only its own history.</strong> Ask side questions without
              polluting your main thread. Move any conversation to another AI
              mid-thought. Compare directions and keep the best one.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 30, flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={start}>Start free — bring your key</button>
              <a className="btn btn-ghost" href="#moves">See the three moves</a>
            </div>
            <p className="trustline">
              <b>your keys</b> · <b>your data</b> · export anytime · no card required
            </p>
          </div>
          <HeroTree />
        </section>
      </div>

      <div className="wrap moves" id="moves">
        <span className="eyebrow" style={{ color: "var(--dim)" }}>Three moves no chat app has</span>

        <div className="move">
          <div>
            <span className="eyebrow">01 · Continue on another AI</span>
            <h3>Started with GPT. Want Claude&apos;s take? One click.</h3>
            <p>
              Branch any message onto a different model — GPT, Claude, Gemini,
              Groq. The branch carries a scoped summary of everything that
              matters, so the new AI picks up mid-thought instead of from zero.
              Your conversation stops being hostage to one provider.
            </p>
          </div>
          <div className="diagram" aria-hidden="true">
            <div className="row"><span className="pill">GPT-5 · main thread</span></div>
            <div className="row"><span className="arrow">└─</span><span className="pill amber">branch → Claude</span><span>carries: summary + lineage</span></div>
            <div className="row faded"><span className="arrow">└─</span><span className="pill teal">branch → Gemini Flash</span><span>same context, cheaper take</span></div>
          </div>
        </div>

        <div className="move">
          <div>
            <span className="eyebrow teal">02 · Side questions stay side questions</span>
            <h3>Ask the dumb question. Your main thread never sees it.</h3>
            <p>
              Learning something hard means constant detours — &quot;wait, what does
              that word mean?&quot; In a normal chat every detour pollutes the context
              and the answers drift. Here a side question is its own branch:
              ask, understand, come back. The main thread stays exactly where
              you left it.
            </p>
          </div>
          <div className="diagram" aria-hidden="true">
            <div className="row"><span className="pill">main thread</span><span className="arrow">──────</span><span className="pill">still clean ✓</span></div>
            <div className="row"><span className="arrow">└─</span><span className="pill teal">side question</span><span>sees its lineage, nothing more</span></div>
          </div>
        </div>

        <div className="move">
          <div>
            <span className="eyebrow">03 · Compare and keep the best</span>
            <h3>Fork the decision. Read both. Promote the winner.</h3>
            <p>
              Two ways to explain it, refactor it, or write it? Run both branches
              side by side — even on different models — then promote the one that
              works and compile the winning path into clean Markdown.
            </p>
          </div>
          <div className="diagram" aria-hidden="true">
            <div className="row"><span className="pill amber">Version A</span><span className="pill teal">Version B</span><span className="arrow">→</span><span className="pill">promote B</span></div>
            <div className="row"><span className="arrow">→</span><span>compile path → export.md</span></div>
          </div>
        </div>
      </div>

      <div className="wrap receipt-band">
        <div className="receipt-grid">
          <div>
            <span className="eyebrow">Scoped context is cheaper context</span>
            <h2>Stop re-paying for history your question doesn&apos;t need.</h2>
            <p className="lede">
              A long linear chat re-sends everything, every turn. A branch here
              sends only its own lineage. You bring your own API key — so the
              tokens you don&apos;t send are money you don&apos;t spend.
            </p>
          </div>
          <div className="receipt" aria-label="Token cost comparison">
            <div className="line"><span>one long linear chat</span><span className="strike">48,210 tok / turn</span></div>
            <div className="line"><span>same work, branched &amp; scoped</span><span className="total">19,830 tok / turn</span></div>
            <div className="line"><span>context you stopped re-sending</span><span className="save">−59%</span></div>
            <div className="line" style={{ borderBottom: "none", paddingTop: 12 }}>
              <span style={{ fontSize: 11.5 }}>independent research measured ~58% context reduction from branching (arXiv:2512.13914)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="wrap pricing" id="pricing">
        <span className="eyebrow">Pricing</span>
        <h2>Pay once. Bring your key.</h2>
        <p className="lede">No subscription required. Your API key does the AI work; the license buys the studio.</p>
        <div className="plans">
          <div className="plan">
            <span className="name">Free</span>
            <div className="price display">$0</div>
            <div className="per">forever · bring your own key</div>
            <ul>
              <li>2 canvases</li>
              <li>All core moves: branch, side questions, switch AI</li>
              <li>Compare &amp; compile export included</li>
              <li>Your data, exportable always</li>
            </ul>
            <button className="btn btn-ghost" onClick={start}>Start free</button>
          </div>
          <div className="plan founding">
            <span className="name">Founding license</span>
            <div className="price display">$59</div>
            <div className="per">one time · first 100 explorers · then $79</div>
            <ul>
              <li>Unlimited canvases</li>
              <li>Codex: pinned context cards per canvas</li>
              <li>Import your ChatGPT history</li>
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
              It has a fork button — each fork becomes another flat chat lost in
              your sidebar, on the same model, with no map. Context Tree gives
              you the tree itself: see every branch, scope what each one knows,
              switch models mid-thought, compare, and export. The button makes a
              copy; the canvas manages an exploration.
            </p>
          </details>
          <details>
            <summary>What does &quot;bring your own key&quot; mean?</summary>
            <p>
              You paste your own API key (OpenAI, Anthropic, Google, or Groq) and
              pay the provider directly for what you use — usually far less than
              a $20/month subscription. Keys are stored encrypted and used only
              to make your requests.
            </p>
          </details>
          <details>
            <summary>Who owns my conversations?</summary>
            <p>
              You do. Export any canvas or your entire account as Markdown/JSON
              at any time, and delete everything with one action. We don&apos;t train
              on your data or sell it.
            </p>
          </details>
          <details>
            <summary>Is $59 really one-time?</summary>
            <p>
              Yes — the license is yours. An optional cloud-sync subscription may
              come later for people who want cross-device backup, but the studio
              you buy never expires. 14-day refund, no questions.
            </p>
          </details>
          <details>
            <summary>Who is this for?</summary>
            <p>
              Explorers: learners untangling hard topics, coders comparing
              approaches, researchers running parallel lines of inquiry, writers
              drafting a scene five ways. If your thinking branches, the tool
              finally matches it.
            </p>
          </details>
        </div>
      </div>

      <div className="wrap">
        <footer>
          <span className="mono"><span style={{ color: "var(--amber)" }}>⌥</span> context tree — explore in every direction</span>
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
