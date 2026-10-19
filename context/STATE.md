# State — Context Tree

_Updated: 2026-10-19 by Claude (with owner) · at commit d47aef3_

## Where we are
Starting V3 ("the board"): design rounds for the canvas and its cards, frontend-only with mock data. See `DIRECTION.md`.

## What moved
- 2026-10-19: owner returned after a ~3-month pause; decided to continue; competitor study of Slashspace done; `context/` created.
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
Design round R1: a mock-data board on a branch (e.g. `v3-design-lab`) showing the board surface and the chat card in its states; screenshot for owner review.

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
