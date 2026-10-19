# Direction — Context Tree V3 ("the board")

_Started: 2026-10-19 by owner + Claude. Read this before any V3 design or build work.
STATE.md says where we are; this file says where we are going and why._

## The journey so far

| When | What happened |
|---|---|
| 2025 – 2026-04 | V1: branching AI chat on a canvas. Built when models were weaker. Whitepaper + blueprint PDFs in the workspace root. |
| 2026-07-12 → 07-24 | V2 relaunch (docs in `V2/`): explorer identity, BYOK, tenancy, Railway + Vercel, compare/promote, studio redesign, long bug-bash on lost-update / dual-writer bugs (checkpoints 001–020). |
| 2026-07-24 → 10-19 | Paused ~3 months. Never charged money (no Stripe), marketing kit written but not posted. |
| 2026-10-19 | Owner returns. Honest review: idea still valid, demand is proven by a competitor, but V2 never tested the market. Owner decides to continue with a V3 redesign. |

## The competitor that proves the market: Slashspace

Slashspace (slashspace.ai, formerly Rabbitholes AI, solo founder) is the product the owner
originally wanted to build. Desktop app, $89/yr or $249 lifetime, no free tier, claims 2,500+ users.
It is the **quality bar**, not a template — we do not clone its look.

What makes it feel clean (studied 2026-10-19; screenshots + demo frames saved locally, not in git:
`D:\code\context_tree\research\slashspace-2026-10-19\`):
- The chat lives inside the node on the canvas. No side panel.
- Sources are rich preview cards: YouTube (thumbnail + length), PDF (page preview + page count),
  web page (mini screenshot), each with a small "Ready" status.
- Dotted orange "wires" from a source into a chat = that chat reads it. Colour means "connection".
- Bottom dock to add node types (chat, note, image, video, file, web, search). Free placement,
  align tools, zoom control.
- Restraint: one typeface (IBM Plex Sans), warm off-white, grey text, one accent.

What its landing page does so you understand without reading:
pain line ("Chat scroll is not built for big problems") → outcome H1 → real product video
right under the hero → each feature is a small live canvas with one bold line + one sentence →
proof (PH badges, logos, user count, wall of love) → founder's note in a human voice → plain pricing.

Gaps we can own: web (no install), free BYOK tier, shareable boards (theirs is "coming soon"),
the token-saving context engine, compare/promote.

## Why people branch (owner's own reasons, 2026-10-19)

1. Ask a different question with the same context.
2. See how the answer changes if one more thing is added.
3. Backtrack: see how the thinking went and where each question came from.

The Desks prototype maps these to Branch, What if, and the Trail.

## V3 goals

1. **The board.** A detective-board canvas: chats, files, videos, links and notes pinned on one
   surface, connected by strings. A string into a chat means "this chat reads that".
2. **Open any card big.** Any node can open full-screen to read and chat comfortably; Esc returns
   to the board. This is our twist — Slashspace makes you read long answers inside small cards.
3. **Sources as first-class cards.** File (PDF/doc), link (web page), video (YouTube), note, image.
4. **Keep the context engine.** Lineage-scoped branches, continue on another AI, per-branch model +
   system prompt, compare/promote, token savings. These are what we have that others don't.
5. **Clean, not AI slop.** Calm, restrained UI at Slashspace's quality level, with our own identity.
6. **A landing page that shows instead of tells.** Real product footage, one clip per feature.

## Non-goals (for now)

- Feature parity with Slashspace: no orchestrator/sub-agents, no MCP/Composio app connections,
  no desktop app.
- Teams / real-time collaboration.
- Node-programming / pipeline builder (V2 rule still holds: the canvas is for thinking, not execution graphs).

## Anti-goals (would be a failure even if it "works")

- Looks like a generic AI-built app: purple-on-black, gradient text, three identical feature cards.
- Looks like a Slashspace clone.
- Loses data: a card, branch or string that vanishes. (V2's checkpoints 010–020 were this.)
- Months of building again without anyone paying.

## How we are working (owner's process, decided 2026-10-19)

**Design first, backend second.**

1. **Design rounds (frontend only, mock data, no backend changes).** Build the board and its cards
   on a throwaway branch/route with fake data; owner reacts to screenshots; iterate. Suggested
   rounds — each ends with decisions logged in `DECISIONS.md`:
   - R1 Board surface + chat card (idle, streaming, selected, branched states)
   - R2 Source cards (file, link, video, note, image) + strings
   - R3 Full-screen card view (reading, chatting, its sources visible, lineage breadcrumb)
   - R4 Dock / toolbar, adding cards, empty board, first-run
   - R5 Visual system lock (type, colour, light/dark, motion)
2. **Freeze the design** into a written spec (`docs/superpowers/specs/`).
3. **Then the backend**, shaped by the frozen design: single writer (FastAPI owns all canvas/node/
   edge/message writes — V2 arch §, never done), saved card positions, link/YouTube ingestion.
4. **Then build for real**, landing page, payments, launch.

## Open questions (answer during the design rounds)

- Chat inside the card on the board (Slashspace-style), or cards are previews and chat happens only
  in the full-screen view?
- Light-first or dark-first? (V2 was dark-first.)
- How literal is "detective board" — pins, paper, red string — or only the idea of it?
- Who is the first user the board is designed around (researcher, student, writer)?
