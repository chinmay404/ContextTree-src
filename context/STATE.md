# State — Context Tree

_Updated: 2026-10-19 by Claude (with owner) · at commit d47aef3_

## Where we are
V3 ("the board") design rounds. Chosen: Desks workflow in the Pebble visual system. Current prototype: `docs/design/pebble-desks-prototype.html` (standalone HTML; mock data, no backend). Branch `v3`. See `DIRECTION.md` and the 2026-10-19 rows in `DECISIONS.md`.

## What moved
- 2026-10-19: owner returned after a ~3-month pause; decided to continue; competitor study of Slashspace done; `context/` created.
- 2026-10-19 (latest round): What if removed; knob-drag strings for connecting and branching; double-click viewers per source type; Add button + right-click menu replace the rail; scroll cycles piles; swinging strings back.
- Last code change: fresh forks no longer vanish after first reply (20b3e37, 2026-07-24).

## What's live
| Env | Running | Since |
|---|---|---|
| prod frontend (Vercel, contexttree.tech) | d47aef3 (main) | 2026-07-24 |
| prod backend (Railway) | 049bfa1 (ContextTree main) | 2026-07-24 |

## Not done yet
- V3 design rounds R1–R5 (`DIRECTION.md` → "How we are working").
- Single writer: Next.js and FastAPI both still write canvas/node/message data.
- Payments (Stripe) — never built. Legal review of /privacy + /terms.

## Blocked
- Nothing for design work. Prod DB reads from an agent session need the owner's permission.

## Next step
Owner reviews the Pebble prototype; once it feels right, write the V3 design spec (`docs/superpowers/specs/`) from it, then plan the backend it needs. Earlier explorations: `docs/design/context-workflows-abc.html`; wired backup tag `v3-board-wires-backup`.

## Run it locally
```
cd ContextTree-src && npm install && npm run dev        # frontend :3000
cd ContextTree && .venv/Scripts/python main.py           # backend (needs .env)
```

## Branch / PR
`main` — none.

## Watch out for
- Don't touch prod or the backend during design rounds; mock data only.
- Workspace root (not in git) holds `DB.txt` and a `.pem` key in plain text — keys still need rotating.
- `V2/08-CHECKPOINT.md` is the V2 history log; new state goes here, not there.
