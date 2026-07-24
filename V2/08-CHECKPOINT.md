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

---

## Checkpoint 008 (2026-07-12, evening) � Relaunch day

Prod fully live end-to-end: sign-in restored (shutdown page reverted),
FastAPI on Railway (api-production-310d.up.railway.app, NVIDIA NIM
default model kimi-k2-0905, Groq fallback), Vercel wired (LLM_API_URL,
BACKEND_JWT_SECRET, BYOK secret, DATABASE_URL on TRANSACTION pooler
:6543 - session pooler exhausted under lambda fan-out, EMAXCON; pg
pools capped max 3).

Studio redesign shipped same day (082342b..87ab8fa):
- REMOVE sweep: -26.6k lines, 13 dead surfaces gone
- Dark-first token system + chrome, theme toggle, no backdrop-blur
- Console split (1819->1249 + console/*): breadcrumb header, inline
  rename, model switcher, auto-named forks
- Canvas REBUILT from scratch (components/canvas/canvas.tsx ~700
  lines): always-auto-layout (dagre, multi-root forests), dark pane,
  lineage hues, non-editable edges, empty state, zoom-follows-select
- Typography system (5 tiers) + 61 icons normalized (16/14/18, 1.75)
- Competitor UX research: V2/12-UX-RESEARCH.md

Next: Step 5 ease-of-use (linear-first entry, Cmd+B fork, Cmd+K
actions), then F1 compare/promote. DB.txt still in workspace - rotate
all keys + delete after development.

---

## Checkpoint 009 (2026-07-12, late night) � Customer-ready build

Everything below verified live on contexttree.tech (all routes 200,
Railway backend healthy):

- Linear-first entry: branch-less canvases render as a centered chat;
  tree materializes at first fork (console never remounts, stream
  survives). View tree override per canvas. Cmd+B forks from the last
  message (IME/composer-safe).
- F1 shipped: shift-click 2-3 nodes -> Compare bar -> side-by-side
  modal (fork-scoped messages, scroll sync) -> Promote winner; losers
  collapse to recoverable pills (demoted:true via node PATCH, never
  deleted). Console header: Compare siblings entry.
- Dialogs redesigned: fork + create-canvas single-column (name ->
  recommended chips -> More models -> Advanced disclosure); the last
  white surface (advanced-settings-panel) dark-tokened.
- Trust surface: /privacy + /terms live (plain-language, marked for
  legal review pre-paid-launch), sitemap fixed, sign-in dark + linked.
- Fixes this session: node clicks (xyflow pointer-events with all
  interactivity flags false), hover-popup dead zone, dead Profile item.
- Marketing plan: V2/13-MARKETING-PLAN.md (3 messages, hero video shot
  list, 5 silent loops, image specs, HN->PH launch sequence, 5 metrics).

Remaining before charging money: Stripe checkout (billing dirs are
empty scaffolds), legal review of trust pages, demo canvas + video
assets per marketing plan, rotate ALL keys in DB.txt and delete it.

---

## Checkpoint 010 (2026-07-13, early) � Bug-bash from live user testing

Owner tested prod end-to-end; every finding root-caused and shipped:

- CRITICAL data loss: child-node delete wiped parent conversation
  (full-canvas PUT -> syncNodesToTables delete+reinsert of messages
  from hollow client copies). Server now refuses empty message
  replacement on any save path; node delete is per-node DELETE.
  NOTE: conversations wiped before the fix are unrecoverable unless
  Supabase PITR is enabled.
- NIM catalog rotation (July 2026): kimi ids 404 despite listing;
  default now z-ai/glm-5.2 (verified), old ids aliased. Chat verified
  replying on prod.
- Token streaming: async checkpoint pool was never opened -> silent
  sync fallback. ensure_async_pool_open() awaited before streams.
- UX batch: dragging restored (+Tidy, positions persist via layout
  PATCH), stripe/handle polish (handles now fully invisible), active
  node glow + lit ancestor path, live Claude-style thinking block
  (auto-collapses), model chip on messages + console/canvas model
  sync, from-parent meta, premium Founding lock on advanced controls,
  sidebar flicker fix, canvas deletion wins over autosave, empty-state
  as bottom hint, light theme unified (same violet accent), slim
  scrollbars, BrandLoader (6 tree-mark animations) placed across all
  loading states.

Verified live: deploy READY, contexttree.tech 200, Railway 200.
Open: fork buffer verification after healthy chats, Stripe, legal
review, demo assets, rotate DB.txt keys.

---

## Checkpoint 011 (2026-07-13) � Context inheritance + admin + marketing kit

- CORE FIX: fork context inheritance. Model-404-era chats never persisted
  (stream returned before save), so forks inherited nothing and were
  stamped is_initialized=true forever. Now: empty inheritance never
  stamps; summary-less branches self-heal on next message (summary-only
  seeding, full-scope resummarize forced). Deployed to Railway, healthy.
- Admin: chinmaypisal1718@gmail.com hardcoded; more via
  NEXT_PUBLIC_ADMIN_EMAILS (comma-separated Vercel env). /admin login
  loop fixed: middleware checked JWT token but sessions are strategy
  database -> token always null -> infinite bounce. Middleware now
  accepts the session cookie; /privacy + /terms made public.
- Canvas: back to auto-align only (owner decision), Tidy removed.
- Marketing kit committed (V2/marketing/): Show HN, PH listing, X
  thread, blog postmortem, video scripts + demo canvas recipe.

## Checkpoint 009 — 2026-07-17 (fork-inheritance root cause; test suite)

### Owner-reported bug: "fork a node, it knows nothing"

**Root cause (proven, not guessed):** production runs `origin/main`, but the
July-13 fix pass (`fix/2026-07-13-fix-pass`) was NEVER PUSHED in either repo.
Backend main inserts `messages.position = NULL`; every context read filters
`position > watermark` and `NULL > 0` is never true in SQL → fork inheritance
reads the parent as empty, working-memory hydration sees nothing, the
watermark never advances. Fix already exists locally: commit `13c707e`
(monotonic positions on insert) + migration `004_message_positions.sql`
(backfills NULL rows). Migration 004 has NOT been applied to prod.

**Proof:** new suite `tests/test_fork_inheritance.py` (14 cases, store +
chat layers, runs on TEST_DATABASE_URL Docker PG, no LLM/API calls).
On `fix/2026-07-13-fix-pass`: 14/14 pass (full suite 39/39).
On `main` with a prod-like DB (migrations 001-003 only): the position/
hydration cases fail exactly as prod behaves. Committed `11a1402`.

### Go-live steps for the fix (owner)
1. Backend: merge `fix/2026-07-13-fix-pass` → `main`, push. Frontend: same
   (7 UI commits, includes entitlement + layout fixes).
2. Apply migration 004 to prod BEFORE/with deploy (`migrate.py`; render.yaml
   runs migrate-on-start, so a deploy after merge covers it — the migration
   file's header documents the ordering).
3. Old canvases self-heal: positions backfill + the fork re-init path
   re-runs inheritance for blank forks on their next message.

### Also flagged
- Admin panel: V1 leftover (7 count tiles + role list; Usage/Billing/Flags
  are decorative). V2 cut it deliberately (06-CUT-LIST). Owner now wants a
  real founder console — reversal accepted; data already in DB: quotas,
  bug_reports (service methods exist, no UI), user_api_keys, waitlist.
- DB.txt with plaintext prod creds STILL in workspace root (3rd reminder).
- Structural (unchanged plan): dual-writer on conversation tables remains
  the systemic risk; single-writer (Day 6) stays the post-launch cure.

## Checkpoint 013 — 2026-07-17 (afternoon: aftershocks + features)

Table-truth flip aftershocks (fixed + deployed):
- Messages "vanished": getCanvas filtered on canvas_id which backend rows
  never carry → load by node_id + ORDER BY position (6b95e93); upserts heal
  canvas_id/user_email.
- Fork buffer copies rendered as visible history → hidden via the backend's
  own rule (branch rows older than the branch = context, not conversation)
  (02fd6c0).
Features shipped:
- Thinking: backend re-frames out-of-band reasoning (reasoning_content /
  Gemini thought parts) as inline <think> (d49dae7); UI = shimmer
  "Thinking…" with tail-follow clamp → collapses to "Thought for Ns"
  (3b67f58).
- Web search visibility: SSE preamble with sources (e45dcf7) → "Searched
  the web · N sources" chips, expandable links (session-only metadata).
- External context attach/detach (a092916 + 74e26e2): paperclip upload
  (PDF/TXT/MD/DOC/DOCX allowlist at picker/drop/route/ingester, 10MB) →
  externalContext node + AUTO-EDGE to current chat node; chip row above
  composer (× disconnect, + Context reconnect). Audit finding: file RAG was
  fully built but unreachable — no UI could create the gating edge.
Known rough edges: no retry for stuck "Processing…" (old retry route is
dead code, sends no auth); chips lag on refetch; web-source chips not
persisted. PARKED: feat/branch-colors (color picker + depth fade, WIP
stashed on branch).

## Checkpoint 014 — 2026-07-18 (PDF upload broken in prod: jsonb/bytea)

- Every file upload failed with "unsupported jsonb version number 37":
  backend 001_baseline.sql created external_files.data as jsonb; 006's
  ADD COLUMN IF NOT EXISTS data bytea silently no-opped. Upload route
  passes a Buffer → node-pg sends binary format → jsonb_recv reads
  '%' of %PDF (0x25 = 37) as the version byte. Verified against prod
  (information_schema: data=jsonb, table empty — nothing to lose).
- Fix shipped (backend f07267d): 007_external_files_data_bytea.sql
  converts jsonb→bytea (guarded, USING NULL); 001 corrected for fresh
  DBs. Applies on Railway boot. VERIFY: re-upload a PDF after deploy.
- User-feedback queue (real users, not yet started): (1) branch-from-
  user-msg vs branch-from-AI-msg mental model unclear; (2) web-search
  toggle resets, must persist; (3) connect/disconnect of nodes on
  canvas must be easier/discoverable.

## Checkpoint 015 — 2026-07-18 (user-feedback batch: UX clarity + limits)

All four real-user complaints shipped in one pass:
- Sticky web search: toggle persists via localStorage
  (context-tree-web-search), hydrated after mount (no SSR mismatch).
- Branch mental model: role-aware everything — message-row button reads
  "Re-ask" (user msg) vs "Branch" (AI msg); ForkDialog shows the quoted
  source message + a one-line explanation of what the branch inherits;
  CTA matches ("Re-ask in branch" / "Create branch").
- Canvas connect/disconnect: chat nodes expose a source dot (hover),
  context cards a target dot; drag either direction — onConnect
  normalizes to chat→context with meta.condition "Context", rejects
  chat↔chat (lineage stays system-managed). Context edges render dashed
  + clickable (interactionWidth 16) → click disconnects via per-edge
  DELETE. Lineage edges stay inert. ConnectionMode.Loose +
  connectionRadius 40 for forgiving drops. Per-edge POST/DELETE only —
  no whole-canvas saves (dual-write lesson).
- Node cap: MAX_NODES_PER_CANVAS = 50 (lib/limits.ts), enforced 409 in
  nodes POST (upserts exempt) + preflights in createFork,
  uploadContextFile (console), uploadFile (canvas drop).
Verified: tsc — the only error in touched files exists on baseline too
(pre-existing implicit-any); full next build blocked only by sandboxed
Google Fonts fetch, builds on Vercel.
DEPLOY WATCH: backend f07267d (jsonb→bytea migration 007) pushed but
Railway had NOT deployed it 20+ min later — old process still serving.
If uploads still fail: Railway dashboard → deploys for commit f07267d.

### 015 addendum — 007 applied manually (2026-07-18, ~13:4x)

Railway never auto-deployed f07267d (35+ min). Applied migration 007 by
running scripts/migrate.py locally against prod: external_files.data is
now bytea, schema_migrations records 007. Upload verified unblocked at
the DB layer. When Railway eventually deploys, migrate.py no-ops (007
already recorded). OPEN: Railway GitHub auto-deploy is broken — next
backend change hits the same wall; fix trigger in dashboard or provide
RAILWAY_API_TOKEN.

## Checkpoint 016 — 2026-07-18 (fork-destroying edge-write race)

Prod bug report (screenshots): branch rendered as bare "Context" card,
first branch reply had no inherited context, messages answer-before-
question, node systemPrompt ignored. ONE root cause for all four:
- createFork fired node POST + edge POST concurrently; addEdge routed
  the edge through updateCanvas (full-canvas rewrite from a snapshot);
  syncNodesToTables DELETED node rows missing from that stale snapshot
  — cascading the fresh branch's messages + fork seed. The Python
  backend then recreated the row bare (no type/name/systemPrompt in
  data) → typeless "Context" card, clueless first reply (seed gone,
  repaired on 2nd msg), user msgs re-upserted at max(position)+1 →
  misorder, systemPrompt unrecoverable.
Fixes (3bc60da + follow-up):
- addEdge/removeEdge/updateEdge → scoped jsonb writes on
  canvases.data->edges + edges-table mirror; never touch node rows;
  dedupe by _id.
- syncNodesToTables: node delete-loop REMOVED (removeNode is the only
  delete path).
- getCanvas: bare rows synthesize type/parentNodeId from lineage
  columns → already-broken canvases repair at read time.
- createFork: edge POST strictly after node POST settles.
- Upload file nodes get name=filename; card/chip labels fall back to
  data.label; context cards show a green "linked" badge when connected
  to the selected chat node (issue 5 clarity).
- ensureInit adds messages.position; pool skips SSL for localhost.
Verified: scripts/verify-edge-scoped.ts — 18/18 checks on Docker pg
(scoped writes, stale-save survival, dedupe, bare-row hydration).
Deployed: Vercel Production Ready.
LESSON (vault): diff-based sync deletes convert every stale read into
data loss — "Dual-write full-canvas saves destroy data" recurred via a
new entry point (edge POSTs). Scoped writes or no deletes, ever.

## Checkpoint 017 — 2026-07-24 (branch colors shipped; date correction)

NOTE: Checkpoint 016 above is mis-dated — it happened TODAY, 2026-07-24
(same session, stale date carried from context). 016's fixes and this
entry are both live in the 2026-07-24 deploys.

Per-branch colors with depth fade (owner: "Each Child we can Decide
Colour ... as we go down that colour will start to get faint"):
- lib/branch-palette.ts: 8 hues tuned for the dark canvas.
- chat-node hover bar: Palette button → inline swatch row; pinned color
  shows as a dot; X clears back to inherited.
- effectiveColorOf (canvas.tsx): nearest ancestor-or-self pinned color
  wins; fades 14%/level below the source, floor 38%; no pin → lineage
  hash hue faded by depth. Node stripes, lineage edges (child's hue on
  its incoming edge), demoted pills, context cards all follow it.
- Persisted via existing node PATCH {color} (optimistic + toast on
  failure); NodeData.color typed in lib/storage.ts.
Ported from feat/branch-colors stash (wip-branch-colors) onto main —
the stash branch predates the edge-race fixes; do NOT merge it now.
Commit 67f3abd; Vercel Production Ready.
Railway: nothing to deploy — backend main == origin/main == f07267d,
already live (webSearch fingerprint + health 200 verified today); a
redeploy would only restart streams for zero delta.

## Checkpoint 018 — 2026-07-24 (edge-vanish fix; webpage parser; concurrent-session protocol)

Prod report: fresh fork rendered side-by-side with its parent, no edge
(dagre saw two roots). Lineage data intact (parentNodeId survived) — the
EDGE was erased. Root cause class: canvases.data is a shared JSON blob
with multiple read-modify-write writers (updateNodeMessages patch,
addNode embedded push, updateCanvas); any of them landing after addEdge
lost the edge (lost-update race; my 016 sequencing change widened the
window). Fixes (frontend e929150):
- getCanvas: edges hydrate from the edges TABLE (authoritative; addEdge
  mirrors, only removeEdge deletes); legacy JSON-only edges merged in.
- syncNodesToTables edge sync: upsert-only (absence ≠ deletion).
- updateNodeMessages: embedded-JSON blob patch REMOVED.
- addNode: embedded append is one atomic jsonb_set statement.
- canvas.tsx: missing parent→child edges SYNTHESIZED from parentNodeId
  — a fork can never render as a disconnected root again (also repairs
  the user's broken canvas at render time).
- createFork: optimistic console state carries the edge.
verify-edge-scoped.ts → 23 checks, all pass.

Webpage parser (backend 4794cc6, owner request "secure + don't overload
context"): pasted http(s) URLs (max 2/turn) fetched into
<EXTERNAL_CONTEXT> as [page N | title | url]; SSRF guard (public-unicast
only, every redirect hop re-validated, metadata IP blocked), 2MB stream
cap, 3500 chars/page, never blocks the turn, WEB_FETCH_ENABLED kill
switch, joins web_hits so source chips show pages. 32 unit tests (fake
httpx, no network).

CONCURRENT SESSION NOTE: another chat is mid-feature on message
canonical identity + inherited flag (untracked migration 008, modified
PostgresStore.py, mongodb.ts, contextual-console.tsx — all UNCOMMITTED).
Full backend suite fails against that moving tree (their 008 moves
buffer rows to negative positions; pre-008 tests assert [1,2]) — NOT a
regression of this session's work. I committed ONLY my hunks (verified
via git diff) and deployed Railway from a CLEAN WORKTREE at 4794cc6 so
none of their WIP shipped. Their session owns updating the fork tests.
