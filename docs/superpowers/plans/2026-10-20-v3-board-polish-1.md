# V3 board — polish round 1 (owner's first hands-on test, 2026-10-20)

Source: the owner tested the full local system (sign-in → board → real engine) and sent 8 points with screenshots.
Points 1–7 are board changes and are this plan. Point 8 ("the rest of the UI looks incomplete") is a separate
design round (landing, sign-in, boards list, account menu, settings / API keys) — mockups first, see
`docs/design/v3-app-shell-mockups.html` when it exists.

Branch: `v3` in `D:\code\context_tree\ContextTree-src`. Same process as the board-frontend plan: one task at a time,
TDD, task review, fix rounds. Binding rules: `.superpowers/sdd/2026-10-19-v3-board-frontend/rulings.md` ("All tasks"
sections) still apply — esc() on innerHTML, no fetch outside `components/board/api/`, overlays inert + aria-hidden when
closed with focus return, test seams only in the test hook, never `git stash`, never kill the shared dev server on 3100,
`pebble.css` is frozen (new CSS goes in `components/board/chrome/*.css`).

Owner decisions (2026-10-20, in chat):
- Point 5: **lock everything** in Chat settings once the chat has started, except the name. To use another model or
  persona you branch.
- Point 6: an **eye icon opens** the source; the **Q pill stays** (still leaves an inherited source out).
- Point 7: zoomed out, the board shows **all names + strings** — questions and sources as name labels (sources smaller),
  no card bodies, no desk frames.

---

### Task P1: The answer fade must not cover the composer (point 1)

Bug: in the focus view, `.mfade` (pebble.css:410) is a fixed 56 px gradient at `bottom: 96px`. When the composer grows
past one line, the fade sits on top of the textarea and hides the first typed line (owner's screenshot: "What is this
PDFG" washed out, caret on line 2).

- Anchor the fade to the composer's real top edge instead of a fixed offset (e.g. render it inside the composer wrapper
  as an element positioned `bottom: 100%`, or drive `bottom` from the composer's measured height). It must never overlap
  the composer box. Override in `chrome/focus.css`; do not edit pebble.css.
- Test (e2e, focus.spec): open a chat's focus view, type 4 lines into the composer; the fade's bounding box bottom is ≤
  the composer's top, and the first line's text is not covered (elementFromPoint at the first line hits the textarea).

### Task P2: Reply actions appear on hover (point 2)

`Copy` and `Branch from here` under each answer (FocusView.tsx ~391-393) are always visible. Show them only while the
pointer is over that reply or focus is inside it (`:hover`, `:focus-within`), with a short opacity fade (≤ 150 ms,
ease-out). Keep them in the layout (no jump) and keyboard-reachable. On touch-only devices (`@media (hover: none)`) keep
them visible. The "N of M cited" note on the same row stays always visible.
- Test: actions have opacity 0 when not hovered; hover the reply → 1; Tab into Copy → visible.

### Task P3: Model icons instead of model dots (point 3)

Everywhere a model is shown with a coloured dot (`.mdot`): card header (`Q1 · GPT`), focus view "X answered with …"
line, timeline rows, composer model chip, model picker / branch-sheet model chips, desk title dots if they mean models.
- Add `components/board/lib/model-icons.ts`: one small monochrome SVG mark per provider in `MODELS` (Anthropic/Claude,
  OpenAI/GPT, Google/Gemini, Meta/Llama, DeepSeek, Mistral, Moonshot/Kimi), drawn with `currentColor` and tinted with
  the model's colour. Source the paths from an MIT/CC0 set (`@lobehub/icons-static-svg` or `simple-icons`), inlined —
  no new runtime dependency; put the licence + source in a header comment. Unknown models fall back to the dot.
- Size to the dot's slot (12–14 px), aligned to the text baseline. Keep `title`/aria-label with the model name.
- Tests: unit test that every `MODELS` key has an icon; DOM test that a chat card header renders an `svg` for a known
  model and a dot for an unknown engine id.

### Task P4: Branch from the focus view, then move to the new branch (point 4)

Today, confirming the branch sheet opened from the focus view ("Branch from here" or the Branch pill) creates the
branch and leaves the user on the parent. Instead, once the branch is created, the focus view switches to the new
branch:
- Outgoing: the parent's content fades and shifts slightly left (opacity 1→0, translateX 0→-16px, ~160 ms ease-out).
  Incoming: the branch's content enters from the right (opacity 0→1, translateX 16px→0, ~220 ms,
  `cubic-bezier(0.23, 1, 0.32, 1)`). Interruptible (no input lock). The timeline highlights the new step.
- Behind the overlay, the board selects the new card and the camera moves to it, so Esc lands on it.
- Reduced motion: a plain cross-fade.
- The first question typed in the sheet is sent as usual; the new view shows it streaming.
- Tests: from the focus view, Branch from here → fill → create → `focus()` is the new chat's id, the timeline's current
  item is the new chat, Esc → the board's selection is the new chat.

### Task P5: Lock a chat's settings once it has started (point 5)

