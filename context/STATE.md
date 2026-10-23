# State — Context Tree

_Updated: 2026-10-23 by Claude (with Chinmay) · at commit 20b3535_

## Where we are
V3 is on main in both repos and deployed to Vercel (frontend and engine; Railway is retired). Board polish round 2 is done except P16. Plans: `docs/superpowers/plans/2026-10-2*-v3-*.md`; ledgers in `.superpowers/sdd/` (git-ignored).
- Frontend `ContextTree-src` main @20b3535 (= branch `v3`): Apple-grey look + dark mode (System/Light/Dark), app shell, BYOK for seven providers, paste box (V), string arrows, card colours, desk glow, browser Back, note formatting, one-line web results, source sets, branch slide, map of names.
- Engine `ContextTree` main @aab02a2: citations, BYOK, Vercel ingest route, guarded page fetcher (size/time caps), standalone web-search query, chat turns off the event loop.
- Local: :3100 board test server (no V3 flag, so landing/sign-in e2e need a flagged server), :3101 dev server.

## What moved
- 2026-10-21: released to main and Vercel; engine moved off Railway.
- 2026-10-23: search rewrite + one-line results; polish-2 P9–P15, P13 dark mode (board + shell), S3 sets, P4 branch slide, P7 map of names (with overlap + string-anchor fixes) all pushed.

## What's live
| Env | Running | Since |
|---|---|---|
| prod frontend (Vercel, contexttree.tech) | main, auto-deploy (last checked by owner after 09fae64) | 2026-10-21 |
| prod engine (Vercel) | main | 2026-10-21 |

## Not done yet
- P16 "Read all of it" per source (contract amendment → engine → board).
- Citations board side B1–B3 (chips, PDF side panel, eye icon); landing showcase hookup (ShowcaseApi).
- Follow-ups: streaming fallback (answers arrive in one frame), persist web results on messages, flaky `user-api-keys-route` test, V2 duplicate `color` in `lib/storage.ts`, Tailwind "Invalid code point" build warning, shared-store rate limits, multi-select "Group as set", scrapers.
- Payments (Stripe); legal review of /privacy + /terms.

## Blocked
- Owner: check `GOOGLE_API_KEY` in the engine's Vercel project ("Failed to generate embeddings"), rotate the DB password, pause Railway.

## Next step
Write the P16 contract amendment (`SourceData.readAll`, `ReadItem.trimmed`) in `2026-10-19-v3-api-contract.md`, then the engine task in `ContextTree` (TDD on numbering + token budget).

## Run it locally
```
cd ContextTree-src && npm install && npm run dev        # frontend :3000
cd ContextTree && .venv/Scripts/python main.py           # backend (needs .env)
```

## Watch out for
- Never read or connect to the prod DB from an agent session. Workspace root holds `DB.txt` and a `.pem` in plain text; the DB password is also in git history (`V2/08-CHECKPOINT.md`) — rotate.
- Pushes are fast-forward only, secret scan first, owner approval per batch.
