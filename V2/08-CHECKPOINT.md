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

## Checkpoint 003 — 2026-07-12 (Landing v3, screenshot-verified)

- Landing rebuilt visual-first after owner round-2 feedback and verified
  with real Playwright screenshots at 1440px/390px (desktop + mobile).
  Rail/elbow diagram system, distinct move glyphs, no eyebrow scaffolding.
- Real bug caught by screenshots: opacity-gated entrance animation left
  hero rows invisible under throttled rendering. Now transform-only.
  Lesson: never gate content visibility on an animation.
- New public route /landing (no auth check) — use it for marketing links
  and visual iteration; / still runs the session check.
- PRODUCT.md added (design context for future UI work). Playwright is a
  devDependency now. Dev-server note: Turbopack crashed once on Windows
  (junction point to node_modules/pg); restart recovers it.
- Pushed: main c0bf727 (+ playwright dep commit) → Vercel deploys.

## Checkpoint 004 — 2026-07-12 (Days 3–4: trust boundary closed)

- **The fake-user_id hole is closed and TESTED.** Backend identity comes
  only from a 60s HS256 service JWT minted per request by the Next proxy
  (lib/backend-jwt.ts) and verified in app/api/auth.py (fail-closed).
  ChatMessage.user_id / IngestRequest.user_email deleted; fork summary
  path no longer contains user_id. 7 boundary tests green
  (ContextTree tests/test_auth_boundary.py). Backend commit 85b5521
  (v2/dev), frontend in this commit.
- BACKEND_JWT_SECRET generated into both local env files (96 hex chars).
  Must also be set in Vercel + backend host on deploy — same value.
- Windows venv works now: ContextTree/.venv (py3.13). Dead deps pruned
  from requirements (pymongo, redis checkpointer, pyppeteer, IPython);
  langchain-litellm → requirements-extras.txt (needs Rust on py3.13,
  imported lazily anyway).
- Migration 002 written (guarded users.id text→uuid + additive user_id
  columns + email backfill). NOT yet run.
- **New Supabase project ContextTree_prod (eu-west-1) — password from
  DB.txt is REJECTED by the pooler** ("password authentication failed").
  Owner: reset/recheck the DB password in the Supabase dashboard, update
  DATABASE_URL in ContextTree/.env + ContextTree-src/.env.local, then:
  `.venv\Scripts\python.exe scripts\migrate.py --dry-run` → apply.
  Delete DB.txt afterwards (plaintext credentials in the workspace).
- Next: run migrations 001+002 on the new DB, then the user_email→user_id
  store sweep (PostgresStore + interim Next data layer), then Day 5
  quota buckets + Day 6 single-writer.

## Checkpoint 005 — 2026-07-12 (migrations validated; prod cred rotated)

- **Migrations 001 + 002 fully validated against a local pgvector Postgres
  (Docker):** apply clean, re-run is idempotent ("Up to date"), resulting
  schema verified — users.id is uuid, every conversation table has
  user_id uuid, all vectors vector(768), schema_migrations ledger correct.
- **Migration 002 guard proven:** with a non-UUID users.id present, it
  raises a clear exception, the whole file rolls back (id stays text), and
  it is NOT recorded as applied. Safe to run against prod regardless of
  legacy data.
- migrate.py reads DATABASE_URL from env if already set, else .env — works
  for local (Docker), CI, and prod without edits.
