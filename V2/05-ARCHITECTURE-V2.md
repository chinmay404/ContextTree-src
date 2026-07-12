# V2 — Architecture (technical target state)

Fixes every S/A item from `01-CURRENT-STATE-AUDIT.md`. Rule of thumb for
the 30 days: **refactor the trust boundary and the data ownership; do NOT
rewrite the engine** (memory model, fork transaction, dispatcher stay).

---

## 1. Service topology (decided)

```
Browser ──► Next.js (Vercel)          ──► FastAPI (Railway/Render, 1 service, 2 workers)
            owns: auth (NextAuth),         owns: ALL conversation data:
            billing (Stripe), landing,     nodes, messages, codex cards,
            static, thin API proxy         summaries, embeddings, checkpoints,
                                           quotas, LLM dispatch
                     └────────► Supabase Postgres + pgvector (one DB, one owner of each table)
```

- **Single-writer rule (fixes A1/A2):** FastAPI is the only process that
  writes conversation tables. Next.js keeps writing ONLY `users/accounts/
  sessions` (NextAuth) and billing state. The Next.js canvas CRUD routes
  (`app/api/canvases/*`, `lib/mongodb.ts` raw SQL) are deleted; the studio
  calls FastAPI through one thin authenticated proxy route.
- Graph singleton + 2 uvicorn workers is fine at beta scale (A5
  acknowledged, not fought). Not serverless — SSE + connection pools want
  a long-lived process.

## 2. The trust boundary (fixes S1–S4 — week-1, non-negotiable)

1. Next.js proxy mints a short-lived JWT per request:
   `HS256(shared secret BACKEND_JWT_SECRET, {sub: user_uuid, exp: now+60s})`.
2. FastAPI middleware verifies it and sets `request.state.user_id` from
   the **token**, never from the body. `ChatMessage.user_id` field:
   deleted from the schema. Every store method already takes `user_id` —
   the call sites switch to the verified value.
3. FastAPI binds to the private network / rejects requests without a valid
   token, so the port is dead to the public internet.
4. **Identity = `users.id` UUID** (fixes S3). Migration backfills UUIDs,
   rewrites `user_email` columns to `user_id uuid` FKs, and LangSmith
   metadata switches to the UUID (emails leave telemetry).
5. Rate limits + daily quotas move to Postgres token buckets keyed on the
   verified UUID (fixes S2): `quotas(user_id, window, tokens_used,
   msg_count)` updated in the same transaction as message persistence.
   Free-tier server-key cap (20 msg/day) enforced HERE, not in the UI.
6. BYOK (S5, accepted risk, contained): keys stay AES-encrypted with
   `BYOK_ENCRYPTION_SECRET`; add: never log request bodies on key paths,
   scrub `Authorization`/key fields in the logger, document rotation
   runbook. Per-user KMS is post-revenue.

## 3. Schema v2 (delta from audit §2 schema)

```sql
users(id uuid PK, email unique, created_at, plan text default 'free',
      license_kind text null)                  -- 'founding' | 'standard'
canvases(id, user_id uuid FK, title, layout jsonb, version int,  -- layout ONLY
         created_at, updated_at)
nodes(... as V1 ... , user_id uuid, name text,          -- branch name (F1)
      status text default 'active')                     -- 'active'|'collapsed'
messages(... as V1 ..., user_id uuid,
         model text, prompt_tokens int, completion_tokens int,
         cost_usd numeric(10,6))                        -- cost meter (F4)
context_cards(id, canvas_id FK, user_id uuid, title, body, kind text,
              embedding vector(768), updated_at)        -- Codex (F2)
node_cards(node_id FK, card_id FK, PRIMARY KEY(node_id, card_id))
quotas(user_id, day date, msg_count int, server_key_msgs int,
       PRIMARY KEY(user_id, day))
purchases(id, user_id, stripe_session, kind, amount, created_at)
```

- `canvases.data` JSONB blob → renamed `layout`, content keys stripped
  (fixes A2): positions, viewport, collapsed-state. Everything else reads
  from normalized tables. `canvases.version` int gives optimistic
  concurrency for multi-tab (spec §10).
