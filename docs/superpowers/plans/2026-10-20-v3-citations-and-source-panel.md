# V3 — real citations and the source side panel (owner request, 2026-10-20)

Owner: "maybe we can open this source here on the right in the same panel … even if user clicks any citation we can
open it at right with the exact text they have referred to." Owner decisions: PDFs show the **real PDF page** with the
passage highlighted (not just extracted text); the Connected-sources **eye** opens the same panel.

Contract: `docs/superpowers/plans/2026-10-19-v3-api-contract.md`, "Amendment 2026-10-20: citations and source passages".
Process as before: one task at a time per repo, TDD, task review, fix rounds; engine tasks run in the engine repo while
board tasks run in the board repo.

## Engine (repo `D:\code\context_tree\ContextTree`, branch `v3`, head d7982bb)

Binding: the engine plan's rulings (`.superpowers/sdd/2026-10-19-v3-engine/rulings.md`), fake-LLM guard, never touch the
prod DB (local Docker `ctx-pg` :55432 only), secret scan before commits, no push.

### E1: Read set ignores links to deleted desks and piles (board final review, Important 3)
`app/agent/reads.py:180` `load_board_graph` loads raw `desk_id`/`pile_id`; after a pile (or chat) is deleted its members
keep the raw id, so `desk_sources` (`reads.py:49-51`, requires `pile_id is None`) never reads a former member later put
on a desk, while the board shows it read. Null out a `desk_id`/`pile_id` whose target card is deleted, with the same CASE
as `CARD_SELECT`. Test: pile → delete pile → PATCH a member onto chat X's desk → `GET …/reads` of X lists it.

### E2: Numbered passages and citations
- `board_context.render_source_blocks` (and note / linked-answer blocks) prefix each passage with `[n]`, numbered once
  per turn in prompt order; keep a turn-local map n → `{cardId, loc, page, quote}` (`quote` = the passage text sent,
  ≤ 1200 chars; `page` from chunk metadata when present, 1-based).
- The system prompt tells the model: cite with `[n]` right after the claim, only numbers that exist, `[2][3]` not
  `[2, 3]`, no citation section at the end.
- After the stream ends: parse markers from the full answer (normalise `[2, 3]` → both), keep those in the map, dedupe,
  order by n → send `data: {"citations":[…]}` before `[DONE]` (always, `[]` when none) and store them with the
  assistant message (existing message metadata column or a new nullable jsonb column via an additive, idempotent
  migration with `lock_timeout`). `GET …/messages` returns `citations` for assistant messages.
- Fake-LLM mode appends `[1]` after its first sentence when at least one passage was sent.
- Tests: prompt numbering; parser (valid, unknown, grouped, repeated, inside code fences ignored); SSE frame order;
  persistence round trip; fake-LLM citation.

### E3: `GET /files/{cardId}/passages`
Owner-scoped; pdf, doc, web, csv sources → `{ passages: [{loc, page, text}] }` in document order (by chunk position);
other kinds → 400 `invalid`; not theirs → 404. Rate-limited like the other file routes. Tests for each case.

## Board (repo `D:\code\context_tree\ContextTree-src`, branch `v3`, after the polish-1 plan)

Binding: the board-frontend rulings ("All tasks"), pebble.css frozen, test seams in the test hook only.

### B1: API surface
`types.ts`: `Citation`, `Passage`, `Message.citations`, `StreamEvent` `citations`, `EngineApi.getPassages`. Mock: the
seed answers carry citations; `streamChat` emits a `citations` event; `getPassages` returns the seed sources' passages;
a mock PDF asset so the PDF panel can be tested. The store keeps citations per message (streamed and fetched).
(`HttpEngineApi` on the integration branch gets the same in the integration plan.)

### B2: Citation chips in answers
Markdown rendering turns `[n]` that maps to a citation into an inline chip: the source's type icon + n, tinted by its
family colour, `aria-label "Source n: <name>, <loc>"`; unmapped markers are dropped from the display. Hover/focus shows a
small preview (source name, loc, first ~140 chars of the quote). Click opens the side panel (B3) at that passage. The
answer footer's "N of M cited" comes back, computed from real citations (distinct cited sources / sources read).
Works in the focus view; on board cards the chips render small and open the focus view + panel.
Tests: chips render for mapped markers only; click → panel opens with that card and passage; footer counts are real.

### B3: The source side panel
- In the focus view, a right-hand panel opens next to the conversation: docked at ≥ 1280 px wide (the conversation
  column shifts left; the timeline column stays), an overlay sheet from the right below that. Slide in from the right
  (~220 ms, `cubic-bezier(0.23, 1, 0.32, 1)`), out the same way; reduced motion → fade. Esc closes the panel first,
  then the focus view. Opening another source swaps the content in place.
- Opened from: a citation chip (scrolls to and highlights that passage), the Connected-sources **eye** button on every
  row (owner point 6; the Q pill stays and still leaves an inherited source out; an own row's pill becomes a plain
  label), and the source's own entries elsewhere in the focus view.
- Header: type icon, title, meta (pages / site / rows), "Open original" (raw file / URL in a new tab), close.
- Body by type:
  - **PDF**: the real page, rendered with `pdfjs-dist` (exact pinned version, worker bundled locally — no CDN), from
    `rawFileUrl`. Opens at the citation's `page`, scroll for other pages (lazy render). The cited `quote` is highlighted
    on the page using the text layer (whitespace-normalised fuzzy match; if not found, a banner "Couldn't find the exact
    passage on this page" and the page stays).
  - **Web / doc / csv**: `getPassages` text, the cited passage highlighted and scrolled into view; csv shows its table.
  - **Note**: the note text; the cited part highlighted.
  - **Video / audio / image**: the existing "coming soon" body.
- Tests: open from chip → right card + page + highlight element exists; eye → opens; Esc order; narrow viewport → overlay;
  PDF with a mock asset renders a page canvas and a highlight; text-layer miss → banner.

Order: engine E1 → E2 → E3 (parallel with the board's polish-1 plan) → board B1 → B2 → B3 → integration (HttpEngineApi,
proxy route for `/files/*/passages`, live e2e).
