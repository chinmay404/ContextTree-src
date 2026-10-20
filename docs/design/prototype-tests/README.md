# Prototype acceptance checks

Playwright scripts written against `../pebble-desks-prototype.html` during the design rounds.
V3 must pass the same behaviours (spec §9). They call the prototype's globals (`nodes`, `ctx`,
`canPlug`, `camSnap`, …), so the V3 port either exposes a test hook with the same names or the checks
are rewritten against the DOM.

- `v4test.js` — 24 checks: no rail, no What if, port-drag strings, retract, drag to branch, select a
  string → Disconnect, double-click opens viewers (8 types) without a stray note, pile wheel slide,
  Add / right-click / double-click note, string sway, map view, focus view.
- `room.js` — make room: a source dropped on a chat moves to its desk side, overlapping cards are
  nudged, desks push each other apart.

Run: `node v4test.js <url-of-prototype> <screenshot-prefix>` from `ContextTree-src/` (Playwright is a dev dependency).

## Ported to the V3 board

Both scripts are ported step by step to Playwright specs that run against the `/board-dev` page (the mock engine), with the prototype's globals replaced by `window.__board`: `e2e/board/v4.spec.ts` (the 24 checks) and `e2e/board/room.spec.ts` (the 6 room checks). Every `ok()` is an `expect.soft`, so a run lists all of them; screenshots land in `test-results/board/` under the prototype's names (`v4-1-board.png` ... `v4-12-focus.png`, `room-room.png` ...). Two checks that always passed in the prototype are tightened (`main` to `deep` must be refused; the map and focus views are asserted). Run with the dev server up (`npx next dev --port 3100`): `PW_BASE_URL=http://localhost:3100 npx playwright test e2e/board/v4.spec.ts e2e/board/room.spec.ts`. For side-by-side reference shots, run the original scripts as above and write them to `test-results/proto/`.