- ALL vector columns `vector(768)` — the frontend `api-integration-spec.md`
  1536 figure is dead (fixes A7); that spec file gets a deprecation header.
- `external_files`/`file_chunks` tables stay but are dormant (feature
  flag `FILES_ENABLED=false`) — no code deleted below the endpoint layer.

## 4. Migrations (fixes A8)

`db/migrations/NNN_*.sql`, applied by a 40-line runner
(`scripts/migrate.py`: advisory lock, `schema_migrations` table, forward
only) run on deploy. Runtime DDL is removed: the NextAuth adapter's
auto-CREATE moves into migration 001; `PostgresStore` setup DDL likewise.
Baseline = current prod schema; then: 002 uuid identity backfill,
003 v2 columns (names/status/costs), 004 codex tables, 005 quotas/purchases,
006 layout-blob strip. Each with a tested `--dry-run` output kept in the PR.

## 5. Runtime hygiene

- **Pools:** ONE psycopg3 pool (drop psycopg2; port
  `PostgresConversationStore`'s ~15 query call sites — mechanical),
  opened in a FastAPI `lifespan` hook (fixes the lazy-open latency, audit §5);
  PgBouncer-compatible settings (no server-side prepared statements).
- **Naming:** `mongo_store` → `store` everywhere; delete `MongoStore.py`,
  `quadrant_store.py`; frontend `lib/mongodb.ts` dies with the CRUD routes;
  drop `mongodb`, `@next-auth/mongodb-adapter`, `reactflow` alias, `three`,
  `aos` from package.json; rename package `context-tree-studio`.
- **Checkpoint pruning (A4):** nightly job (cron on the backend host):
  delete LangGraph checkpoints older than 30 days except each thread's
  latest; verified restore from `messages`+`summary` hydration already
  exists (that's how cold-start works).
- **Repo hygiene:** rotate every secret currently in `ContextTree/.env`;
  remove `.env`, `CONTEXTTREEAPI.pem`, `app.log`, `res.json`, dataset
  JSONL, scratch scripts from the tree; tighten `.gitignore`. (The .pem
  and .env have been committed on disk — treat all of it as leaked and
  rotate regardless.)

## 6. Observability & ops

- Sentry (both apps) + structured JSON logs with `request_id`/`user_id`
  (UUID). LangSmith stays for traces.
- Cost accounting = `messages.cost_usd` (F4 makes the business metric a
  product feature; one query answers "what does a free user cost me").
- Uptime: healthcheck ping (UptimeRobot free) on `/api/v1/health` and the
  Vercel deployment.
- Backups: Supabase PITR if plan allows, else nightly `pg_dump` from the
  backend host to Backblaze B2; restore runbook written and **rehearsed
  once** before launch.
- Deploy: GitHub Actions → Vercel (frontend) + Railway/Render (backend),
  migrations step before app start; single region co-located with the
  Supabase project.

## 7. Test plan (fixes the audit's quality hole — minimum bar, not aspiration)

| Suite | Cases that must exist before beta |
|---|---|
| **Tenancy (the launch blocker)** | user A cannot read/write B's canvas, node, messages, codex, summary — direct FastAPI calls with forged/absent/expired JWT and cross-tenant IDs. |
| Fork engine | first-message init, concurrent double-send race (advisory lock), regenerate-last-user, fork from user vs AI message. |
| Dispatcher | model-string → provider routing table test for all 6; reasoning-kwarg stripping; BYOK key selection; fallback-on-provider-error. |
| Quota | free-tier cap enforcement at the API (not UI); bucket resets. |
| Billing | Stripe webhook: signature check, idempotent replay, plan flip. |
| SSE | stream completes; client abort cancels upstream LLM call; partial-save on failure. |
| E2E smoke (Playwright) | signup → template canvas → 3 messages → branch → compare → compile-export. Runs in CI on every deploy. |

## 8. Explicit non-goals for these 30 days

Teams/collaboration, mobile apps, local-first desktop build, per-user KMS,
PDF RAG, SOC2-anything, multi-region, serverless backend, GraphQL,
rewriting the frontend state layer to a framework (Zustand refactor only
if it falls out of the console split naturally). Every one of these is a
post-revenue conversation.