A chat "has started" when it has at least one message. From then on, Chat settings (BranchSheet `mode: 'edit'`) shows
everything except Name read-only: model chips, persona chips + text, "What it starts with" (read the desk above, carry
mode), Advanced. Use real `disabled` controls styled as settled values (not greyed-out noise), and one line under the
title: "Set when this chat started. Branch to try another model or persona." with a `Branch` button that opens the
branch sheet from this chat. Save only saves the name. A chat with no messages yet (e.g. a new board's empty Q1) stays
fully editable.
- The focus-view composer model chip on a started chat no longer changes this chat's model: choosing a model there
  opens the branch sheet from this chat with that model preselected ("continue on another AI" becomes a branch).
- The store refuses model / persona / carry / reads changes to a started chat (defence in depth; the UI already blocks
  them) and logs nothing to the server.
- Tests: started chat → settings controls disabled, Save sends only `name`; empty chat → editable; composer chip on a
  started chat opens the branch sheet with the picked model.

### Task P6: moved

Point 6 (eye icon) now opens the source in the focus view's right-hand side panel — it is Task B3 of
`2026-10-20-v3-citations-and-source-panel.md`.

### Task R0: Remove the fake citations (do first)

`FocusView.tsx:54-64, 233-234, 394`: "N of M cited" is `read.slice(0, 3)` and the quote block is the first read source's
first excerpt — decoration from the prototype, shown on real answers as if the model cited them. Remove both (and the
"answered with N sources" line keeps its real read count). Real citations come with the citations plan.
- Test: an answer in the focus view shows no `.cited` and no `.quote` element.

### Task R1: Final-review fixes (board-frontend final review, 2026-10-20)

1. **Delete flushes pending writes first** (Important 2). In `deleteSet`/`removeCard`: flush the card's debounced patch
   and chain the DELETE after its patch queue; the engine saves a dirty node's target position before dropping it.
   Tests: type in a note, Escape, Delete, Undo → the text is there (store and server); drag csv, Delete within 600 ms,
   Undo → it returns at the dropped spot.
2. **Deleting a pile asks which** (Important 1; owner decision 2026-10-20). Selecting a pile and pressing Delete (or its
   Remove button) opens the confirm with two buttons: `Delete "<front file>"` (focused by default) and `Delete all N`.
   ←/→ move between them, Enter runs the focused one, Escape cancels. "Delete one" removes the front member (existing
   unpile rules when 1 is left). "Delete all" removes the pile and every member; one Undo restores them all, in place,
   still piled. No member is ever left stacked on another.
   Tests: Delete + Enter → front member gone, pile has N-1; Delete + → + Enter → pile and members gone; Undo → all back
   piled; no two live cards share a position afterwards.
3. Card footer dots fold pile members into one dot (`card-view.ts:126,145`), matching `countSources` (Minor 1).
4. Token figures on the expanded source card and the viewer's Size use the engine's `ReadItem.tokens` when the card is
   read by the selected/focused chat, else omit the figure (no mock-only estimate against the real engine) (Minor 2).
5. A note's tool buttons (Remove, Open) work on the first click while its text is focused (Minor 3) — don't re-render on
   blur when the pointerdown target is one of the card's own buttons.
6. Clean-up (Minors 4–6): delete `ADV_FIELD_MAP`, `whenCreated`, `toastMs`, `_now`; one shared `typing()`, `clamp`,
   `iconOf`; store's `makeLink` uses `cut()`; BranchSheet uses `countSources`; drop plan-era comments; specs read
   `.pb-toast` instead of `__toastText` and the seam is removed. Fix the 19 eslint errors in new code
   (`ESLINT_USE_FLAT_CONFIG=false npx eslint components/board app/board-dev e2e`), and make `npm run lint` work on
   Next 16 (`next lint` was removed: call eslint directly).

### Task P7: Zoomed out, the board is a map of names (point 7)

Below the existing size threshold (`size === 'S'`, z < .42), cards render as **name labels**, not blobs:
- Chat → its name (or question) as a label in the model colour family, e.g. 13–14 px at 100% zoom equivalent, kept
  legible on screen by counter-scaling the label against the camera zoom (labels stay ~12–15 screen px whatever the
  zoom), max ~2 lines, ellipsis.
- Source → its title, smaller and lighter, with its type icon.
- No card bodies, no desk frames (desks hidden in S); strings stay and connect the labels' anchor points.
- Piles show the pile name with a member count.
- Keep `.size-s` on cards (acceptance tests rely on it) and keep the current hysteresis (S below .42, M above .5).
- Must keep the prototype acceptance specs (`e2e/board/v4.spec.ts`, `room.spec.ts`) green; if a map-step check encodes
  the old blob look, change only that check and say so in the report.
- Tests: at z .3 every card shows its name text; no `.desk` frame is visible; strings still render between a source
  label and its chat label; labels' on-screen font size stays within 11–16 px at z .2 and .4.

---

Order: R0 → P1 → P2 → R1 → P3 → P5 → P4 → P7. (P6 moved to the citations plan.)

### Task T1: Apple-grey retheme (owner, 2026-10-20) — runs after R1, before P3

Owner: "background like Apple … remove the purple, more white and mature like Apple". Picked: canvas A (Apple grey),
accent A2 (Apple blue), Inter, toned-down source colours. Preview renders:
`C:\Users\chinm\AppData\Local\Temp\claude\d--code-context-tree\872c9933-ef5b-407f-9dff-df9adb23f0fc\scratchpad\bg\A2-blue*.png`.
pebble.css is no longer frozen for colour tokens (owner override) — change values, not structure.

- Tokens (`.pb-root`): `--pb-canvas #F5F5F7`, `--pb-desk #EBEBF0`, `--pb-card #FFFFFF`, `--pb-lilac` → a neutral
  `#F2F2F5` (rename the token to `--pb-fill` everywhere, keep an alias only if needed), `--pb-edge #D2D2D7`,
  `--pb-edge-strong #0071E3` (the one accent: selected/trail strings, focus rings, reading outline, progress, thinking
  dots, "Now", out-port), `--pb-ink #1D1D1F`, `--t1 #1D1D1F`, `--t2 #6E6E73`, `--t3 #86868B`.
- Every other purple/lilac literal (pebble.css, chrome/*.css incl. welcome-tour.css, engine/*.ts inline styles):
  `#3B3352→#3A3A3C`, `#DDD3EE→#E0E0E5`, `#D6CDE6→#D1D1D6`, `#E4DCF2→#E5E5EA`, `#3A2B55→#2C2C2E`,
  `rgba(245,242,250,…)→rgba(245,245,247,…)`, the `.mock3` accent `#7A52D6→#0071E3`. Unconnected strings use
  `--pb-edge` (grey); only the active/trail ones use the accent. No purple left in board UI (grep for the old hexes = 0).
- Family colours toned down (same hues, lower saturation; keep text contrast ≥ 4.5:1 for `--fx`/`--fkt` on `--fc`):
  media, docs, note, web, data, image (image moves from violet to a cool slate-blue), mixed (neutral grey).
  Model colours in `lib/catalog.ts` are identity colours and stay.
- Typeface: Inter via `next/font/google` (self-hosted at build, no runtime call), replacing Bricolage Grotesque in
  `components/board/fonts.ts`; keep the `--pb-font` variable; check weights used (400/500/600/700/800) and tighten
  display tracking (-0.02em on ≥ 20 px headings) since Inter runs wider.
- Desk empty-state, drop overlay, scrims and the welcome tour use the same tokens.
- Tests: a unit test that `pebble.css` + `chrome/*.css` contain none of the old purple hexes; the e2e suite + the 24 + 6
  acceptance specs stay green; screenshots of board, focus view, branch sheet, viewer, tour for the owner.

#### T1 addendum: materials and the dotted canvas (owner, 2026-10-20)

Owner liked a "Materials" spec: "Depth comes from layering, not decoration. Controls float on frosted glass, cards cast
soft shadows, and lines are 0.5px hairlines." Plus "canvas like Miro with dots on it".

- **Glass** (floating controls: brand bar, Add + its menu, trail, zoom, board menu, the focus view's top bar and
  composer, viewer/inspector toolbars): `background: rgba(255,255,255,.62); backdrop-filter: blur(30px) saturate(180%)`
  (+ `-webkit-`), a 0.5px hairline `rgba(0,0,0,.08)`. `@media (prefers-reduced-transparency: reduce)` and no
  `backdrop-filter` support → solid `#FFFFFF` with the same hairline.
- **Card shadow**: `0 1px 2px rgba(0,0,0,.06), 0 8px 28px rgba(0,0,0,.08)` (the `--sh-card`/`--sh-node` tokens); lifted /
  dragging cards keep a stronger variant of the same two layers. No coloured shadows.
- **Hairlines**: 0.5px (`border: .5px solid` / `box-shadow: 0 0 0 .5px`) in `rgba(0,0,0,.08)`–`.12` replace 1px lines
  on cards, rows, dividers and sheets; at DPR 1 browsers round to 1px — acceptable.
- **Radii tokens**: `--r-tile: 10px` (symbol/type tiles), `--r-row: 14px` (rows, bubbles, chips), `--r-card: 18px`
  (cards), `--r-sheet: 26px` (desks, sheets, focus view). Map existing radii onto these.
- **Dotted canvas (Miro-style)**: `--pb-canvas` background with a dot grid — 1.5 px dots `#C7C7CC` every 24 world px,
  drawn as a `radial-gradient` on the canvas layer whose `background-size`/`background-position` follow the camera
  (pan + zoom) so the dots move with the board; below ~35% zoom the dots fade out (opacity tied to zoom), never
  denser than ~8 screen px apart. Desks sit on top without dots (solid `--pb-desk`). Reduced motion: unchanged
  (dots are static relative to the board).
- Tests: the glass fallback rule exists; the dot layer's background-size/position change with `camSnap` zoom/pan;
  screenshots of board (100% and 40%), focus view, branch sheet, viewer, tour.
