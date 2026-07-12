# V2 — Redesign Spec (UX, every screen and flow)

Executes `03-PRODUCT-DECISION.md`. Component/file names refer to
`ContextTree-src/`. Design principle throughout: **value in the first
linear chat; branching is leverage you reach for, never homework you do
first** (anti-canvas-fatigue, research §7).

---

## 1. Information architecture (after cuts)

```
/                    Landing (ONE page, rewritten copy — see §8)
/studio              The app (canvas + console). Auth required.
/pricing             3 tiers (Free / Founding $59 / Sync teaser)
/privacy, /terms     Trust surface (F8)
/auth/signin         Google OAuth (unchanged)
/import              ChatGPT import wizard (F6)
```
Deleted routes: /waitlist, /admin, /chatgpt-alternative, /canvas-demo,
/node-showcase, /integration-guide, /user-limit-reached (replaced by an
in-app modal), /profile (folded into a settings sheet in /studio).

## 2. First-run experience (F7) — the churn gate

New user lands in /studio with a **choice of 3 template canvases** (not an
empty canvas — empty canvas is the #1 canvas-fatigue trigger):

1. **"Plot decision"** — a root node with a scene prompt + two pre-named
   empty branches ("Version A — she opens the letter", "Version B — she
   burns it"). Teaches fork-compare-promote in one glance.
2. **"Research question"** — root + branches per line of inquiry.
3. **"Blank"** — for returners; starts as a single centered chat box
   (looks like ChatGPT — deliberate familiarity), the canvas chrome fades
   in only after the first fork.

Overlay walkthrough (4 steps max, skippable, never returns): send a
message → hover a message → "Branch from here" → name the branch. Under
60 seconds. Completion = the activation event we track.

BYOK setup is **deferred**: templates run on a free-tier server key
(Groq, hard-capped ~20 messages/day/user) so the first value moment
requires zero setup; the key dialog appears at the cap with "your key,
your models, no limits."

## 3. The canvas (ONE implementation: `canvas-area.tsx` on @xyflow/react v12)

Delete `-enhanced`, `-reactflow`, `-smooth` variants. Changes to the keeper:

- **Node card** shows: branch name (editable inline), model chip, last
  message snippet (2 lines), token/cost badge (F4), and a colored lineage
  stripe (each root gets a hue; descendants inherit a tint — instant
  visual "which tree am I in").
- **Edges**: parent→child only, bezier, animated only while streaming.
  Codex attachments render as a subtle dashed edge (toggleable off).
- **Branch action is on the MESSAGE, not the node** (kept from V1's last
  commits — branch from any user or AI message). One keyboard accelerator:
  `⌘/Ctrl+B` on the focused message.
- **Minimap** stays; node palette, drag-from-palette, custom node shapes,
  showcase nodes: deleted (06-CUT-LIST).
- Layout: new branches auto-position (dagre tidy-tree per root); manual
  drag persists per node. "Re-tidy" button per tree.
- Canvas holds **positions/viewport only** — all content state lives in
  normalized tables (kills audit A2's dual-write; see 05-ARCHITECTURE §4).

## 4. The console (right pane, `contextual-console.tsx` — decomposed, see §7)

Header: breadcrumb of lineage (root → … → this branch, clickable),
branch name inline-edit, **model switcher** (F5 — changing it affects
next turns only, recorded per message), overflow menu (rename, export
from here, delete branch).

New tabs under the header:

- **Chat** (default) — streaming markdown, unchanged mechanics.
- **Context** (F4, the differentiator surface) — read-only inspector
  showing exactly what the next turn sends: system prompt, Codex cards
  attached, rolling summary, last-K verbatim, retrieved snippets — each
  block with its token count and the total vs. model context window, plus
  "vs. one linear chat: −N tokens (~$X.XX saved this canvas)".
  This is V1's `prompt-preview-panel.tsx` + `use-prompt-assembly.ts`
  grown into the product's honesty organ.
- **Codex** (F2) — cards attached to this branch (toggle per card).

## 5. Codex (F2) — replaces the file-RAG surface for launch

Left sidebar gets a **Codex section** per canvas: text cards with a title,
body (markdown), and a color tag (Character / World / Style / Fact).

- Attach/detach per node via the console's Codex tab; children inherit
  attachments at fork time (then diverge freely — same semantics as all
  scoped context).
- Backend: cards are `context_cards` rows; injection reuses the existing
  external-context path (`contextNodeIds` request field → renamed
  `context_card_ids`), embedded once at save for retrieval when a card
  exceeds the always-include size (~400 tokens).
- PDF/docx upload: **deferred post-launch** (audit P3/A7 debt stays cut).
  Paste-into-card covers the writer persona day one.

## 6. Compare & compile (F1, F3) — the two flows that justify the price

**Compare:** select 2–3 sibling branches (shift-click on canvas, or
"Compare siblings" in console) → modal with columns: branch name, model
chip, cost, and the branch's messages since the fork point, scroll-synced.
Footer per column: **"Continue this one"** (focuses that node) and
**"Promote"** (marks winner; losers collapse to dots on canvas —
recoverable, never deleted).

**Compile:** from any node: "Compile path" → ordered view of the
root→here lineage messages → checkboxes (default: all assistant messages
on the path) → export as **Markdown** (clean prose, no metadata) or
**JSON** (full fidelity). Runs client-side from loaded data; zero backend.

## 7. Component surgery (the code side of this spec)

`contextual-console.tsx` is a god-file (chat + ForkDialog + panels).
Split into: `console/chat-tab.tsx`, `console/context-tab.tsx`,
`console/codex-tab.tsx`, `console/fork-dialog.tsx`, `console/header.tsx`,
`compare/compare-modal.tsx`, `compile/compile-dialog.tsx`.
Keep: `model-selection-panel.tsx`, `model-badge.tsx`,
`advanced-settings-panel.tsx` (unchanged behind an "Advanced" disclosure —
writers never need it, prompt-lab users get it), `api-key-settings-dialog.tsx`,
`lib/advanced-settings.ts`, `hooks/use-byok-status.ts`.
Delete list with paths: `06-CUT-LIST.md`.

## 8. Landing page (ONE, rewritten — **PRIORITY #1, ships first**)

(Repositioned 2026-07-12: explorer-first, per 03 §1 LOCKED decision.
This is now the first deliverable of the 30 days, not day 21.)

Hero: headline **"Explore in every direction."** Sub: "The AI studio for
people who think in branches — ask side questions without polluting your
main thread, move any conversation to another AI mid-thought, and pay for
only the context each branch needs. Your keys. Your work. Exportable
always." Visual: a real tree screenshot / clean CSS mock (no 3D shaders).

Feature sections, in this order:
1. **Continue on another AI** (F0a) — "Started in ChatGPT-style chat,
   want Claude's take? One click. The branch carries your context across
   providers." (the most unique feature leads)
2. **Side questions stay side questions** (F0b) — main thread never
   polluted.
3. **Compare and keep the best** (F1) — fork, compare side by side,
   promote the winner.
4. **The cost meter** — scoped context = fewer tokens = smaller API bill;
   "saved vs one long chat".
5. **Codex + compile-a-path export** (F2/F3) — pinned context, clean
   Markdown out.
Then: pricing (Free / Founding $59), FAQ (BYOK, privacy, export, refunds).
No waitlist — direct signup. Delete `three`, `LiquidEther`, `StarBorder`,
`aos`, `product-demo-animation` when the old variants die.

## 9. Visual language

Keep Session-4's direction (rounded-2xl cards, indigo-violet accent) but
**calm it**: gradients only on the landing page; inside the studio,
neutral surfaces, color reserved for lineage stripes and cost states
(rose = over budget — kept from V1). Light+dark from day one (writers
write at night). Type: Inter UI / serif optional for message bodies
(reading comfort — test with beta writers).

## 10. Empty/error/edge states (the polish that sells a $59 license)

- Streaming failure: partial text kept, inline "Resume" (re-send with
  context) — never a silent vanish.
- Provider key invalid/quota: inline banner naming the provider + one-tap
  switch to another configured model (dispatcher already falls back;
  surface it honestly instead of silently — change to V1 behavior).
- Deleting a node with children: children re-parent is NOT offered
  (lineage integrity); offer "collapse" instead; delete only leaf nodes or
  whole trees (with typed confirmation).
- Multi-tab: optimistic-concurrency version check per canvas save
  (05-ARCHITECTURE §4); on conflict, non-blocking "canvas updated
  elsewhere — reload" toast. localStorage message fallback: deleted.
- Big canvases (>60 nodes): tree-collapse at the root level + `⌘K`
  jump-to-branch by name (replaces the deleted global-search with a
  scoped, cheap version).
