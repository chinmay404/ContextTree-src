# V2 — Checkpoint Log

Purpose: any future session (or future you) reads THIS file first and can
resume exactly where we stopped. Append a dated entry at every stopping
point — never rewrite old entries.

---

## Checkpoint 001 — 2026-07-12 (Day 0 complete)

### Decisions locked (do not re-litigate)

1. **Identity: explorer-first.** For anyone who thinks in branches
   (learners, coders, researchers, writers). Writers are the first
   *marketing channel* only. (03-PRODUCT-DECISION §1–2)
2. **Headline features: F0a "Continue on another AI" + F0b "Side
   question".** These lead every pitch. (03 §1)
3. **Pricing: Free (BYOK, 2 canvases) / Founding $59 one-time (first
   100, then $79) / Sync $6-mo later.** (03 §5)
4. **Never market as "ChatGPT with branching"** — sherlocked Sept 2025.
5. **Development stays in the existing folders** — `ContextTree/`
   (backend repo) and `ContextTree-src/` (frontend repo). No monorepo
   restructure (owner decision 2026-07-12; supersedes the old Day-1
   "monorepo-ize" line in 07-30-DAY-PLAN). `V2/` inside ContextTree-src
   is docs only, and it is the canonical copy.

### Done so far

- [x] Full codebase audit (01) — both repos surveyed, defects cataloged.
- [x] Market research, two independent passes with sources (02).
- [x] Product decision, redesign spec, architecture, cut list, 30-day
      plan (03–07), all updated to explorer-first.
- [x] **Day 0: new landing page shipped** — `components/landing.tsx`
      (explorer-first, lineage-tree hero), wired in `app/page.tsx`,
      `next build` passes. Committed on branch **`v2/explorer-landing`**
      (first commit `f0a6676`).
- [x] Obsidian vault updated (Context Tree MOC + concept notes).

### State of the working tree (frontend repo)

- Branch `v2/explorer-landing` holds: new landing + V2/ docs.
- Still **uncommitted from April** (deliberately left alone): edits to
  `app/layout.tsx`, `app/globals.css`, untracked
  `components/landing-page-v2.tsx`, deleted placeholder images. These
  get resolved during cut-list execution (old landing variants die).

### Blocked on owner

- [ ] **Rotate secrets** — everything in `ContextTree/.env`,
      `CONTEXTTREEAPI.pem`, `temp_env_file` must be treated as leaked:
      Supabase DB password, GROQ/GOOGLE/OPENAI/ANTHROPIC/NVIDIA keys,
      LangSmith key, Stripe keys, `BYOK_ENCRYPTION_SECRET`, the EC2 key
      pair. Rotate in each dashboard, THEN we remove the files from the
      repos.

### Shipped live (update, same day)

- Rebased onto origin/main (which had the June 7 "shutdown message"
  sign-in page, PR #3), fast-forwarded `main`, build verified, and
  **pushed `main` + `v2/explorer-landing` to GitHub** — the new landing
  deploys with the next Vercel build.
- **Sign-in still shows the shutdown message** (commit `858717f`). This
  is deliberate for now: the marketing page is live while the app stays
  closed until week-1 security lands. To reopen sign-ups later:
  `git revert 858717f`.
- April WIP (layout.tsx/globals.css edits, landing-page-v2.tsx, deleted
  placeholders) is parked in `git stash` ("april-wip: …"). It is
  cut-list material; recover with `git stash list` if ever needed.

### Next task when we resume

**Day 1 (adjusted, no monorepo):** repo hygiene inside each existing
repo — delete cut-list debris, tighten .gitignore, remove secret files
(after rotation) — then Day 2: migration runner. Read
`07-30-DAY-PLAN.md` and follow it top to bottom; check items off in
this file as new checkpoint entries.

---

## Checkpoint 002 — 2026-07-12 (Days 1–2 + landing v2.1)

### Done

- [x] **Landing v2.1 live** (owner feedback: too wordy, explain visually):
      copy cut ~60%, each move now a mini node-diagram, real tree icon
      inlined in nav/footer, token receipt got comparison bars. Pushed to
      `main` (`2685898`) — deploys via Vercel.
- [x] **Day 1 (backend)**: dead stores (MongoStore, quadrant_store),
      scratch files, obsolete doc stubs removed; .gitignore tightened
      (*.pem, *.log). Branch **`ContextTree` repo: `v2/dev`** (`d1353e6`).
- [x] **Day 1 (workspace)**: root debris (check_*.py, LangSmith dataset
      export, temp_env_file) moved to `_archive_v1_debris/` (reversible).
- [x] **Day 2**: `scripts/migrate.py` (forward-only runner: advisory
      lock, schema_migrations ledger, one transaction per file, --dry-run)
      + `db/migrations/001_baseline.sql` (V1 as-built schema consolidated
      from all scattered DDL; idempotent; vector(768) throughout) +
      `scripts/dump_schema.py` (read-only drift checker). Pushed on
      `v2/dev` (`7ed559b`).

### Discovered

- **The old Supabase project is unreachable** ("tenant/user not found" on
  the pooler) — either mid-rotation or paused/deleted. Consequence: the
  baseline is code-derived, and there may be NO production data to
  preserve, which would let migrations 002+ (UUID identity) run clean.
- The backend venv (`ContextTree/env/`) is a **Linux venv** (WSL-era) —
  useless on this Windows machine. A fresh Windows venv (or WSL) is
  needed to run the backend locally.
- Runtime DDL exists in the FRONTEND too: `lib/mongodb.ts` runs
  `ALTER TABLE` on boot (line ~99). Dies with the Next CRUD routes (Day 6).

### Blocked on owner (unchanged + new)

- [ ] Rotate all leaked secrets (list in Checkpoint 001).
- [ ] **Provide the new/working `DATABASE_URL`** (new Supabase project or
      restored one) so migrations can actually run — then:
      `python scripts/migrate.py --dry-run` → `python scripts/migrate.py`.
- [ ] Confirm whether old production data still exists anywhere. If not,
      migration 002 (UUID identity) becomes a clean-slate rewrite instead
      of a backfill — simpler; say the word.

### Next when we resume

Day 3–4: UUID identity migration (002) + the **JWT trust boundary**
(delete `ChatMessage.user_id`, FastAPI middleware verifies a token minted
by the Next proxy). These can be written and tested against a fresh local
Postgres even before the new Supabase project exists.

---

*(Append Checkpoint 003 here at the next stopping point.)*
