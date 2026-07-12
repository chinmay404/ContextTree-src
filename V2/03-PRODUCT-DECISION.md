# V2 — Product Decision

This is the owner's call, made from the evidence in `02-MARKET-RESEARCH.md`
and the code reality in `01-CURRENT-STATE-AUDIT.md`. Everything downstream
(redesign, architecture, cuts, schedule) executes THIS document.

---

## 1. What Context Tree V2 is

> **Context Tree is the explorer's studio.** (LOCKED 2026-07-12, owner
> decision — explorer-first identity, not writer-first.)
> Think in every direction on one canvas. Ask side questions without
> polluting your main thread. Move any conversation to another AI
> mid-thought. Each branch carries only the context it needs — so
> exploration stays organized and your API bill drops instead of exploding.

One sentence for the landing page:
**"Explore in every direction. Switch AIs mid-thought. Never pollute
your context."**

The two headline features (owner's own daily pains — founder-market fit):

- **F0a — Continue on another AI**: one click branches the conversation
  onto a different provider (Claude ↔ GPT ↔ Gemini ↔ Groq), carrying the
  scoped summary + context. Nobody else does cross-AI conversation
  transfer; it is the single most unique feature we have and leads all
  marketing. (Technically: F5's dispatcher + the fork engine, surfaced
  as one button.)
- **F0b — Side question**: quick branch, ask anything, main thread stays
  untouched, come back clean. (Technically: F1's fork, named for the
  feeling.)

### What it is NOT (and must never be marketed as)

- ❌ "ChatGPT but with branching" — that pitch died 2025-09-04.
- ❌ A model-comparison tool — comparison is free everywhere.
- ❌ A general BYOK chat frontend — TypingMind + free OSS own that.
- ❌ An agent platform — Flowith has Sequoia money; we don't compete there.
- ❌ A node-programming/flow-builder tool — canvas is for *conversations*,
  not pipelines. No "simulation", no execution graphs.

## 2. Who it is for

**Product identity (LOCKED): explorers.** Learners, coders, researchers,
writers — anyone who thinks by exploring: side questions, "what ifs",
switching models mid-thought. The product speaks explorer to everyone;
the features F0a/F0b are the door.

**First paid marketing channel (unchanged): the AI-assisted long-form writer.**
Not because the product is "for writers" — because they're the explorer
subgroup with proven wallets, reachable in days. Money enters here first;
the product identity does not narrow to them.

Original writer-persona evidence (still valid for channel strategy):
Novelists, serial-fiction writers, screenwriters, worldbuilders using
LLMs daily. Evidence: they stack paid tools ($15–60/mo total), they cannot
self-host, branching is literally their workflow ("what if the scene goes
this way"), and they are reachable within days in known communities
(r/WritingWithAI, NovelCrafter/Sudowrite-adjacent Discords, writer X).

**Secondary user (same build, no extra features): the deep-work thinker** —
researcher, consultant, strategist running parallel lines of inquiry.
They arrive via the "ChatGPT branch tree view" complaint vocabulary
(SEO/content channel). They convert slower; do not build for them first,
do not block them either.

**Explicitly not targeted:** developers (self-host, don't pay), students
(churn), role-play/character chat (content and payment-processor risk —
also see policy note in §6).

## 3. The three differentiators (the moat, in order)

1. **Scoped context you can SEE and PROFIT from.** Each branch inherits
   only its lineage (V1 already does this correctly — audit §6). V2 makes
   it visible and financial: a per-node context inspector ("exactly what
   the model gets") and a token/cost meter with "saved vs. one long chat".
   No competitor can copy this narrative: credit-resellers and
   subscription incumbents are structurally paid NOT to save the user
   tokens. (Supporting research: 58% context reduction, arXiv 2512.13914.)
2. **The tree as a managed workspace, not a fork button.** Named branches,
   side-by-side comparison, promote-the-winner, compile-a-path export.
   ChatGPT/Gemini shipped forks with no map; the map is the product.
3. **Per-node model economics.** Draft branches on Groq/Gemini Flash for
   pennies, synthesize the chosen path on Claude/GPT-5. The 6-provider
   BYOK dispatcher (V1's best backend asset) makes this real today.

## 4. Feature decisions

### ADD in V2 (each maps to a paying-user demand, see 04-REDESIGN-SPEC)

| # | Feature | Why (evidence) |
|---|---------|----------------|
| F1 | **Named branches + side-by-side compare + promote winner** | #1 writer demand; the missing 20% on top of V1's fork engine |
| F2 | **Canvas Codex** — pinned context cards (characters, world rules, style guide) selectively attached per branch | NovelCrafter's most-loved feature; maps directly onto V1's context-node + scoped-injection machinery, text-first |
| F3 | **Compile-a-path → Markdown export** (docx post-launch) | Every branching tool's most-requested feature; turns a toy into a drafting tool |
| F4 | **Context inspector + cost meter** (per node: what's in context, tokens, $; per canvas: "saved vs linear") | The unclaimed economics narrative; doubles as internal cost accounting |
| F5 | **Model routing presets** ("Drafting: Flash / Synthesis: Claude") + in-console model switch on any node | Closes V1's known gap (audit P4) and powers differentiator #3 |
| F6 | **ChatGPT conversation import** (their JSON export → a canvas) | Kills switching cost for the exact user we poach; nobody else does it |
| F7 | **Guided first-run**: 3 template canvases (Plot decision, Research question, Prompt lab) + a 60-second "first fork" walkthrough | Anti-canvas-fatigue: value in the first session or churn |
| F8 | Trust surface: privacy page ("keys encrypted, chats are yours, export anytime"), visible data-export/delete | GrafyChat thread blockers: telemetry distrust; table stakes for one-time buyers |

### KEEP from V1 (verified good — audit §6)

Memory model (4 layers, watermark, lazy transactional fork), materialized
ancestry, 6-provider `get_llm()` + BYOK, SSE streaming path,
@xyflow/react v12 canvas (ONE variant), Stripe scaffolding,
advanced-settings normalization layer, LangSmith tracing.

### CUT (full inventory with file paths in 06-CUT-LIST.md)

Simulation panel, version-history panel, reports API, admin page, node
palette/customization sprawl, 3D/AOS landing effects, 4 duplicate landing
pages, 3 duplicate canvas implementations, waitlist flow, PDF file-RAG
pipeline (deferred — Codex text cards replace it for the writer persona;
files return post-launch behind a flag), NVIDIA in the UI (dispatcher
keeps it; picker hides it), dead Mongo code and deps, localStorage message
fallback.

## 5. Pricing (decided)

TypingMind's hybrid, weighted to one-time, priced inside the proven band:

| Tier | Price | Contents |
|------|-------|----------|
| **Free** | $0 | BYOK only, 2 canvases, all core features incl. export (export is trust, not upsell) |
| **Founding License** | **$59 one-time** (first 100; then "License" $79) | Unlimited canvases, Codex, import, priority fixes, founding badge |
| **Sync** (post-launch, ~day 45+) | $6/mo | Cross-device sync, cloud backup, early features — the recurring layer (TypingMind's sync tier alone: $15k MRR) |

- Payment: existing Stripe scaffolding; one-time checkout is LESS code
  than subscriptions (no proration/dunning).
- No AppSumo month one (30–70% rake); self-run founding deal instead.
- Break-even: infra target <$60/mo ⇒ **one license sale/month = profitable.**
  Honest month-one goal: 20–50 founding licenses ($1.2k–3k) from a
  writer-community launch that lands.

## 6. Policy note (owner's constraint)

The writer market borders role-play/companion chat. We serve fiction
*drafting*, we do not build companion features, we keep provider content
policies in force (BYOK means provider-side moderation still applies), and
marketing never targets the companion use case. This is both a risk and a
values decision; it is final.

## 7. Success criteria for the 30 days

1. **Day 30: revenue > infra** (≥1 sale; target 20+).
2. ≥10 external beta users who each created ≥3 branches and ≥1 export
   (activation metric — proves the loop, not just signups).
3. Zero cross-tenant data access (audit S1 fixed and TESTED).
4. A stranger can sign up, pay, and draft without talking to us.

## 8. Kill criteria (honesty with future-self)

If by day 60: <10 total sales AND <30% of activated users return in week 2
— stop building features, run 5 user interviews, and either reposition
once (consultant/deep-work angle) or wind down to maintenance mode.
Do not spend a second 30 days polishing without a signal.
