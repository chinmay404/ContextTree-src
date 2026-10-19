# Decisions — Context Tree

Append at the bottom. Never edit or delete a row — if a decision is reversed, add a new
row saying so. Past ~80 rows, move the oldest into `DECISIONS-<year>.md` and link it here.

| Date | Decision | Why | Who | Ref |
|---|---|---|---|---|
| 2026-07-12 | Identity: "the explorer's studio" — branch freely, side questions, continue on another AI | Owner's own daily pains; avoids the "ChatGPT with branching" pitch | owner | `V2/03-PRODUCT-DECISION.md` |
| 2026-07-12 | Pricing model: free with own API key (BYOK); paid "Founding" one-time license planned | BYOK can sell token savings; credit resellers can't | owner | `V2/03-PRODUCT-DECISION.md` |
| 2026-07-12 | Target: FastAPI becomes the only writer of conversation tables | Two writers cause lost updates | owner + agent | `V2/05-ARCHITECTURE-V2.md` |
| 2026-07-12 | Single-writer rewrite deferred; ship surgical fixes instead | High churn on a live app | owner | `V2/08-CHECKPOINT.md` 007 |
| 2026-07-13 | Canvas is auto-aligned only (dagre); dragging and Tidy removed | Owner preference at the time | owner | `V2/08-CHECKPOINT.md` 011 |
| 2026-10-19 | Continue the project with a V3 redesign | Slashspace proves people pay for this; V2 never tested the market | owner | `context/DIRECTION.md` |
| 2026-10-19 | Slashspace is the quality bar, not a template — do not clone its look | Need our own identity; clone = anti-goal | owner + Claude | `context/DIRECTION.md` |
| 2026-10-19 | V3 canvas is a "detective board": chats, files, videos, links, notes pinned together, strings carry context | Owner's vision; lets sources become visible context | owner | `context/DIRECTION.md` |
| 2026-10-19 | Any card can open full-screen and return to the board | Reading/chatting in small cards is cramped; our twist vs Slashspace | owner | `context/DIRECTION.md` |
| 2026-10-19 | Keep all existing context features (lineage scope, other-AI continue, per-branch model, compare/promote) | They are the differentiator | owner | `context/DIRECTION.md` |
| 2026-10-19 | Design first (canvas + cards, mock data, iterate with screenshots), backend after the design is frozen | Design should decide what the backend needs, not the reverse | owner | `context/DIRECTION.md` |
| 2026-10-19 | Project memory lives in `context/` (CKIC) so any agent can pick up | Owner wants decisions, journey, goals recorded for handoff | owner | this commit |
| 2026-10-19 | Chat nodes show the whole conversation on the board (not a summary card); any node still opens full-screen | Owner's Slashspace screenshots: summary cards felt wrong | owner | `docs/design/board-prototype-v3.html` |
| 2026-10-19 | Visual system = owner's "Context nodes · UI vocabulary": warm near-black, Geist/Geist Mono, excerpt cards 340×120 with type miniatures, S/M/L sizes, stacks, 10×16 ports, grey edges whose colour/dash/weight carry state | Owner loved it; it shows what the model reads (excerpts, locators) | owner | prototype v3 |
| 2026-10-19 | Keep the prototype's motion: spring drag with momentum, swinging edges, full-screen morph, flowing edges while a chat reads | Owner: "I love the node movement and edge animation" | owner | prototype v3 |
| 2026-10-19 | Must not look like Slashspace: no name pills above nodes, no detached reply box under chats, no floating toolbar above nodes, no bottom dock, no screenshot thumbnails | Owner directive; those are Slashspace's layout signatures | owner | prototype v3 |
| 2026-10-19 | Light theme dropped for now (design system is dark-only) | Design system defines dark tokens only | Claude (owner to confirm) | — |
