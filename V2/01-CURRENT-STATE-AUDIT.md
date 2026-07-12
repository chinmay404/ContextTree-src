# V2 — Current State Audit (V1 as of 2026-07-12)

Everything in this document was verified against the code on 2026-07-12.
This is the honest baseline the V2 plan is built on. Repos have been
**dormant since 2026-04-30**.

---

## 1. What V1 actually is

- `ContextTree/` — FastAPI + LangGraph backend. Postgres (Supabase) +
  pgvector. Sync graph (PostgresSaver) + separate async graph
  (AsyncPostgresSaver) for SSE streaming. Six-provider LLM dispatcher
  (Groq, Gemini, OpenAI, Anthropic, NVIDIA, LiteLLM) with BYOK and
  reasoning-model kwarg stripping. LangSmith tracing wired in.
- `ContextTree-src/` — Next.js 16 / React 19 / Tailwind v4 /
  @xyflow/react canvas. NextAuth v4 (Google OAuth only) with a
  hand-written pg adapter. Stripe billing routes exist
  (`checkout/portal/price/status/webhooks`). Pricing page, waitlist,
  user-limit gating exist.
- Core memory model (per node): working memory (last-K), episodic
  (`nodes.summary` + watermark `summarized_up_to_position`), semantic
  (`nodes.data.memoryFacts`), retrieved (ancestry-scoped pgvector
  similarity + file chunks). Fork is lazy, transactional, guarded by an
  advisory lock. This part is genuinely good engineering.

## 2. Security / multi-user blockers (highest severity)

| # | Problem | Evidence | Consequence |
|---|---------|----------|-------------|
| S1 | **Backend trusts client-supplied `user_id`.** FastAPI reads `chat_message.user_id` straight from the request body; the Next.js proxy injects it, but the FastAPI port itself will accept ANY user_id from anyone who can reach it. | `chat.py` `_user_key()`, `request.state.user_id = chat_message.user_id` | Full cross-tenant read/write: anyone can chat as any user, read any thread summary, burn any user's BYOK keys. **The #1 thing V2 must fix.** |
| S2 | **Rate limiting is keyed on that same spoofable user_id** and is in-process (SlowAPI) — resets per worker, per restart. | `chat.py:104-116` | Quota bypass; meaningless under multiple uvicorn workers. |
| S3 | **Identity is an email string**, propagated everywhere (`user_email` columns, `user_id=email` in traces). Emails change; they also leak into logs/LangSmith metadata. | schema: `canvases.user_email`, `messages.user_email`; LangSmith traces contain raw email | Painful migrations later; PII sprayed across telemetry. |
| S4 | No server-side authorization on canvas ownership in the FastAPI layer at all — tenancy checks live only in Next.js route handlers. | fork/files endpoints take `user_id` as path/body params | Same as S1. |
| S5 | BYOK keys encrypted with a single `BYOK_ENCRYPTION_SECRET`; no rotation story; keys decrypted in the same process that logs request payloads. | `helpers/byok.py`, `core/config.py` | One leaked env var = all user keys. Acceptable for beta IF logging is scrubbed + secret is rotated on incident; document it. |

## 3. Architecture problems

| # | Problem | Evidence | Consequence |
|---|---------|----------|-------------|
| A1 | **Two backends write the same database with different auth models.** Next.js route handlers (`pg`, raw SQL) own canvases/nodes/edges CRUD + auth tables; FastAPI (psycopg2 pool + psycopg3 pool) owns messages/threads/checkpoints. | `ContextTree-src/lib/mongodb.ts` (misnamed — it is the Postgres layer), `ContextTree/app/agent/store/PostgresStore.py` | No single source of truth for tenancy rules; three separate connection pools against one PgBouncer. |
| A2 | **Dual-write divergence**: canvas stored BOTH as JSONB blob (`canvases.data`) and normalized rows (`nodes`, `edges`, `messages`). Writes are not transactional across the two. | handover §"Dual-write divergence", `app/api/canvases/` | Stale/contradictory state; the bug class users describe as "my branch disappeared". |
| A3 | Frontend keeps a **localStorage fallback** for messages alongside server truth. | `lib/storage.ts` | Ghost messages after login on another device; sync bugs. |
| A4 | LangGraph **checkpoints table grows unboundedly**; no TTL/pruning. | saver.py; no pruning job anywhere | Supabase disk creep; slow checkpointer over time. |
| A5 | Graph is a **process-global singleton** initialized at import; retried on demand. Fine for one worker, not for serverless/multi-worker planning. | `chat.py:32-100` | Deployment shape constraint that must be a conscious V2 decision. |
| A6 | `mongo_store` name refers to a `PostgresConversationStore` everywhere; dead `MongoStore.py` (384 lines) and `quadrant_store.py` still in tree; `mongodb` + `@next-auth/mongodb-adapter` still in package.json. | store/, package.json | Onboarding confusion; the handover itself got auth wrong (said "Supabase Auth"; reality: NextAuth v4 + Google + hand-written pg adapter). |
| A7 | **Embedding dimension conflict is only half-resolved**: backend standardized on 768 (Gemini, `_shape_embedding` pads/trims), `scripts/migrate_vectors.py` migrates to 768, but the frontend `api-integration-spec.md` still specifies `context_chunks vector(1536)`. | embeddings.py vs api-integration-spec.md | If the spec is followed for file RAG, inserts fail or cosine math is garbage. |
| A8 | Auth adapter **creates tables at runtime** (idempotent DDL on first query). No migration system exists; there are two contradictory migration philosophies (`migrate_vectors.py` in-place ALTER vs `2026_04_26_context_tree_core.sql` full TRUNCATE reset). | `lib/auth.ts`, `scripts/` | Schema drift between environments is guaranteed. |

