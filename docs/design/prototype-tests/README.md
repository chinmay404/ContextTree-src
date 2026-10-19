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
