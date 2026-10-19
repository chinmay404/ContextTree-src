# State — Context Tree

_Updated: 2026-10-19 by Claude (with owner) · at commit d47aef3_

## Where we are
V3 build in progress (subagent-driven, one task at a time per repo, each reviewed). Plans: `docs/superpowers/plans/2026-10-19-v3-{engine,board-frontend,integration}.md` + `…-v3-api-contract.md`. Ledgers (git-ignored): `ContextTree/.superpowers/sdd/2026-10-19-v3-engine/progress.md`, `ContextTree-src/.superpowers/sdd/2026-10-19-v3-board-frontend/progress.md`.
- Engine (`ContextTree` branch `v3`, local only): Tasks 1–11 done; 12 (ingestion) in fix review; 13–15 left.
- Board (`ContextTree-src` branch `v3`): Tasks 1–8 done; 9 (board shell on `/board-dev`) in progress; 10–20 left.
- Local servers for the owner: Next `:3100` (`/board-dev`), engine `:8000` against local Docker DB `v3dev` (container `ctx-pg`, port 55432), prototype `:8090`.

## What moved
- 2026-10-19: owner returned after a ~3-month pause; decided to continue; competitor study of Slashspace done; `context/` created.
- 2026-10-19: design frozen; V3 spec written (`docs/superpowers/specs/2026-10-19-v3-board-design.md`): Pebble board as the frontend, same FastAPI engine, FastAPI becomes the only writer. Approved with owner answers (fresh boards, replace V2, video/image/audio reading coming soon, same DB).
- 2026-10-19 (last design round): What if removed; knob-drag strings for connecting and branching; double-click viewers per source type; Add button + right-click menu replace the rail; scroll cycles piles; swinging strings back.
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
Finish engine Tasks 12–15 and board Tasks 9–20 (rulings recorded in each ledger), then the integration plan (proxy, HttpEngineApi, `/boards` + `/b/[id]`, live e2e). Owner deploys; the DB password in git history still needs rotating.

## Run it locally
```
cd ContextTree-src && npm install && npm run dev        # frontend :3000
cd ContextTree && .venv/Scripts/python main.py           # backend (needs .env)
```

## Branch / PR
`main` — none.

## Watch out for
- Don't touch prod or the backend during design rounds; mock data only.
- Workspace root (not in git) holds `DB.txt` and a `.pem` key in plain text — keys still need rotating. The DB password is also in git history (`V2/08-CHECKPOINT.md`, checkpoint 005, on main); owner will rotate it.
- `V2/08-CHECKPOINT.md` is the V2 history log; new state goes here, not there.