## 4. Product-surface problems

| # | Problem | Evidence |
|---|---------|----------|
| P1 | **5 landing pages** (`landing-page.tsx`, `-new`, `-old-backup`, `-v1`, `-v2`) and **4 canvas implementations** (`canvas-area`, `-enhanced`, `-reactflow`, `-smooth`) coexist; unclear which is wired. | components/ |
| P2 | Feature sprawl with no owner: simulation-panel, version-history-panel, global-search, reports API, admin page, node-showcase, 3D landing effects (`three`, `LiquidEther`), AOS animations. Most are half-wired. | components/, app/api/reports |
| P3 | File RAG is half-built: upload/ingest endpoints + chunking exist; chunk population "depends on external API or background job" per spec; no retry UX; A7 dimension conflict. | api-integration-spec.md, files endpoints |
| P4 | No post-creation model switching on a node (known since handover). | handover §5 |
| P5 | No export of any kind (markdown, JSON, share link). | — |
| P6 | No import from ChatGPT/Claude — the single biggest switching-cost reducer for the target audience. | — |
| P7 | Onboarding: new user lands on an empty canvas with no guidance; `onboarding-guide.tsx` exists but the flow was never finished. | components/onboarding-guide.tsx |
| P8 | package.json still named `my-v0-project`; duplicate reactflow dep (`@xyflow/react` + `reactflow` alias). | package.json |

## 5. Quality / operations

- **Tests**: only `tests/test_postgres_store.py` + `test_store_fuzzy.py`
  (store layer). Zero tests for: chat endpoints, fork init, get_llm
  routing, tenancy isolation, Stripe webhooks, SSE streaming. The most
  important missing test in the whole repo: *"user A cannot read user
  B's data."*
- **Observability**: LangSmith traces exist (good); no error tracker
  (Sentry), no structured request logging with user/request IDs, no
  uptime monitoring, no cost-per-user accounting.
- **Async pool** opens lazily (`open=False`) — known ~50ms first-request
  penalty; no FastAPI lifespan hook.
- **Ops hygiene**: `.env` committed locally with real keys; `CONTEXTTREEAPI.pem`
  (an EC2 key pair) sitting in the repo root; `app.log`, `res.json`,
  scratch scripts (`test.py`, `check_*.py`) in the tree; a real LangSmith
  dataset export with the developer's personal email in the repo root.
- **Backups**: nothing beyond whatever Supabase's plan does by default;
  no restore runbook.

## 6. What is genuinely worth keeping (do NOT rewrite)

1. The **memory model** (4 layers + watermark + lazy transactional fork
   with advisory lock). This is the product's core IP and it is correct.
2. `ancestor_ids` materialized ancestry + GIN index — right call.
3. The **6-provider `get_llm()` dispatcher** with BYOK and
   reasoning-model kwarg handling.
4. SSE streaming path end-to-end (fixed in April; passes tokens through
   the Next proxy without buffering).
5. Stripe route scaffolding and the advanced-settings normalization
   layer (`lib/advanced-settings.ts`) — both reusable as-is.
6. `@xyflow/react` v12 as the canvas engine (pick ONE of the 4 variants).

---

*Next docs: 02-MARKET-RESEARCH.md (evidence), 03-PRODUCT-DECISION.md
(what V2 is and is not), 04-REDESIGN-SPEC.md, 05-ARCHITECTURE-V2.md,
06-CUT-LIST.md, 07-30-DAY-PLAN.md.*
