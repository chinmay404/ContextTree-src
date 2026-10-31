# State — Context Tree

_Updated: 2026-10-31 by Claude (with Chinmay) · at commit 9c27df2_

## Where we are
V3 is on main in both repos, with drawing, the PWA and an iPad pass on the board. The iPad work was tested in Chromium touch emulation, so the owner's real iPad is the remaining check. Then: whether notes should be read past 4,000 characters, then P16.

## What moved
- 2026-10-31: tree timeline and status mark (d660766), desk sources read as what the question is about (engine 3e880ac), notes keep line breaks and join piles and sets (136a110), select text → notepad or new branch (5875af8, dffe89f). Another session: context engine, inspector, visible turn errors.
- 2026-10-31: free NIM embeddings, drawing and note pages (d0952e4), PWA (ff3073a), pinch and tour slides (6a46286), iPad gestures and sizes (4b0afe5), no text selection while the pen is on (9c27df2).

## What's live
| Env | Running | Since |
|---|---|---|
| prod frontend (Vercel, contexttree.tech) | main @9c27df2 pushed; auto-deploy assumed, not checked when this was written | 2026-10-31 |
| prod engine (Vercel) | main @ebe32b7 pushed; Vercel status success | 2026-10-31 |

## Not done yet
- Production re-embed for NIM: needs the current `DATABASE_URL` in `ContextTree/.env`; meaning search stays unreliable until it runs.
- Owner decision: read notes past `NOTE_MAX_CHARS` = 4000 (engine `app/agent/reads.py`, mirrored in `components/board/lib/note-text.ts`).
- P16 "Read all of it" per source (contract amendment → engine → board).
- Citations board side B1–B3; landing showcase hookup (ShowcaseApi); payments (Stripe); legal review of /privacy + /terms.
- Follow-ups: Ctrl+Z after a paste into a note, a new upload landing dimmed over its neighbour on the seed board, "2 files" wording on a pile of notes, streaming fallback, persist web results, V2 duplicate `color`, Tailwind build warning, shared-store rate limits, multi-select "Group as set", scrapers.

## Blocked
- Owner: check `GOOGLE_API_KEY` in the engine's Vercel project, rotate the DB password, pause Railway; decide on the plugin's new CLAUDE.md block ("never push to main"), not applied because this repo pushes to main by owner instruction and has no CI.

## Next step
Ask the owner whether notes should be read in full; if yes, raise `NOTE_MAX_CHARS` in the engine under the context budget, TDD, and update the notepad warning's constant.

## Run it locally
```
cd ContextTree-src && npm install && npm run dev        # frontend :3000
cd ContextTree && .venv/Scripts/python main.py           # backend (needs .env)
```

## Branch / PR
`v3` (main checkout), fast-forward to `main`, no PRs.

## Watch out for
- e2e: landing and sign-in specs need `NEXT_PUBLIC_BOARD_V3=1`, so those 10 fail on a plain dev server. Under low memory, specs and unit tests time out: rerun alone before believing a failure. Exclude `e2e/_tmp`.
- Several sessions push to main: check it has not moved right before pushing, and gate the exact commit. A worktree whose `node_modules` is a link (`ContextTree-src-notelimits`) cannot run Turbopack.
- Engine tests need `TEST_DATABASE_URL`, otherwise ~400 skip silently; new migrations must be applied to local `v3test`.
- Never read or connect to the prod DB from an agent session. Workspace root holds `DB.txt` and a `.pem` in plain text; the DB password is also in git history (`V2/08-CHECKPOINT.md`) — rotate.
