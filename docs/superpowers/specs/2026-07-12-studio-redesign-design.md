# Studio Redesign — Design Spec (2026-07-12)

Approved direction: **full studio redesign, dark-first, incremental layers.**
Owner granted license to redesign everything (UI and frontend structure);
backend contracts stay as-is. Derived from `V2/04-REDESIGN-SPEC.md` §3/§4/§9/§10
plus an ease-of-use layer the owner asked to include.

North star: value lives in the first linear chat; branching is leverage you
reach for. Color means *lineage* and *cost*, never decoration.

## Steps (each independently shippable, one commit each)

### Step 1 — REMOVE sweep (pure deletion + reference fixes)
- Routes deleted: `/waitlist`, `/admin`, `/chatgpt-alternative`, `/canvas-demo`,
  `/node-showcase`, `/integration-guide`, `/user-limit-reached`, `/profile`
  and APIs: waitlist, reports, admin user-limit.
- Components deleted: simulation panel + engine, version-history panel,
  global search, node palettes, showcase, `canvas-area-{enhanced,reactflow,smooth}`,
  landing variants (`landing-page*.tsx` — keep `landing.tsx`), LiquidEther,
  StarBorder, reactbits-effects, product-demo-animation, aos-provider,
  conversation-tester, conversation-flow-validator.
- Node sprawl: delete all node variants not imported by `canvas-area.tsx`.
- Dead data layer: `lib/mongodb.ts` naming fix deferred; Mongo scripts + deps die.
- Deps pruned: `three`, `aos`, anything only the deleted files imported.
- Canonical URL fix: `contexttree.app` → `contexttree.tech` in layout/sitemap/robots.
- Verification: build passes; grep proves no dangling imports; deleted routes 404.

### Step 2 — Design tokens + studio chrome (dark-first)
- CSS-variable token set; light mode re-values the same variables:
  surfaces `#0A0A0B` / `#121214` / `#1A1A1D`, hairline white/8%;
  text tiers `#EDEDEF` / `#A0A0A8` / `#6B6B74`;
  indigo-violet accent (actions/focus/selection ONLY);
  8-hue muted lineage wheel; rose=over-budget, emerald=savings.
- Inter; `rounded-2xl` cards, `rounded-lg` controls; 150–200ms ease-out.
- Shell restyle: top bar (canvas name, sync indicator, theme toggle, user menu),
  left sidebar (canvas list; Codex section placeholder), right console.
- Gradients remain landing-only.

### Step 3 — Canvas redesign (the product's face)
- Node types collapse to two: `chat` (entry/branch unified) and `codex-card`
  (styling placeholder until F2).
- Chat card (~260px): full-height lineage stripe (left edge), editable branch
  name, model chip, 2-line last-message snippet, footer: token/cost badge +
  message count + streaming pulse dot. Selection = accent ring.
- Edges: parent→child bezier, animated only while streaming; dashed for
  future codex attachments.
- Dagre tidy-tree auto-layout per root; manual drag persists; "Re-tidy" per tree.
- Minimap restyled. Empty-canvas state designed (see Step 5 linear-first).

### Step 4 — Console rebuild
- Split `contextual-console.tsx` (1,696 lines) → `console/header.tsx`,
  `console/chat-tab.tsx`, `console/fork-dialog.tsx` (tab shell ready for F4/F2).
- Header: clickable lineage breadcrumb, inline rename, model switcher popover,
  overflow menu (rename / export from here / delete).
- Chat mechanics (streaming, markdown) unchanged.

### Step 5 — Ease-of-use layer (owner-requested)
- **Linear-first first-run**: a new/empty canvas opens as a single centered
  chat (deliberate ChatGPT familiarity); canvas chrome reveals after the
  first fork. Anti-canvas-fatigue centerpiece.
- **⌘K jump**: scoped command palette — canvases + branches by name
  (replaces deleted global search).
- **Keyboard**: `⌘B` branch-from-focused-message, `⌘Enter` send, `Esc` closes.
- **Empty states**: canvas (one-click starter prompt), console (explain scope).
- **Provider-error banner**: names the failing provider, one-tap switch to
  another configured model (surface the dispatcher fallback honestly).
- **Destructive safety**: leaf-delete only; whole-tree delete needs typed
  confirmation; everything else gets undo-style toasts.
- Onboarding overlay (≤4 steps, skippable, never returns) reusing
  `onboarding-guide.tsx` if salvageable, else rebuilt small.

## Deferred (later phases)
F1 compare/promote, F2 Codex, F4 context/cost inspector tab, F7 templates,
F6 import, serif reading mode, streaming-resume (backend-coupled).

## Verification per step
`tsc` introduces no NEW errors (451 pre-existing), `next build` passes,
prod click-through after deploy: load canvas → send message → fork → rename.
Step 1 also: grep for imports of every deleted file returns nothing.
