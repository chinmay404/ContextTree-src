# Context Tree V2 — Roadmap

**Written 2026-07-12.** Full-freedom redesign of Context Tree with one
target: **profitable within 30 days of execution start** (revenue > infra),
built on real market research and an honest audit of the V1 codebase.

## The decision in three sentences

Context Tree V2 is **the explorer's studio** — for anyone who thinks in
branches (learners, coders, researchers, writers): ask side questions
without polluting your thread, move any conversation to another AI
mid-thought. Sold at **$59 one-time (BYOK)**, with AI-assisted long-form
writers as the *first marketing channel* (they have the proven wallets) —
not "ChatGPT with branching" (natively sherlocked Sept 2025), not a
comparison tool (free everywhere), not an agent canvas (Flowith's VC turf). The moat is
the one narrative nobody else can tell: **scoped per-branch context that
visibly saves the user money**, plus branch management (compare/promote/
compile-export) that the incumbents' flat fork buttons lack. V1's memory
engine and multi-provider dispatcher survive untouched; ~40% of the
frontend surface, the client-trusted `user_id` hole, and the dual-write
architecture do not.

## Reading order

| Doc | What it answers |
|-----|-----------------|
| [01-CURRENT-STATE-AUDIT.md](01-CURRENT-STATE-AUDIT.md) | What V1 actually is; every security/architecture/product defect, verified against code |
| [02-MARKET-RESEARCH.md](02-MARKET-RESEARCH.md) | Competitive landscape + demand/monetization evidence, with sources |
| [03-PRODUCT-DECISION.md](03-PRODUCT-DECISION.md) | Persona, positioning, pricing, feature add/keep/cut verdicts, success & kill criteria |
| [04-REDESIGN-SPEC.md](04-REDESIGN-SPEC.md) | Every screen and flow: onboarding, canvas, console, Codex, compare, compile, landing |
| [05-ARCHITECTURE-V2.md](05-ARCHITECTURE-V2.md) | Trust boundary (JWT), single-writer, schema v2, migrations, tests, ops |
| [06-CUT-LIST.md](06-CUT-LIST.md) | Every deletion with its reason |
| [07-30-DAY-PLAN.md](07-30-DAY-PLAN.md) | Day-by-day execution, budget, pre-decided risk responses |
| [08-CHECKPOINT.md](08-CHECKPOINT.md) | Resume log — read first; what's done, blocked, and next |
| [09-FEATURES.md](09-FEATURES.md) | Plain-language give / remove / update feature list |
| [10-CONTEXT-PIPELINE.md](10-CONTEXT-PIPELINE.md) | How each branch's prompt is built — the four memory layers, scoped retrieval, diagrams |

## The eight features V2 ships

F1 named branches + compare + promote · F2 Canvas Codex (pinned context
cards) · F3 compile-a-path Markdown export · F4 context inspector + cost
meter · F5 per-node model switching + routing presets · F6 ChatGPT import ·
F7 template-canvas onboarding · F8 trust surface (privacy, export-all).

## Non-negotiables (in priority order)

1. Week 1 security work (backend currently trusts client-supplied user_id).
2. Tenancy isolation tests before any external user.
3. F1/F2/F3 — the three features the paying persona demonstrably wants.
4. Community presence starts day 8, not launch day.