- **PROD APPLY IS BLOCKED ON CREDENTIALS.** The password in DB.txt
  (C85iYzGiKOwkrq) connected successfully once early in the session, then
  began failing with "password authentication failed for user postgres"
  (Supabase pooler's signature for a wrong password). Conclusion: the DB
  password was rotated mid-session. The .env DATABASE_URL is otherwise
  perfect (correct pooler user postgres.mdfuvyyjcprigqmjvzum, host,
  port 5432).
  → Owner: paste the CURRENT database password (Supabase dashboard →
    Project Settings → Database → reset/copy). Then, in ContextTree/:
      (update password in .env DATABASE_URL)
      .venv\Scripts\python.exe scripts\migrate.py --dry-run
      .venv\Scripts\python.exe scripts\migrate.py
    Applies in seconds. Delete DB.txt afterward (plaintext creds).
- Local Docker Postgres "ctx-pg" (port 55432, pgvector pg17) is stopped
  but kept for future migration validation: `docker start ctx-pg`.

### Next when we resume (after migrations land)
Tenancy isolation — the launch blocker. The store's read paths
(get_thread_messages, get_thread_fork_metadata, get_message_by_id, …)
currently key on thread_id/message_id WITHOUT an ownership predicate, so
JWT auth alone does not stop user A from reading user B's thread by id.
Add user scoping to every store read + the tenancy test matrix
(arch §7 row 1). This is Day 5-6 and is the real gate before any beta user.

## Checkpoint 006 — 2026-07-12 (prod migrated; tenancy done; context doc)

- **Migrations 001 + 002 APPLIED TO PROD** (Supabase ContextTree_prod,
  eu-west-1) with the new password. Verified: users.id uuid, every
  conversation table has user_id uuid FKs, vector(768), ledger clean,
  re-run idempotent. New password is in both env files.
- **Tenancy isolation done and tested (Day 5, the launch blocker).**
  All PostgresStore thread reads now carry a user_email predicate;
  update_thread_summary writes only owned rows; new get_thread_owner +
  resolve_user_email; chat/ + /stream call _assert_thread_access on
  conversation_id and parent_thread_id → 403 on cross-tenant. 14/14
  tests green (7 tenancy + 7 auth boundary) against local Docker PG.
  Backend commit d18967f (v2/dev).
- **Context-engineering design written** →
  V2/10-CONTEXT-PIPELINE.md (Mermaid diagrams): the one rule, four memory
  layers, per-turn sequence, exact prompt block, scoped retrieval fence,
  watermark summarization, fork inheritance, and V2 deltas. Named to match
  the vault reference. Linked from V2/README.
- Local Docker PG "ctx-pg" (55432) has tenancy + guardtest DBs from
  validation; harmless, `docker rm -f ctx-pg` to clean.

### Blocked on owner
- Delete DB.txt (plaintext creds still in workspace root).
- On deploy: set BACKEND_JWT_SECRET (same value) + new DATABASE_URL in
  Vercel and the backend host.

### Next when we resume
Day 6 single-writer: retire the Next.js CRUD/`lib/mongodb.ts` writer so
FastAPI owns all conversation writes; then switch store predicates from
user_email to user_id directly (drop user_email columns, migration 003).
Then Day 5 remainder: Postgres quota buckets replacing SlowAPI.

## Checkpoint 007 — 2026-07-12 (quotas; frontend tenancy hole; single-writer deferred)

- **Day 5b quotas DONE:** durable per-user daily buckets (migration 003,
  APPLIED TO PROD), atomic upsert-increment in the store, chat endpoints
  enforce DAILY_MESSAGE_LIMIT (429) after auth+ownership; accounting
  failure never blocks chat. 15/15 backend tests. Commit b2fec25 (v2/dev).
- **Frontend tenancy hole CLOSED:** POST /api/canvases/[id]/nodes was
  completely unauthenticated — anyone could add nodes to any canvas by
  guessing the id. Now requires session + canvas-ownership check.
  Commit 8ba9e2f (main).
- Deleted dead hooks/use-auto-save.ts (imported server pg layer into a
  client hook; would crash if mounted; used nowhere).
- **Full single-writer (Day 6) DEFERRED — deliberate call.** The CRUD
  contract (see agent report in session) shows 18 endpoints with heavy
  dual-write semantics (canvases.data blob + normalized tables kept in
  sync per-method, shallow merges, deterministic message ids). Rewriting
  all of it byte-compatibly in FastAPI while the app is live is high-risk
  churn for no user-visible gain right now. Dual-write is a data-integrity
  risk, NOT a security hole (both writers already enforce user_email
  isolation). Revisit as a dedicated effort after launch features (F1–F3)
  land, or if divergence bugs actually appear.
  Contract to reimplement against, if/when: it's in the session transcript
  (agent "Map Next CRUD API contract"). Key gotchas captured there:
  response envelope keys differ per endpoint, GET /canvases writes user
  stats, node GET returns bare object, messages use turn shape, edges
  delete+reinsert on every full write.

### Still blocked on owner
- Delete DB.txt (plaintext creds in workspace root).
- On deploy: BACKEND_JWT_SECRET (same both sides) + new DATABASE_URL in
  Vercel + backend host.

### Security posture now (all tested/shipped)
JWT trust boundary ✓ · identity from token only ✓ · UUID identity ✓ ·
store reads user-scoped ✓ · ownership 403 gate ✓ · durable quotas ✓ ·
frontend node-POST authenticated ✓. The launch-blocker tenancy work is
complete.

## Checkpoint 008 — 2026-07-12 (deployment readiness)

- Backend repo: `v2/dev` fast-forward-merged into `main` (91638ce) — main
  now carries ALL security work (JWT boundary, tenancy, quotas, migrations,
  pruned deps) and `render.yaml` (migrate-on-start, health check, env
  contract, py3.12, Frankfurt).
- V2/11-DEPLOYMENT.md: the go-live runbook. Owner does 2 clicks + env var
  pastes (steps in the doc); then agent reverts shutdown sign-in
  (858717f), updates lib/llm-backend.ts default URL, verifies end-to-end.
- Shutdown page on prod is INTENTIONAL until the backend is live — it is
  currently accurate.
- Next feature work when deployment lands: F1 named branches + compare +
  promote (first paying feature).
