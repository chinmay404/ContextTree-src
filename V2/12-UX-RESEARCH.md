# V2 — Competitor UX Research (2026-07-12)

Web research (agent-assisted) on branching-AI-chat competitors, user demand
evidence, and UI patterns. Informs the studio redesign
(`docs/superpowers/specs/2026-07-12-studio-redesign-design.md`).

## Strategic read

ChatGPT shipping flat forks (Sept 2025) validated branching and defined its
own ceiling: **no tree view, no naming, no merge/promote, no cost
visibility**. Every gap users name is already on our roadmap. The biggest
un-derisked threat is **canvas fatigue** — and its fix (linear-first entry,
auto-layout, templates, reading mode) is an onboarding problem, not a
feature problem.

## Per-competitor observations

**Flowith** — closest canvas competitor. Spatial layout praised but takes
15–20 min to click; #1 complaint is the opaque credit system (credits burn,
expire, don't roll over) — our BYOK + cost inspector is a direct wedge.
"Overwhelms users seeking simple chat"; weak mobile. Mid-conversation model
switching praised (validates per-node model switch).

**ChatGPT branching** — launch reaction "finally!" (mainstream demand
proven). Criticism: no map/graph of branches, no naming, no merge-back,
unnavigable at scale. Long-standing rage: accidental regenerate deletes
later history. Canvas "gobbles tokens" — users are cost-aware.

**LibreChat** — 3 fork modes = "very difficult to understand"; accidental
forks destroy trust. Tree-in-linear-UI fails (opening a chat defaults to
latest branch; others invisible). Users beg to "visualize the tree flow".
Shipped a branch-aware context-window gauge + token/cost breakdown beside
the input (PR #13670) — study for F4.

**Msty** — branch tree in a LEFT SIDEBAR (compact tree affordance coexists
with familiar chat pane). Split-chat model comparison is its praised
differentiator; power-user only.

**Obsidian Chat Stream** — "generate from note + ancestors" = our
lineage-scoped context, validated niche. Users prize CONTROL over which
context gets sent. All plugins fail on polish/cost visibility — demand
exists, product doesn't.

**Poe/TypingMind** — model access, not thought structure. Poe complaints:
cluttered management, 15-model dropdown overwhelm, credit lock-in.

**Indie tree-chat (Nodea, Grafychat, Canvas Chat, forky)** — every Show HN
gets "I've wanted exactly this" + "this makes things more complicated".
Praised details: try-without-signup, reply-popup on node (answer without
opening), drag-drop context. Warnings: backdrop-filter blur lags laptops;
weak mobile; BYOK key-security anxiety. Canvas Chat's merge = multi-select
nodes, context = deduplicated union of ancestors (best published merge
model); forky = git-style 3-way merge with LCA.

## Top 10 user needs (ranked by evidence)

1. Side questions without polluting main thread → one-keystroke fork on any
   message, branch inherits lineage only.
2. SEE the tree → always-visible tree/minimap, never buried.
3. Regenerate/edit must never destroy history → regeneration creates a new
   sibling node; nothing is ever overwritten.
4. Name branches → auto-suggested name at fork time, inline-editable.
5. Merge/promote a winner → promote-to-main + multi-select merge
   (union-of-ancestors context).
6. Cost/context transparency → per-node token gauge + running cost beside
   composer.
7. Control what context gets sent → inspectable, editable context list per
   node.
8. Compare models on same prompt → fork-into-N-models, synced side-by-side
   panes, pick winner.
9. Low-friction entry → playground before auth; BYOK asked only at first
   send that needs it.
10. Export the good path → leaf → Markdown of lineage.

## Steal these 5 patterns

1. **LibreChat context gauge** → console composer: compact gauge; click
   expands system/codex/lineage/response token split with $ (F4).
2. **Arena synced compare panes** → compare view: simultaneous streams,
   winner gets "Promote", losers collapse (F1).
3. **Linear's theming + ⌘K** → near-black substrate (#08090a-class),
   hairline borders, ONE accent; every action reachable via ⌘K.
4. **Template entry + Msty sidebar tree** → never open a blank canvas:
   first-run linear chat that BECOMES a canvas on first fork; 3 seeded
   templates.
5. **Grafychat reply-popup** → node hover popup: reply/fork without
   zoom-navigating to the node.

## Anti-patterns (avoid)

1. **Fork-mode multiplicity** — ONE fork gesture, one default semantic
   (lineage-scoped). Variants behind ⌘K, never a decision modal.
2. **Canvas-first onboarding / freeform spatial chaos** — auto-layout the
   tree (users position nothing by default), linear "reading mode" for any
   path, constrain rather than celebrate infinity.
3. **Decorative GPU-heavy dark UI** — no backdrop-blur glassmorphism on the
   canvas; flat near-black surfaces + hairline borders (Linear). Calm comes
   from hierarchy, not blur.

## Design deltas applied to our spec

- Step 2 tokens: adopt flat surfaces, remove existing `backdrop-blur-xl`
  from the top bar; hairline borders.
- Step 3 node card: add hover reply/fork popup; regenerate-as-sibling
  noted for the console.
- Step 4: fork stays ONE gesture; auto-suggest branch name at fork.
- Step 5: linear-first entry is confirmed as the highest-leverage item;
  ⌘K exposes every canvas action, not just navigation.
