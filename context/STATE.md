# State — Context Tree

_Updated: 2026-10-31 by Claude (with Chinmay) · at commit dffe89f_

## Where we are
V3 is on main in both repos. The owner's latest board batch has shipped; next is whether notes should be read past 4,000 characters, then P16.

## What moved
- 2026-10-31: tree timeline and status mark on sources (7956460 before rebase, on main in d660766's history), desk sources read as what the question is about (engine 3e880ac), notes keep line breaks and join piles and sets (136a110), select text → notepad or new branch (5875af8), notepad warns past the read limit (dffe89f).
- 2026-10-31, another session: context engine, context inspector, visible turn errors, sources stack on the map (see `git log`).
- 2026-10-24: answers render tables, code, quotes and rules (b40ef11).

## What's live
| Env | Running | Since |
|---|---|---|
| prod frontend (Vercel, contexttree.tech) | main @dffe89f pushed; auto-deploy assumed, not checked this session | 2026-10-31 |
| prod engine (Vercel) | main @3e880ac pushed; deploy not checked this session | 2026-10-31 |

## Not done yet
- Owner decision: read notes past `NOTE_MAX_CHARS` = 4000 (engine `app/agent/reads.py`, mirrored in `components/board/lib/note-text.ts`).
- P16 "Read all of it" per source (contract amendment → engine → board).
- Citations board side B1–B3; landing showcase hookup (ShowcaseApi).
- Follow-ups: Ctrl+Z after a paste into a note, a new upload landing dimmed over its neighbour on the seed board, "2 files" wording on a pile of notes, a note's name when it has left its desk's notepad role, streaming fallback, persist web results, V2 duplicate `color`, Tailwind build warning, shared-store rate limits, multi-select "Group as set", scrapers.
- Payments (Stripe); legal review of /privacy + /terms.

## Blocked
- Owner: check `GOOGLE_API_KEY` in the engine's Vercel project ("Failed to generate embeddings"), rotate the DB password, pause Railway.
- Owner: whether to adopt the plugin's new CLAUDE.md block ("never push to main, PR + CI"); this repo pushes to main by owner instruction and has no CI, so it is not applied.

## Next step
Ask the owner whether notes should be read in full; if yes, raise `NOTE_MAX_CHARS` in the engine under the context budget, TDD, and update the notepad warning's constant.

## Run it locally
```
cd ContextTree-src && npm install && npm run dev        # frontend :3000
cd ContextTree && .venv/Scripts/python main.py           # backend (needs .env)
```

## Branch / PR
`v3` (main checkout) tracks main; pushes are fast-forward to `main`, no PRs.

## Watch out for
- e2e: landing and sign-in specs need `NEXT_PUBLIC_BOARD_V3=1`, so those 10 fail on a plain dev server. Under low memory, specs and unit tests time out: rerun alone before believing a failure. Exclude `e2e/_tmp`.
- Several sessions push to main: check it has not moved right before pushing, and gate the exact commit.
- A worktree whose `node_modules` is a link (`ContextTree-src-notelimits`) cannot run Turbopack.
- Engine tests need `TEST_DATABASE_URL`, otherwise ~400 skip silently; new migrations must be applied to local `v3test`.
- Never read or connect to the prod DB from an agent session. Workspace root holds `DB.txt` and a `.pem` in plain text; the DB password is also in git history (`V2/08-CHECKPOINT.md`) — rotate.
